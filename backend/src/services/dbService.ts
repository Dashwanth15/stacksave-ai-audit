// ============================================================
// MongoDB Service — StackSave AI Audit
// ============================================================

import mongoose, { Schema, Document } from 'mongoose';
import dns from 'dns';
import { PricingSnapshot } from '../types';

dns.setDefaultResultOrder('ipv4first');

export function getFrontendUrl(): string {
  let url = 'https://stacksaveai.com';
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    const envUrl = process.env.FRONTEND_URL;
    if (envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      url = envUrl;
    } else {
      url = 'http://localhost:5173';
    }
  } else if (process.env.FRONTEND_URL) {
    url = process.env.FRONTEND_URL;
  }
  return url.replace(/\/+$/, '');
}

// ── Audit Schema ─────────────────────────────────────────────
// Batch 1: Extended for persistent audit storage + pricing snapshots
// Batch 2: Added pricing change detection fields
export interface AuditDocument extends Document {
  auditId: string;
  createdAt: Date;
  updatedAt: Date;
  totalMonthlySpend: number;
  optimizedMonthlySpend: number;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  savingsPercentage: number;
  isAlreadyOptimal: boolean;
  isHighSavings: boolean;
  insights: object[];
  aiSummary: string;
  aiSummarySavings?: string;
  publicUrl: string;
  companyName?: string;
  teamSize: number;
  tools: object[];
  useCase?: string;
  optimizationGoal?: string;
  billingCycle?: string;         // 'monthly' | 'annual' — user's selected billing period
  
  // ── Batch 1: Persistence Fields ──────────────────────────
  // Input: tools array as submitted by user (for re-audit comparisons)
  inputStack: object[];
  
  // Pricing snapshot at time of audit (immutable, for later change detection)
  pricingSnapshot: PricingSnapshot;
  
  // User identification and contact
  email?: string;
  
  // Re-audit metadata (set in future Batch 2, but schema prepared now)
  reAuditOf?: string;           // If this is re-audit, points to original audit ID
  isLatestVersion?: boolean;    // Marks which version is "current" (default true)
  auditVersion?: number;        // Increments on each re-audit (default 1)
  
  // ── Batch 2: Pricing Change Detection Fields ──────────────
  // Whether any pricing has changed since this audit was created
  pricingChanged?: boolean;
  
  // When we last checked for pricing changes
  lastPricingCheck?: Date;
  
  // Why this audit became outdated (e.g., "Cursor price increased $5/mo")
  outdatedReason?: string;

  // ── Batch 5: Duplicate Notification Protection Fields ──────
  lastNotificationSentAt?: Date;
  notificationVersion?: number;
  hasPendingNotification?: boolean;

  // ── Ownership token ──────────────────────────────────────
  // Random 32-byte hex string generated once at audit creation.
  // Returned to the creator in the POST response and stored in their
  // user-scoped localStorage. Required for owner-only operations
  // (re-audit, full private data retrieval).
  // NEVER included in public GET /api/audits/:id responses.
  ownerToken?: string;

  // ── User association & explicit save state ──────────────
  userId?: mongoose.Types.ObjectId | string;
  isSaved?: boolean;
}

