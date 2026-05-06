// ============================================================
// MongoDB Service — StackSave AI Audit
// ============================================================

import mongoose, { Schema, Document } from 'mongoose';

// ── Audit Schema ─────────────────────────────────────────────
export interface AuditDocument extends Document {
  auditId: string;
  createdAt: Date;
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
  // Private fields — NOT exposed on public share URL
  email?: string;
}

const AuditSchema = new Schema<AuditDocument>(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now },
    totalMonthlySpend: { type: Number, required: true },
    optimizedMonthlySpend: { type: Number, required: true },
    estimatedMonthlySavings: { type: Number, required: true },
    estimatedAnnualSavings: { type: Number, required: true },
    savingsPercentage: { type: Number, required: true },
    isAlreadyOptimal: { type: Boolean, default: false },
    isHighSavings: { type: Boolean, default: false },
    insights: { type: [Schema.Types.Mixed], default: [] },
    aiSummary: { type: String, default: '' },
    publicUrl: { type: String, required: true },
    companyName: { type: String },
    teamSize: { type: Number, required: true },
    tools: { type: [Schema.Types.Mixed], default: [] },
    email: { type: String }, // captured at lead gate — private
  },
  { timestamps: false }
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
