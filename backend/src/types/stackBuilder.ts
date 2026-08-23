// ============================================================
// Stack Builder Types — StackSave AI Platform Intelligence
//
// Shared TypeScript types for Flow 2 (Build Stack) pipeline.
// ============================================================

import { KnowledgeVersionMetadata } from '../audit-engine/services/KnowledgeLoader';
import { StackCoverageResult } from '../audit-engine/services/StackCoverageAnalyzer';

export type { KnowledgeVersionMetadata, StackCoverageResult };

export type StackStrategy = 'balanced' | 'best-value' | 'max-performance' | 'enterprise-security';

export type ToolRole = 'primary' | 'secondary' | 'optional' | 'api';

export type BuyingPriority = '01 PRIMARY' | '02 SECONDARY' | '03 OPTIONAL' | '04 API LAYER';

// ── Request ──────────────────────────────────────────────────────────────────

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

// ── Confidence Breakdown ─────────────────────────────────────────────────────

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

// ── Plan Upgrade (Growth Simulation) ────────────────────────────────────────

export interface PlanUpgrade {
  toolId: string;
  toolName: string;
  currentPlan: string;
  recommendedPlan: string;
  triggerCondition: string;
  costDeltaPerSeat: number;
}

export interface GrowthProjection {
  teamSize: number;
  estimatedMonthlyCost: number;
  estimatedAnnualCost: number;
  recommendedUpgrades: PlanUpgrade[];
}

export interface GrowthSimulation {
  currentTeamSize: number;
  currentMonthlyCost: number;
  projection2x: GrowthProjection;
  projection5x: GrowthProjection;
}

// ── Stack Tool Assignment (with Buying Priority) ─────────────────────────────

export interface ProcurementFitReasons {
  domainFit: string;
  workflowFit: string;
  teamFit: string;
  budgetFit: string;
}

export interface StackToolAssignment {
  toolId: string;
  toolName: string;
  vendor: string;
  category: 'ide' | 'chat' | 'api' | 'search';
  role: ToolRole;
  buyingPriority: BuyingPriority;
  priorityLabel: string;             // e.g. "Recommended First", "Recommended Companion", "Useful If Needed"
  recommendedPlan: string;
  monthlyCostPerSeat: number;
  estimatedMonthlyCostPerTeam: number;
  workflowFitScore: number;
  capabilityHighlights: string[];
  whyRecommended: string;
  uniqueValueAdded: string;
  whatItComplements?: string;
  mainTradeoff?: string;
  procurementFitReasons?: ProcurementFitReasons;
  missingCapabilities?: string[];
  procurementRisks?: string[];
  bestFor?: string;
  notIdealFor?: string;
  purchaseDecision?: 'BUY_NOW' | 'STRONGLY_CONSIDER' | 'OPTIONAL_ADDON' | 'INFRASTRUCTURE_ONLY';
  featuresCovered: string[];
}

// Legacy alias
export type ToolInStack = StackToolAssignment;

// ── Structured Stack Architecture ────────────────────────────────────────────

export interface StructuredStack {
  stackId: string;
  label: 'Best Overall' | 'Best Value' | 'Best Performance' | 'Best Enterprise';
  rank: number;                      // 1 = Recommended, 2 = Strong Alternative, 3 = Alternative
  rankTitle: string;                 // e.g. "Recommended Stack", "Better Value Alternative", "Performance Choice"
  purposeLabel?: string;             // e.g. "Lowest Cost", "Developer Focus", "Research Heavy"
  canonicalSignature: string;        // Deduplication signature: sorted(toolId:plan)
  primary: StackToolAssignment;
  secondary?: StackToolAssignment;
  optional?: StackToolAssignment;
  apiLayer?: StackToolAssignment;
  tools: StackToolAssignment[];      // Flat array for iteration [primary, secondary, optional, apiLayer]
  estimatedMonthlyCost: number;
  estimatedAnnualCost: number;
  perSeatMonthlyCost: number;
  coverageResult: StackCoverageResult;
  workflowFitScore: number;
  capabilityCoverageScore: number;
  confidenceScore: number;
  confidenceBreakdown: ConfidenceBreakdown;
  whyThisStack: string;              // Concise 2-3 sentence buying guidance
  advantages: string[];
  strengths?: string[];
  tradeoffs: string[];
  growthSimulation?: GrowthSimulation;
  budgetStatus: 'within' | 'over' | 'no-limit';
  budgetOverrunPercent?: number;
  bestFor?: string;
}

export interface CandidateStackTrace {
  stackId: string;
  providerIds: string[];
  rawScore: number;
  generationSeed: string;
  budgetStatus: 'within' | 'over' | 'adjusted';
}

export interface OptimizerDecision {
  stackId: string;
  action: 'keep' | 'swap' | 'remove-redundancy' | 'improve-diversity';
  reason: string;
  affectedProvider?: string;
}

// Legacy alias
export type RankedStack = StructuredStack;

// ── Alternative Stack Comparison Entry ───────────────────────────────────────