const AuditSchema = new Schema<AuditDocument>(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    totalMonthlySpend: { type: Number, required: true },
    optimizedMonthlySpend: { type: Number, required: true },
    estimatedMonthlySavings: { type: Number, required: true },
    estimatedAnnualSavings: { type: Number, required: true },
    savingsPercentage: { type: Number, required: true },
    isAlreadyOptimal: { type: Boolean, default: false },
    isHighSavings: { type: Boolean, default: false },
    insights: { type: [Schema.Types.Mixed], default: [] },
    aiSummary: { type: String, default: '' },
    aiSummarySavings: { type: String, default: '' },
    publicUrl: { 
      type: String, 
      required: true,
      get: function(this: AuditDocument, v: string): string {
        const frontendUrl = getFrontendUrl();
        // Prefer the document's own auditId field (available on full Mongoose docs)
        const auditId =
          (this && this.auditId) ||
          // Fallback: extract ID from stored URL value (handles legacy localhost URLs)
          (v && typeof v === 'string' ? v.split('/').filter(Boolean).pop() : '') ||
          '';
        if (!auditId) return v || ''; // If we can't determine the ID, return stored value as-is
        return `${frontendUrl}/audit/${auditId}`;
      }
    },
    companyName: { type: String },
    teamSize: { type: Number, required: true },
    tools: { type: [Schema.Types.Mixed], default: [] },
    useCase: { type: String, default: 'mixed' },
    optimizationGoal: { type: String, default: 'balanced' },
    billingCycle: { type: String, default: 'monthly' }, // 'monthly' | 'annual'
    email: { type: String }, // captured at lead gate — private
    
    // ── Batch 1: Persistence Fields ──────────────────────────
    // User's submitted tools (immutable record of input)
    inputStack: { type: [Schema.Types.Mixed], default: [] },
    
    // Pricing snapshot (captured at audit time, used for change detection)
    pricingSnapshot: {
      capturedAt: { type: String },
      catalogVersion: { type: String },
      tools: { type: Schema.Types.Mixed, default: {} },
    },
    
    // Re-audit metadata
    reAuditOf: { type: String },     // Points to original audit if this is re-audit
    isLatestVersion: { type: Boolean, default: true }, // Mark "current" version
    auditVersion: { type: Number, default: 1 }, // Increments on re-audit
    
    // ── Batch 2: Pricing Change Detection Fields ──────────────
    // Whether any pricing has changed since this audit was created
    pricingChanged: { type: Boolean, default: false },
    
    // When we last checked for pricing changes
    lastPricingCheck: { type: Date },
    
    // Why this audit became outdated
    outdatedReason: { type: String },

    // ── Batch 5: Duplicate Notification Protection Fields ──────
    lastNotificationSentAt: { type: Date },
    notificationVersion: { type: Number },
    hasPendingNotification: { type: Boolean, default: false },

    // ── Ownership token ──────────────────────────────────────
    // Random hex string issued once at creation, never returned on public GETs.
    // Owner presents it via X-Audit-Token header for privileged operations.
    ownerToken: { type: String, select: false }, // select:false = excluded from all queries by default

    // ── StackSave User & Explicit Save State ──────────────────
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    isSaved: { type: Boolean, default: false, index: true },
  },
  { 
    timestamps: false,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

export const AuditModel = mongoose.model<AuditDocument>('Audit', AuditSchema);

// ── User Schema ──────────────────────────────────────────────
export interface UserDocument extends Document {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: 'FREE' | 'PREMIUM';
  subscriptionStatus: 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED';
  sessionVersion: number;
  lastLoginAt: Date;
  savedStack?: {
    name?: string;
    domain?: string;
    tools: object[];
    totalMonthlySpend: number;
    recommendation?: object;
    updatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    plan: { type: String, enum: ['FREE', 'PREMIUM'], default: 'FREE', index: true },
    subscriptionStatus: { 
      type: String, 
      enum: ['NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED'], 
      default: 'NONE' 
    },
    sessionVersion: { type: Number, default: 1, required: true },
    lastLoginAt: { type: Date, default: Date.now },
    savedStack: {
      name: { type: String },
      domain: { type: String },
      tools: { type: [Schema.Types.Mixed], default: [] },
      totalMonthlySpend: { type: Number, default: 0 },
      recommendation: { type: Schema.Types.Mixed },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { 
    timestamps: true 
  }
);

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);

// ── Audit Share Link Schema ──────────────────────────────────
// Tracks successfully created audit share links per user.
// Free limit: 5 share links. Premium: unlimited.
// Count-based tracking with NO 5-minute timer or expiration.
export interface AuditShareLinkDocument extends Document {
  userId: mongoose.Types.ObjectId | string;
  auditId: string;
  shareUrl: string;
  createdAt: Date;
}

const AuditShareLinkSchema = new Schema<AuditShareLinkDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    auditId: { type: String, required: true, index: true },
    shareUrl: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

AuditShareLinkSchema.index({ userId: 1, createdAt: -1 });

export const AuditShareLinkModel = mongoose.model<AuditShareLinkDocument>(
  'AuditShareLink',
  AuditShareLinkSchema
);

// ── Saved User Stack Schema ───────────────────────────────────
// Tracks individually saved AI stacks per user.
// Free limit: 3 saved stacks. Premium: unlimited.
// Count-based tracking, no expiration.
export interface SavedUserStackDocument extends Document {
  userId: mongoose.Types.ObjectId | string;
  name: string;
  domain: string;
  tools: object[];
  totalMonthlySpend: number;
  recommendation?: object;
  createdAt: Date;
  updatedAt: Date;
}

const SavedUserStackSchema = new Schema<SavedUserStackDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, default: 'My AI Stack' },
    domain: { type: String, default: 'general-productivity' },
    tools: { type: [Schema.Types.Mixed], default: [] },
    totalMonthlySpend: { type: Number, default: 0 },
    recommendation: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SavedUserStackSchema.index({ userId: 1, createdAt: -1 });

export const SavedUserStackModel = mongoose.model<SavedUserStackDocument>(
  'SavedUserStack',
  SavedUserStackSchema
);

// ── Lead Schema ───────────────────────────────────────────────
export interface LeadDocument extends Document {
  email: string;
  auditId: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  createdAt: Date;
  isHighSavings: boolean;
}

const LeadSchema = new Schema<LeadDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    auditId: { type: String, required: true },
    companyName: { type: String },
    role: { type: String },
    teamSize: { type: Number },
    createdAt: { type: Date, default: Date.now },
    isHighSavings: { type: Boolean, default: false },
  },
  { timestamps: false }
);

