// ============================================================
// Stack Builder Types — StackSave AI Platform Intelligence
//
// Shared TypeScript types for the Flow 2 (Build Stack) pipeline.
// Mirrors frontend/src/types/index.ts Flow 2 additions.
// ============================================================

import { KnowledgeVersionMetadata } from '../audit-engine/services/KnowledgeLoader';
import { StackCoverageResult } from '../audit-engine/services/StackCoverageAnalyzer';

export type { KnowledgeVersionMetadata, StackCoverageResult };

// ── Request ──────────────────────────────────────────────────────────────────

export interface StackBuilderRequest {
  monthlyBudget: number | null;      // null = no budget limit
  teamSize: number;
  engineeringFocus: string[];        // e.g. ['coding', 'backend', 'ai-engineering']
  primaryWorkflow: string;           // key into workflow-weights.json
  mustHaveFeatures: string[];        // keys from feature-map.json
  preferences: {
    preferOpenSource: boolean;
    avoidLockIn: boolean;
    maximizeSavings: boolean;
    preferEstablishedVendors: boolean;
  };
  // Generic future-proof constraints. Unknown keys are silently ignored.
  constraints?: Record<string, unknown>;
  // Internal: include full RecommendationTrace in response (for debugging)
  debug?: boolean;
}

// ── Confidence Breakdown ─────────────────────────────────────────────────────

export interface ConfidenceBreakdown {
  overall: number;              // Weighted composite of all 7 factors, 0–100
  workflowMatch: number;        // WorkflowEngine suitability for primaryWorkflow
  featureCoverage: number;      // % of must-haves covered
  budgetFit: number;            // 100 if under budget, proportionally lower if over
  capabilitySuperiority: number;// Stack avg capability vs all-provider avg
  securityMatch: number;        // EnterpriseScore if security features requested
  vendorStability: number;      // Avg vendorStabilityScore across stack members
  futureGrowth: number;         // Avg futureGrowthScore across stack members
}

// ── Plan Upgrade (Growth Simulation) ────────────────────────────────────────

export interface PlanUpgrade {
  toolId: string;
  toolName: string;
  currentPlan: string;
  recommendedPlan: string;
  triggerCondition: string;     // e.g. "When team grows beyond 50 seats"
  costDeltaPerSeat: number;     // monthly cost delta per seat for the upgrade
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

// ── Ranked Stack ─────────────────────────────────────────────────────────────

export interface ToolInStack {
  toolId: string;
  toolName: string;
  category: string;
  vendor: string;
  recommendedPlan: string;
  estimatedMonthlyCostPerTeam: number;
  workflowFitScore: number;         // 0–100
  capabilityHighlights: string[];   // top 3 evidence strings from JSON
  reasons: string[];                // human-readable reasons for inclusion
  featuresCovered: string[];        // must-have feature keys this tool covers
}

export interface RankedStack {
  stackId: string;
  label: 'Best Overall' | 'Best Budget' | 'Best Performance' | 'Best Enterprise';
  tools: ToolInStack[];
  estimatedMonthlyCost: number;
  estimatedAnnualCost: number;
  coverageResult: StackCoverageResult;
  workflowFitScore: number;         // 0–100 composite across stack
  capabilityCoverageScore: number;  // 0–100
  confidenceScore: number;          // 0–100 overall
  confidenceBreakdown: ConfidenceBreakdown;
  tradeoffs: string[];
  growthSimulation?: GrowthSimulation;  // only on Best Overall
  budgetStatus: 'within' | 'over' | 'no-limit';
  budgetOverrunPercent?: number;    // if 'over', how much over in %
}

// ── Optimized Stack Set ───────────────────────────────────────────────────────

export interface OptimizedStackSet {
  bestOverall: RankedStack;
  bestBudget: RankedStack;
  bestPerformance: RankedStack;
  bestEnterprise?: RankedStack;     // only if enterprise features were requested
}

// ── Rejected Alternatives ────────────────────────────────────────────────────

export interface RejectedAlternative {
  toolId: string;
  toolName: string;
  category: string;
  compositeScore: number;
  whyNotSelected: string;           // human-readable deterministic reason
  wouldHaveCovered: string[];       // feature keys this tool would have contributed
  estimatedMonthlyCostPerSeat: number;
  tradeoffVsSelected: string;       // e.g. "Lower coding score (72 vs 91) but 40% cheaper"
}

// ── Budget Simulation ────────────────────────────────────────────────────────

export interface BudgetTierResult {
  budgetPerMonth: number | null;    // null = unlimited
  budgetLabel: string;              // e.g. "$40/mo", "$80/mo", "Unlimited"
  estimatedMonthlyCost: number;
  coverageScore: number;
  confidenceScore: number;
  stackSummary: string[];           // e.g. ["Cursor (Pro)", "Claude (Pro)"]
}

export interface BudgetSimulation {
  tiers: BudgetTierResult[];
}

// ── Recommendation Trace (internal debug) ────────────────────────────────────

export interface ProviderScoreTrace {
  providerId: string;
  providerName: string;
  compositeScore: number;
  workflowScore: number;
  featureCoverageScore: number;
  costEfficiencyScore: number;
  enterpriseScore: number;
  vendorStabilityScore: number;
  budgetFit: boolean;
  preferenceModifierApplied: number;  // net score adjustment from preferences
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

export interface RecommendationTrace {
  requestId: string;
  timestamp: string;
  strategyUsed: string;             // e.g. "greedy-cover-v1"
  knowledgeSnapshot: KnowledgeVersionMetadata;
  allProviderScores: ProviderScoreTrace[];
  candidateStacks: CandidateStackTrace[];
  optimizerDecisions: OptimizerDecision[];
  rejectedProviders: Array<{
    providerId: string;
    providerName: string;
    reason: string;
    compositeScore: number;
    wouldHaveCovered: string[];
  }>;
  totalDurationMs: number;
}

// ── Final Recommendation Result ───────────────────────────────────────────────

export interface StackRecommendation {
  recommendationId: string;
  createdAt: string;
  knowledgeVersion: KnowledgeVersionMetadata;
  stacks: OptimizedStackSet;
  alternatives: RejectedAlternative[];
  budgetSimulation: BudgetSimulation;
  featureCoverage: StackCoverageResult;  // coverage for bestOverall stack
  trace?: RecommendationTrace;           // only present when debug=true
}
