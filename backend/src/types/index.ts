// ============================================================
// Shared TypeScript Interfaces — StackSave AI Audit
// ============================================================

export type ToolId =
  | 'cursor'
  | 'github-copilot'
  | 'claude'
  | 'chatgpt'
  | 'anthropic-api'
  | 'openai-api'
  | 'gemini'
  | 'windsurf';

export type UseCase = 'coding' | 'writing' | 'data' | 'research' | 'mixed';

export type InsightSeverity = 'high' | 'medium' | 'low' | 'info';

export type InsightType =
  | 'overpaid_plan'
  | 'unused_seats'
  | 'overlapping_tools'
  | 'cheaper_alternative'
  | 'annual_discount'
  | 'retail_vs_credits'
  | 'already_optimal';

// --- Input ---

export interface ToolEntry {
  toolId: ToolId;
  plan: string;
  monthlySpend: number; // what user is actually paying ($/mo)
  seats: number;
  useCase: UseCase;
}

export interface AuditRequest {
  tools: ToolEntry[];
  teamSize: number;
  companyName?: string;
  useCase: UseCase; // primary use case for the team
  reAuditOf?: string; // parent audit ID if chaining a new version
}

// --- Audit Engine Internals ---

export interface Insight {
  toolId: ToolId;
  toolName: string;
  type: InsightType;
  severity: InsightSeverity;
  message: string;        // what's wrong
  suggestion: string;     // what to do
  reason: string;         // 1-sentence finance-defensible reasoning
  potentialMonthlySaving: number;
  currentMonthlySpend: number;
  recommendedMonthlySpend: number;
}

export interface AuditResult {
  auditId: string;
  createdAt: string;
  totalMonthlySpend: number;
  optimizedMonthlySpend: number;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  savingsPercentage: number;
  isAlreadyOptimal: boolean;       // savings < $20/mo
  isHighSavings: boolean;          // savings > $500/mo → show Credex CTA
  insights: Insight[];
  aiSummary: string;
  publicUrl: string;
  // stored but stripped from public URL
  companyName?: string;
  teamSize: number;
  tools: ToolEntry[];
}

// --- API Response Shapes ---

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LeadCaptureRequest {
  email: string;
  auditId: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  _hp?: string; // honeypot field — must be empty
}

// --- Tool Catalog Types ---

export interface PlanOption {
  id: string;
  label: string;
  monthlyPricePerSeat: number; // 0 = free
  annualPricePerSeat?: number; // if annual billing available
  minSeats?: number;
  isPayPerUse?: boolean;       // for API tools
}

export interface ToolCatalog {
  id: ToolId;
  name: string;
  category: 'ide' | 'chat' | 'api' | 'search';
  useCases: UseCase[];
  plans: PlanOption[];
  alternatives?: AlternativeSuggestion[];
  pricingUrl: string;
  pricingVerifiedDate: string; // YYYY-MM-DD
}

export interface AlternativeSuggestion {
  toolId: ToolId;
  toolName: string;
  reason: string;   // use-case-specific reasoning
  estimatedSaving: string; // e.g. "~$10/user/mo"
}

// --- Pricing Snapshot (Batch 1: Persistence) ---
// Captures pricing catalog at time of audit for later comparison in re-audits

export interface PricingSnapshot {
  capturedAt: string;        // ISO timestamp
  catalogVersion: string;    // For future versioning
  tools: {
    [toolId: string]: {
      name: string;
      plans: {
        [planId: string]: {
          monthlyPricePerSeat: number;
          annualPricePerSeat?: number;
        }
      }
    }
  }
}

// --- Audit Request (Extended for Batch 1) ---

export interface AuditRequestWithEmail extends AuditRequest {
  email?: string;  // user email for notifications and identification
}

// ============================================================
// Batch 2: Pricing Change Detection
// ============================================================

/**
 * Represents price change for a single plan
 */
export interface PlanPriceChange {
  planId: string;
  planLabel: string;
  oldMonthlyPrice: number;
  newMonthlyPrice: number;
  monthlyDelta: number;       // can be negative (decrease) or positive (increase)
  oldAnnualPrice?: number;
  newAnnualPrice?: number;
  annualDelta?: number;
  priceChangePercent: number; // e.g. 10 for 10% increase
}

/**
 * Represents all price changes for a single tool
 */
export interface ToolPriceChange {
  toolId: ToolId;
  toolName: string;
  hasAnyChange: boolean;
  planChanges: PlanPriceChange[];
  isNewTool?: boolean;        // tool not in old snapshot
  isRemovedTool?: boolean;    // tool no longer in new snapshot
}

/**
 * Comparison result between two pricing snapshots
 */
export interface PricingComparison {
  changedTools: ToolPriceChange[];
  hasPricingChange: boolean;
  affectedToolCount: number;
  oldCatalogVersion: string;
  newCatalogVersion: string;
  comparedAt: string;        // ISO timestamp
}

/**
 * Pricing change metadata for a specific audit
 * Used in change detection results
 */
export interface AuditPricingChange {
  auditId: string;
  userEmail?: string;
  companyName?: string;
  auditCreatedAt: string;
  detectedAt: string;        // ISO timestamp when change was detected
  changedTools: ToolPriceChange[];
  hasPricingChange: boolean;
  summary: string;           // human-readable summary (e.g. "3 tools affected: Cursor +$5/mo, GitHub Copilot -$2/mo")
}

/**
 * Result from pricing change detection sweep
 */
export interface PricingChangeDetectionResult {
  success: boolean;
  detectionTimestamp: string;   // ISO timestamp
  auditsScanned: number;
  auditsWithChanges: number;
  affectedAudits: AuditPricingChange[];
  error?: string;
}

export interface StackToolEntry {
  toolId: ToolId;
  toolName: string;
  seats: number;
  planId: string;
  planLabel: string;
  monthlySpend: number;
}

export interface StackDiff {
  added: StackToolEntry[];
  removed: StackToolEntry[];
  changed: {
    toolId: ToolId;
    toolName: string;
    oldSeats: number;
    newSeats: number;
    oldPlanId: string;
    newPlanId: string;
    oldPlanLabel: string;
    newPlanLabel: string;
    oldSpend: number;
    newSpend: number;
    seatsDelta: number;
    spendDelta: number;
  }[];
  replaced: {
    removedToolId: ToolId;
    removedToolName: string;
    addedToolId: ToolId;
    addedToolName: string;
    removedPlanLabel: string;
    addedPlanLabel: string;
    removedSpend: number;
    addedSpend: number;
  }[];
  oldToolCount: number;
  newToolCount: number;
  toolCountDelta: number;
  oldOverlapCount: number;
  newOverlapCount: number;
  overlapCountDelta: number;
  oldOptCount: number;
  newOptCount: number;
  optCountDelta: number;
  summaries: string[];
}