// Composite unique: same email can't submit twice for same audit
LeadSchema.index({ email: 1, auditId: 1 }, { unique: true });

export const LeadModel = mongoose.model<LeadDocument>('Lead', LeadSchema);

// ── Pricing Source Schema ─────────────────────────────────────
// Current verified state per provider. One record per provider, upserted on each sync.
export interface PricingSourceDocument extends Document {
  providerId: string;
  displayName: string;
  pricingUrl: string;
  strategy: string;           // ExtractionStrategy
  status: string;             // SyncStatus
  lastSyncedAt: Date;
  lastCheckedAt?: Date;
  lastSuccessfulCheckAt?: Date;
  lastVerifiedAt?: Date;      // Only set when status = 'VERIFIED'
  plans: object[];            // NormalizedPlan[]
  failureReason?: string;
  consecutiveFailures: number;
}

const PricingSourceSchema = new Schema<PricingSourceDocument>(
  {
    providerId:          { type: String, required: true, unique: true, index: true },
    displayName:         { type: String, required: true },
    pricingUrl:          { type: String, required: true },
    strategy:            { type: String, required: true },
    status:              { type: String, required: true, default: 'STALE' },
    lastSyncedAt:        { type: Date, required: true },
    lastCheckedAt:       { type: Date },
    lastSuccessfulCheckAt: { type: Date },
    lastVerifiedAt:      { type: Date },
    plans:               { type: [Schema.Types.Mixed], default: [] },
    failureReason:       { type: String },
    consecutiveFailures: { type: Number, default: 0 },
  },
  { timestamps: false }
);

export const PricingSourceModel = mongoose.model<PricingSourceDocument>(
  'PricingSource',
  PricingSourceSchema
);

// ── Pricing History Schema ─────────────────────────────────────
// Immutable append-only log of all confirmed price changes.
export interface PricingHistoryDocument extends Document {
  providerId: string;
  detectedAt: Date;
  previousPlans: object[];
  newPlans: object[];
  changeSummary: string;     // Human-readable diff
  isSuspicious: boolean;
  syncRunId: string;
}