export interface AlternativeStackComparison {
  rank: number;
  rankTitle: string;                 // e.g. "#2 Lowest Cost (Windsurf Pro + Claude Pro)"
  purposeLabel: string;              // e.g. "Best Value Architecture", "Developer Productivity Focus"
  architectureType?: string;          // e.g. "cost-efficient-pro", "agentic-development", "research-enhanced"
  stackSummary: string;              // e.g. "Windsurf (Pro) + Claude (Pro)"
  stack: StructuredStack;            // Complete structured stack instance
  perSeatCost: number;
  monthlyCost: number;
  matchScore: number;
  domainFit?: number;
  requirementCoverage?: number;
  budgetFit?: 'within' | 'over' | 'no-limit';
  budgetString?: string;              // e.g. "WITHIN BUDGET (80% utilization)" or "OVER BUDGET (+$280 over ceiling)"
  mainAdvantage: string;
  mainTradeoff: string;
  bestFor: string;
  whyThisStack: string;
  whyChooseInstead?: string;
  whyNotRecommended?: string;
  costDeltaVsPrimary: number;
}

// ── Category Result (Single Category Container) ──────────────────────────────

export interface CategoryResult {
  categoryId: 'bestOverall' | 'bestValue' | 'bestPerformance' | 'bestEnterprise';
  title: string;
  badge: string;                     // e.g. "Recommended", "Cost Optimized", "Top Benchmarks", "Strict Security"
  description: string;
  strategyUsed: StackStrategy;
  recommendedStack: StructuredStack; // Rank #1
  alternativeA?: StructuredStack;    // Rank #2 (Cheaper / Value Alternative)
  alternativeB?: StructuredStack;    // Rank #3 (Performance / Alternative)
  alternativeComparisons: AlternativeStackComparison[];
  
  // Legacy aliases for backward compatibility
  rank1: StructuredStack;
  rank2?: StructuredStack;
  rank3?: StructuredStack;
}

// ── Optimized Stack Set (Legacy Container) ───────────────────────────────────

export interface OptimizedStackSet {
  bestOverall: StructuredStack;
  bestBudget: StructuredStack;       // Alias for bestValue
  bestPerformance: StructuredStack;
  bestEnterprise?: StructuredStack;
}

// ── Rejected Alternative ─────────────────────────────────────────────────────

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
  vendor: string;
  category: string;
  compositeScore: number;
  rejectionCategory: RejectionCategory;
  rejectionBadge: string;
  consideredFor: string;
  whyNotSelected: string;
  whereItWins: string;
  whyWinnerWon: string;
  wouldHaveCovered: string[];
  estimatedMonthlyCostPerSeat: number;
  tradeoffVsSelected: string;
  bestFor: string;
  notIdealFor: string;
}

// ── Budget Simulation ────────────────────────────────────────────────────────

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

// ── Recommendation Trace ─────────────────────────────────────────────────────

export interface ProviderScoreTrace {
  providerId: string;
  providerName: string;
  category: string;
  compositeScore: number;
  workflowScore: number;
  featureCoverageScore: number;
  costEfficiencyScore: number;
  enterpriseScore: number;
  vendorStabilityScore: number;
  budgetFit: boolean;
  preferenceModifierApplied: number;
}

export interface RecommendationTrace {
  requestId: string;
  timestamp: string;
  inputs?: {
    domain: string;
    domainLabel: string;
    teamSize: number;
    monthlyBudget: number | null;
    requirements: string[];
    strategy: string;
    preferences: Record<string, unknown>;
  };
  strategyUsed: string;
  knowledgeSnapshot: KnowledgeVersionMetadata;
  applicationRanking: ProviderScoreTrace[];
  apiRanking: ProviderScoreTrace[];
  primaryCandidateScores?: Array<{
    providerId: string;
    providerName: string;
    category: string;
    domainScore: number;
    requirementScore: number;
    capabilityScore: number;
    strategyScore: number;
    budgetScore: number;
    stabilityScore: number;
    finalPrimaryScore: number;
    isCandidatePoolMember: boolean;
    isEligible: boolean;
  }>;
  allProviderScores: ProviderScoreTrace[];
  rejectedProviders: Array<{
    providerId: string;
    providerName: string;
    reason: string;
    compositeScore: number;
    wouldHaveCovered: string[];
  }>;
  totalDurationMs: number;
}

// ── User Context Summary ─────────────────────────────────────────────────────

export interface UserContextSummary {
  domain: string;
  domainLabel: string;
  teamSize: number;
  budgetFormatted: string;
  strategy: StackStrategy;
  strategyLabel: string;
  requirementCount: number;
}

// ── Final Recommendation Result ──────────────────────────────────────────────

export interface StackRecommendation {
  recommendationId: string;
  createdAt: string;
  userContextSummary: UserContextSummary;
  knowledgeVersion: KnowledgeVersionMetadata;
  stacks: OptimizedStackSet;
  categories: {
    bestOverall: CategoryResult;
    bestValue: CategoryResult;
    bestPerformance: CategoryResult;
    bestEnterprise: CategoryResult;
  };
  alternatives: RejectedAlternative[];
  budgetSimulation: BudgetSimulation;
  featureCoverage: StackCoverageResult;
  trace?: RecommendationTrace;
}
