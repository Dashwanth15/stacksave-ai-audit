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
  },
  { 
    timestamps: false,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

export const AuditModel = mongoose.model<AuditDocument>('Audit', AuditSchema);

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
}

const NotificationEventSchema = new Schema<NotificationEventDocument>(
  {
    providerId:   { type: String, required: true, index: true },
    providerName: { type: String },
    eventType:    { type: String, default: 'NEW_OFFER' },
    type:         { type: String },                        // Legacy field — kept for backward compat
    fingerprint:  { type: String, required: true, unique: true, index: true },
    title:        { type: String, required: true },
    description:  { type: String, required: true },
    sourceUrl:    { type: String, required: true },
    detectedAt:   { type: Date, required: true, default: Date.now },
    notifiedAt:   { type: Date },
    expiresAt:    { type: Date },
    discount:     { type: String },
    discountType: { type: String },
  },
  { timestamps: false }
);

export const NotificationEventModel = mongoose.model<NotificationEventDocument>(
  'NotificationEvent',
  NotificationEventSchema
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