const PricingHistorySchema = new Schema<PricingHistoryDocument>(
  {
    providerId:    { type: String, required: true, index: true },
    detectedAt:    { type: Date, required: true, default: Date.now },
    previousPlans: { type: [Schema.Types.Mixed], default: [] },
    newPlans:      { type: [Schema.Types.Mixed], default: [] },
    changeSummary: { type: String, required: true },
    isSuspicious:  { type: Boolean, default: false },
    syncRunId:     { type: String, required: true },
  },
  { timestamps: false }
);

export const PricingHistoryModel = mongoose.model<PricingHistoryDocument>(
  'PricingHistory',
  PricingHistorySchema
);

// ── Sync Log Schema ───────────────────────────────────────────
// One record per sync run (covers all providers in a batch).
export interface SyncLogDocument extends Document {
  syncRunId: string;
  startedAt: Date;
  completedAt?: Date;
  triggeredBy: string;       // 'github-actions' | 'manual' | 'api'
  providerResults: object[]; // Summary per provider
  totalProviders: number;
  successCount: number;
  failureCount: number;
  staleCount: number;
  priceChangeCount: number;
}

const SyncLogSchema = new Schema<SyncLogDocument>(
  {
    syncRunId:        { type: String, required: true, unique: true, index: true },
    startedAt:        { type: Date, required: true, default: Date.now },
    completedAt:      { type: Date },
    triggeredBy:      { type: String, required: true, default: 'api' },
    providerResults:  { type: [Schema.Types.Mixed], default: [] },
    totalProviders:   { type: Number, default: 0 },
    successCount:     { type: Number, default: 0 },
    failureCount:     { type: Number, default: 0 },
    staleCount:       { type: Number, default: 0 },
    priceChangeCount: { type: Number, default: 0 },
  },
  { timestamps: false }
);

export const SyncLogModel = mongoose.model<SyncLogDocument>('SyncLog', SyncLogSchema);

// ── Notification Event Schema ─────────────────────────────────
// Tracks offer/promotion notifications; fingerprint prevents duplicates.
export interface NotificationEventDocument extends Document {
  providerId: string;
  providerName?: string;     // Human-readable provider name
  eventType?: string;        // 'NEW_OFFER' | 'PROMOTION_NEW' | 'PROMOTION_UPDATED' | 'PROMOTION_EXPIRED'
  type?: string;             // Legacy alias for eventType
  fingerprint: string;       // SHA-256 of offer content — unique constraint prevents re-notification
  title: string;
  description: string;
  sourceUrl: string;
  detectedAt: Date;
  notifiedAt?: Date;
  expiresAt?: Date;
  discount?: string;         // Human-readable discount amount, e.g. "20% off" or "$5/mo"
  discountType?: string;     // 'percentage' | 'fixed' | 'trial' | 'free'
  evidenceText?: string;     // Exact snippet extracted directly from the live official page DOM
  detectionMethod?: string;  // Extraction method used (PLAYWRIGHT_DOM, JSON_LD, etc.)
  sourceStatus?: string;     // Status of source page when confirmed (VERIFIED)
  sourceFetchedAt?: Date;
  lastSuccessfulCheckAt?: Date;
  evidenceLocation?: string;
  contentHash?: string;
  extractorVersion?: string;
  // ── Offer Lifecycle Fields (added for active/expired tracking) ──
  isActive?: boolean;        // false = offer no longer detected on source page (expired/removed)
  lastConfirmedAt?: Date;    // Exact timestamp when this offer was last verified on live source page
  lastSeenAt?: Date;         // Alias/backward-compat for lastConfirmedAt
  consecutiveMisses?: number;// Count of consecutive verified scans where offer was absent
  isPublic?: boolean;         // False/absent records are quarantined from public API
  
