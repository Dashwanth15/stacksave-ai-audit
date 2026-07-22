// ============================================================
// Shared TypeScript Types — Frontend
// Keep in sync with backend/src/types/index.ts
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

export interface ToolEntry {
  toolId: ToolId;
  plan: string;
  monthlySpend: number;
  seats: number;
  useCase: UseCase;
}

export interface AuditRequest {
  tools: ToolEntry[];
  teamSize: number;
  companyName?: string;
  useCase: UseCase;
  reAuditOf?: string; // parent audit ID if chaining a new version
  optimizationGoal?: 'savings' | 'balanced' | 'productivity' | 'governance';
}

// --- Audit Engine Internals ---

export interface Insight {
  toolId: ToolId;
  toolName: string;
  type: InsightType;
  severity: InsightSeverity;
  message: string;        // what's wrong
  suggestion: string;     // what to do (the clear recommendation)
  reason: string;         // short explanation
  potentialMonthlySaving: number;
  currentMonthlySpend: number;
  recommendedMonthlySpend: number;
  
  // New fields for the revamped recommendation engine
  strategy?: 'performance' | 'savings' | 'both';
  recommendationType?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  productivityImpact?: 'No Impact' | 'Minimal Impact' | 'Moderate Impact' | 'Major Impact';
  
  // Scoring metadata fields
  confidenceScore?: number;
  confidenceExplanation?: string[];
  priorityScore?: number;

  // View Details fields
  currentSetup?: string;
  recommendedSetup?: string;
  detailedReason?: string;
  tradeoffs?: string;
  estimatedSavings?: string;
  decisionLog?: DecisionLog;
}

export interface AuditResult {
  auditId: string;
  createdAt: string;
  totalMonthlySpend: number;
  optimizedMonthlySpend: number;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  savingsPercentage: number;
  isAlreadyOptimal: boolean;
  isHighSavings: boolean;
  insights: Insight[];
  aiSummary: string;
  aiSummarySavings?: string;
  publicUrl: string;
  companyName?: string;
  teamSize: number;
  tools: ToolEntry[];
  useCase?: UseCase;
  optimizationGoal?: 'savings' | 'balanced' | 'productivity' | 'governance';

  // Batch 4 re-audit additions
  pricingChanged?: boolean;
  outdatedReason?: string;
  reAuditOf?: string;
  isLatestVersion?: boolean;
  auditVersion?: number;
  allVersions?: AuditVersionInfo[];
}

export interface LeadCaptureRequest {
  email: string;
  auditId: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  _hp?: string;
}

export type BillingType = 'per-seat' | 'usage-based' | 'flat' | 'custom';

// Tool display info (static, frontend only)
export interface ToolInfo {
  id: ToolId;
  name: string;
  icon: string;        // emoji for now, can swap for SVG
  category: string;
  description: string; // one-line tagline for the tool
  plans: PlanOption[];
  defaultPlan: string;
}

export interface PlanOption {
  id: string;
  label: string;
  monthlyPricePerSeat: number;
  billingType: BillingType;
  isPayPerUse?: boolean;
  isEnterprise?: boolean; // true = "Contact Sales" instead of price
  minSeats?: number;      // minimum seat requirement
  maxSeats?: number;      // maximum seat limit
  annualPrice?: number;   // annual per-seat price (if discount exists)
  features?: string[];    // key plan features for display
  tagline?: string;       // short plan description
}

// ── Batch 4: Re-Audit Comparison Types ───────────────────────

export interface RecommendationDiff {
  toolId: ToolId;
  toolName: string;
  type: string;
  status: 'added' | 'removed' | 'changed';
  oldInsight?: Insight;
  newInsight?: Insight;
  savingDelta?: number;
}

export interface PricingDiff {
  toolId: ToolId;
  toolName: string;
  planId: string;
  planLabel: string;
  oldMonthlyPrice: number;
  newMonthlyPrice: number;
  monthlyDelta: number;
  oldAnnualPrice?: number;
  newAnnualPrice?: number;
  annualDelta?: number;
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

export interface AuditDiff {
  oldAuditId: string;
  newAuditId: string;
  oldSavings: number;
  newSavings: number;
  savingsDelta: number;
  recommendationsChanged: boolean;
  changedTools: ToolId[];
  recommendationDiffs: RecommendationDiff[];
  pricingDiffs: PricingDiff[];
  generatedAt: string;
  stackDiff?: StackDiff;
}

export interface AuditVersionInfo {
  auditId: string;
  auditVersion: number;
  createdAt: string;
  estimatedMonthlySavings: number;
  isLatestVersion: boolean;
}

export interface ReAuditResponse {
  oldAuditId: string;
  newAuditId: string;
  oldAudit: AuditResult;
  newAudit: AuditResult;
  diff: AuditDiff;
  allVersions?: AuditVersionInfo[];
}

export interface ProposalEvaluation {
  id: string;
  name: string;
  keptTools: string[];
  decommissionedTools: string[];
  monthlyCost: number;
  monthlySavings: number;
  workflowCapability: number;
  capabilityRetention: number;
  productivityImpact: number;
  migrationRisk: number;
  businessValueScore: number;
  isValid: boolean;
  acceptedConstraints: string[];
  failedConstraints: string[];
}

export interface DecisionLog {
  strategy: 'performance' | 'savings';
  useCase: string;
  baselineScore: number;
  proposalsEvaluated: ProposalEvaluation[];
  selectedProposals: string[];
  finalScore: number;
  confidence: 'High' | 'Medium' | 'Low';
}

