// ============================================================
// MongoDB Service — StackSave AI Audit
// ============================================================

import mongoose, { Schema, Document } from 'mongoose';
import { PricingSnapshot } from '../types';

export function getFrontendUrl(): string {
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    const envUrl = process.env.FRONTEND_URL;
    if (envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return envUrl;
    }
    return 'http://localhost:5173';
  }
  return process.env.FRONTEND_URL || 'https://stacksave-round2-frontend.onrender.com';
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
  publicUrl: string;
  companyName?: string;
  teamSize: number;
  tools: object[];
  
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
    publicUrl: { 
      type: String, 
      required: true,
      get: function(v: string) {
        const frontendUrl = getFrontendUrl();
        const auditId = this.auditId || (v ? v.split('/').pop() : '');
        return `${frontendUrl}/audit/${auditId}`;
      }
    },
    companyName: { type: String },
    teamSize: { type: Number, required: true },
    tools: { type: [Schema.Types.Mixed], default: [] },
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

// ── Connection ────────────────────────────────────────────────
let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}