  providerOfficialUrl?: string; // Official root/pricing URL of the underlying AI provider
  sourceDomain?: string;     // Root domain of the offer source (e.g. jio.com, airtel.in)
  // ── Partner AI Offer Specific Fields ─────────────────────────
  partner?: string;          // e.g. "Jio", "Airtel", "Samsung"
  partnerType?: string;      // e.g. "telecom", "devices", "broadband", "banking", etc.
  aiProvider?: string;       // e.g. "gemini", "perplexity", "claude", "chatgpt"
  aiPlan?: string;           // e.g. "Google AI Pro", "Perplexity Pro"
  offerType?: string;        // e.g. "TELECOM_BUNDLE", "DEVICE_BUNDLE", "FREE_SUBSCRIPTION"
  benefit?: string;          // e.g. "18 Months FREE"
  duration?: string;         // e.g. "18 months", "12 months"
  value?: string | number;   // e.g. "$360 value"
  eligibility?: string;      // e.g. "Eligible Jio 5G users"
  activationMethod?: string; // e.g. "MyJio App activation"
  country?: string;          // e.g. "IN", "US", "GLOBAL"
  region?: string;           // e.g. "India", "Global", "North America"
  startsAt?: Date;
  termsUrl?: string;
  sourceType?: string;       // 'official' | 'partner'
  status?: string;           // 'ACTIVE' | 'EXPIRED' | 'UPCOMING'
  isPartnerOffer?: boolean;  // Explicit flag: true for commercial partner bundles, false for native/student/startup offers
  lastCheckedAt?: Date;
  offerSubtype?: string;     // 'FREE_PLAN' | 'FREE_TRIAL' | 'PROMOTIONAL_FREE' | 'STUDENT_DISCOUNT' | 'ACADEMIC_FREE' | 'STARTUP_GRANT' | 'API_RATE_DISCOUNT' | 'API_CREDIT' | 'ANNUAL_DISCOUNT' | 'PARTNER_BUNDLE'
  category?: string;         // 'partner' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free'
  destinationUrl?: string;   // Exact destination URL validated by Playwright for frontend "View Offer" action
  monthlyEquivalent?: number;// Effective monthly cost when billed annually
  annualPrice?: number;      // Upfront annual billing cost
  annualSavingsPercent?: number; // Verified savings percentage vs monthly
  annualSavingsAmount?: number;  // Absolute dollar savings per year
}

const NotificationEventSchema = new Schema<NotificationEventDocument>(
  {
    providerId:      { type: String, required: true, index: true },
    providerName:    { type: String },
    eventType:       { type: String, default: 'NEW_OFFER' },
    type:            { type: String },                        // Legacy field — kept for backward compat
    fingerprint:     { type: String, required: true, unique: true, index: true },
    title:           { type: String, required: true },
    description:     { type: String, required: true },
    sourceUrl:       { type: String, required: true },
    sourceDomain:    { type: String, index: true },
    providerOfficialUrl: { type: String },
    evidenceText:    { type: String },
    detectionMethod: { type: String },
    sourceStatus:    { type: String },
    sourceFetchedAt: { type: Date },
    lastSuccessfulCheckAt: { type: Date },
    evidenceLocation: { type: String },
    contentHash:     { type: String },
    extractorVersion: { type: String },
    detectedAt:      { type: Date, required: true, default: Date.now },
    notifiedAt:      { type: Date },
    expiresAt:       { type: Date },
    discount:        { type: String },
    discountType:    { type: String },
    // ── Offer Lifecycle Fields ────────────────────────────────────
    isActive:          { type: Boolean, default: true },
    lastConfirmedAt:   { type: Date },
    lastSeenAt:        { type: Date },
    consecutiveMisses: { type: Number, default: 0 },
    isPublic:          { type: Boolean, default: false },

    // ── Partner AI Offer Specific Fields ─────────────────────────
    isPartnerOffer:    { type: Boolean, default: false },
    partner:           { type: String, index: true },
    partnerType:       { type: String },
    aiProvider:        { type: String, index: true },
    aiPlan:            { type: String },
    offerType:         { type: String },
    benefit:           { type: String },
    duration:          { type: String },
    value:             { type: Schema.Types.Mixed },
    eligibility:       { type: String },
    activationMethod:  { type: String },
    country:           { type: String },
    region:            { type: String },
    startsAt:          { type: Date },
    termsUrl:          { type: String },
    sourceType:        { type: String, default: 'official' },
    status:            { type: String, default: 'ACTIVE' },
    lastCheckedAt:     { type: Date },
    category:          { type: String, index: true },
    offerSubtype:      { type: String, index: true },
    destinationUrl:    { type: String },
    monthlyEquivalent: { type: Number },
    annualPrice:       { type: Number },
    annualSavingsPercent: { type: Number },
    annualSavingsAmount:  { type: Number },
  },
  { timestamps: false }
);

