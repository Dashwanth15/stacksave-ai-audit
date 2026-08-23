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
  | 'windsurf'
  | 'perplexity'
  | 'deepseek'
  | 'codex'
  | 'github-models'
  | 'kimi'
  | 'all-stack-tools';

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
  modelId?: string;
  versionName?: string;
}

export interface AuditRequest {
  tools: ToolEntry[];
  teamSize: number;
  companyName?: string;
  useCase: UseCase;
  reAuditOf?: string; // parent audit ID if chaining a new version
  optimizationGoal?: 'savings' | 'balanced' | 'productivity' | 'governance';
  billingCycle?: 'monthly' | 'annual'; // user's selected billing period
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
  billingCycle?: 'monthly' | 'annual'; // billing period used in this audit

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
  icon: string;
  category: string;
  description: string;
  plans: PlanOption[];
  defaultPlan: string;
}

export interface PlanOption {
  id: string;
  label: string;
  monthlyPricePerSeat: number;
  billingType: BillingType;
  isPayPerUse?: boolean;
  isEnterprise?: boolean;
  minSeats?: number;
  maxSeats?: number;
  annualPrice?: number;
  features?: string[];
  tagline?: string;
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

// ── Flow 2: Build Stack Types ─────────────────────────────────

export type StackStrategy = 'balanced' | 'best-value' | 'max-performance' | 'enterprise-security';

export type ToolRole = 'primary' | 'secondary' | 'optional' | 'api' | 'supporting' | 'research' | 'automation-api' | 'specialized';

export interface StackBuilderRequest {
  domain?: string;
  requirements?: string[];
  strategy?: StackStrategy;
  monthlyBudget: number | null;
  teamSize: number;
  engineeringFocus?: string[];
  primaryWorkflow?: string;
  mustHaveFeatures?: string[];
  preferences: {
    preferOpenSource: boolean;
    avoidLockIn: boolean;
    maximizeSavings: boolean;
    preferEstablishedVendors: boolean;
    requireZeroRetention?: boolean;
  };
  constraints?: Record<string, unknown>;
  debug?: boolean;
}

export interface ConfidenceBreakdown {
  overall: number;
  workflowMatch: number;
  featureCoverage: number;
  budgetFit: number;
  capabilitySuperiority: number;
  securityMatch: number;
  vendorStability: number;
  futureGrowth: number;
}

export type BuyingPriority = '01 PRIMARY' | '02 SECONDARY' | '03 OPTIONAL' | '04 API LAYER';

export interface ProcurementFitReasons {
  domainFit: string;
  workflowFit: string;
  teamFit: string;
  budgetFit: string;
}

export interface ToolInStack {
  toolId: string;
  toolName: string;
  category: 'ide' | 'chat' | 'api' | 'search' | string;
  vendor: string;
  role?: ToolRole;
  buyingPriority?: BuyingPriority;
  priorityLabel?: string;
  recommendedPlan: string;
  monthlyCostPerSeat: number;
  estimatedMonthlyCostPerTeam: number;
  workflowFitScore: number;
  capabilityHighlights: string[];
  whyRecommended?: string;
  uniqueValueAdded?: string;
  whatItComplements?: string;
  mainTradeoff?: string;
  procurementFitReasons?: ProcurementFitReasons;
  missingCapabilities?: string[];
  procurementRisks?: string[];
  bestFor?: string;
  notIdealFor?: string;
  purchaseDecision?: 'BUY_NOW' | 'STRONGLY_CONSIDER' | 'OPTIONAL_ADDON' | 'INFRASTRUCTURE_ONLY';
  reasons?: string[];
  featuresCovered: string[];
}

export type StackToolAssignment = ToolInStack;

export interface CoveredFeature {
  featureKey: string;
  featureLabel: string;
  coveredBy: string[];
  maxScore: number;
}

export interface StackCoverageResult {
  covered: CoveredFeature[];
  partial: CoveredFeature[];
  missing: string[];
  coverageScore: number;
  redundancies: Array<{ feature: string; featureLabel: string; providers: string[] }>;
}

export interface GrowthProjection {
  teamSize: number;
  estimatedMonthlyCost: number;
  estimatedAnnualCost: number;
  recommendedUpgrades: Array<{
    toolId: string;
    toolName: string;
    currentPlan: string;
    recommendedPlan: string;
    triggerCondition: string;
    costDeltaPerSeat: number;
  }>;
}

export interface GrowthSimulation {
  currentTeamSize: number;
  currentMonthlyCost: number;
  projection2x: GrowthProjection;
  projection5x: GrowthProjection;
}

export interface RankedStack {
  stackId: string;
  label: 'Best Overall' | 'Best Budget' | 'Best Value' | 'Best Performance' | 'Best Enterprise';
  rank?: number;
  rankTitle?: string;
  purposeLabel?: string;
  canonicalSignature?: string;
  primary?: ToolInStack;
  secondary?: ToolInStack;
  optional?: ToolInStack;
  apiLayer?: ToolInStack;
  tools: ToolInStack[];
  estimatedMonthlyCost: number;
  estimatedAnnualCost: number;
  perSeatMonthlyCost: number;
  coverageResult: StackCoverageResult;
  workflowFitScore: number;
  capabilityCoverageScore: number;
  confidenceScore: number;
  confidenceBreakdown: ConfidenceBreakdown;
  whyThisStack?: string;
  advantages?: string[];
  strengths?: string[];
  tradeoffs: string[];
  growthSimulation?: GrowthSimulation;
  budgetStatus: 'within' | 'over' | 'no-limit';
  budgetOverrunPercent?: number;
  bestFor?: string;
}

export type StructuredStack = RankedStack;

export interface AlternativeStackComparison {
  rank: number;
  rankTitle: string;
  purposeLabel?: string;
  architectureType?: string;
  stackSummary: string;
  stack?: StructuredStack;
  perSeatCost: number;
  monthlyCost: number;
  matchScore: number;
  domainFit?: number;
  requirementCoverage?: number;
  budgetFit?: 'within' | 'over' | 'no-limit';
  budgetString?: string;
  mainAdvantage: string;
  mainTradeoff: string;
  bestFor?: string;
  whyThisStack?: string;
  whyChooseInstead?: string;
  whyNotRecommended?: string;
  costDeltaVsPrimary?: number;
}

export interface CategoryResult {
  categoryId: 'bestOverall' | 'bestValue' | 'bestPerformance' | 'bestEnterprise';
  title: string;
  badge?: string;
  description: string;
  strategyUsed: StackStrategy;
  recommendedStack?: StructuredStack;
  alternativeA?: StructuredStack;
  alternativeB?: StructuredStack;
  alternativeComparisons?: AlternativeStackComparison[];
  rank1: RankedStack;
  rank2?: RankedStack;
  rank3?: RankedStack;
}

export interface OptimizedStackSet {
  bestOverall: RankedStack;
  bestBudget: RankedStack;
  bestPerformance: RankedStack;
  bestEnterprise?: RankedStack;
}

export type RejectionCategory =
  | 'DOMAIN_MISMATCH'
  | 'REQUIREMENT_GAP'
  | 'BUDGET_OVERRUN'
  | 'LOWER_BENCHMARK'
  | 'REDUNDANCY'
  | 'ENTERPRISE_GAP'
  | 'API_INFRASTRUCTURE';

export interface RejectedAlternative {
  toolId: string;
  toolName: string;
  vendor?: string;
  category: string;
  compositeScore: number;
  rejectionCategory?: RejectionCategory;
  rejectionBadge?: string;
  consideredFor?: string;
  whyNotSelected: string;
  whereItWins?: string;
  whyWinnerWon?: string;
  wouldHaveCovered: string[];
  estimatedMonthlyCostPerSeat: number;
  tradeoffVsSelected: string;
  bestFor?: string;
  notIdealFor?: string;
}

export interface BudgetTierResult {
  budgetPerMonth: number | null;
  budgetLabel: string;
  estimatedMonthlyCost: number;
  coverageScore: number;
  confidenceScore: number;
  stackSummary: string[];
}

export interface BudgetSimulation {
  tiers: BudgetTierResult[];
}

export interface KnowledgeVersionMetadata {
  providerCount: number;
  featureMapVersion: string;
  workflowWeightsVersion: string;
  recommendationWeightsVersion: string;
  generatedAt: string;
}

export interface UserContextSummary {
  domain: string;
  domainLabel: string;
  teamSize: number;
  budgetFormatted: string;
  strategy: StackStrategy;
  strategyLabel: string;
  requirementCount: number;
}

export interface StackRecommendation {
  recommendationId: string;
  createdAt: string;
  userContextSummary?: UserContextSummary;
  knowledgeVersion: KnowledgeVersionMetadata;
  stacks: OptimizedStackSet;
  categories?: {
    bestOverall: CategoryResult;
    bestValue: CategoryResult;
    bestPerformance: CategoryResult;
    bestEnterprise: CategoryResult;
  };
  alternatives: RejectedAlternative[];
  budgetSimulation: BudgetSimulation;
  featureCoverage: StackCoverageResult;
  trace?: unknown;
}

// ── Public Offers & Pricing Intelligence ───────────────────────

export interface PublicOffer {
  id: string;
  fingerprint?: string;
  providerId: string;
  providerName: string;
  title: string;
  description: string | null;
  discount: string | null;
  discountType: string | null;
  sourceUrl: string;
  detectedAt: string;
  expiresAt: string | null;
  isVerified?: boolean;
}

export type OfferFilterTab = 'all' | 'new' | 'active' | 'expired';