export const NotificationEventModel = mongoose.model<NotificationEventDocument>(
  'NotificationEvent',
  NotificationEventSchema
);

// ── Razorpay Subscription Schema ──────────────────────────────
// Authoritative record of user subscriptions with Razorpay Live mode.
export interface SubscriptionDocument extends Document {
  userId: mongoose.Types.ObjectId | string;
  provider: 'razorpay';
  razorpaySubscriptionId: string;
  razorpayPlanId: string;
  razorpayCustomerId?: string;
  planKey: 'quarterly' | 'yearly';
  status: 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired' | 'paused';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  chargeAt?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  lastPaymentId?: string;
  lastWebhookEventId?: string;
  lastSynchronizedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<SubscriptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['razorpay'], default: 'razorpay', required: true },
    razorpaySubscriptionId: { type: String, required: true, unique: true, index: true },
    razorpayPlanId: { type: String, required: true },
    razorpayCustomerId: { type: String },
    planKey: { type: String, enum: ['quarterly', 'yearly'], required: true },
    status: {
      type: String,
      enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired', 'paused'],
      default: 'created',
      index: true,
    },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date, index: true },
    chargeAt: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date },
    lastPaymentId: { type: String },
    lastWebhookEventId: { type: String },
    lastSynchronizedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, createdAt: -1 });

export const SubscriptionModel = mongoose.model<SubscriptionDocument>(
  'Subscription',
  SubscriptionSchema
);

// ── Webhook Event Schema (Durable Idempotency) ─────────────────
// Ensures each x-razorpay-event-id is processed exactly once.
export interface WebhookEventDocument extends Document {
  eventId: string;
  eventType: string;
  subscriptionId?: string;
  processedAt: Date;
  payloadSummary?: any;
}

const WebhookEventSchema = new Schema<WebhookEventDocument>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true },
    subscriptionId: { type: String, index: true },
    processedAt: { type: Date, default: Date.now },
    payloadSummary: { type: Schema.Types.Mixed },
  },
  { timestamps: false }
);

export const WebhookEventModel = mongoose.model<WebhookEventDocument>(
  'WebhookEvent',
  WebhookEventSchema
);


// ── Connection ────────────────────────────────────────────────
let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Retry up to 3 times with exponential back-off — critical for Render cold-start
  // where MongoDB Atlas may not be reachable immediately
  const MAX_RETRIES = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000, // 8s per attempt
        connectTimeoutMS: 10000,
        family: 4,
      });
      isConnected = true;
      console.log(`✅ MongoDB connected (attempt ${attempt})`);
      return;
    } catch (err) {
      lastErr = err;
      console.error(`❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`, err);
      if (attempt < MAX_RETRIES) {
        const waitMs = attempt * 2000; // 2s, 4s
        console.log(`   Retrying in ${waitMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }
  console.error('❌ MongoDB connection failed after all retries. Exiting.', lastErr);
  process.exit(1);
}
