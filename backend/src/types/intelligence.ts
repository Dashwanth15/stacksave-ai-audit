// ============================================================
// AI Decision Intelligence Platform (ADIP) Types — Backend v2
// ============================================================

import type { UseCase } from './index';

// ─── Base Types ────────────────────────────────────────────────────────────────

export type ToolRemovalClassification =
  | 'safe_to_remove'
  | 'replace_before_removing'
  | 'optional_tool'
  | 'critical_tool';

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type DifficultyLevel = 'None' | 'Low' | 'Medium' | 'High';
export type LearningCurveLevel = 'Very Low' | 'Low' | 'Medium' | 'High';

// ─── Opportunity Score ─────────────────────────────────────────────────────────

export interface OpportunityScore {
  overall: number;                  // 0–100 headline metric
  financialOpportunity: number;     // 0–100
  technicalOpportunity: number;     // 0–100
  businessOpportunity: number;      // 0–100
  migrationSimplicity: number;      // 0–100 (higher = simpler)
  futureScalability: number;        // 0–100
  vendorOptimization: number;       // 0–100
  overallConfidence: number;        // 0–100
}

// ─── Feature Matrix ────────────────────────────────────────────────────────────

export type FeatureStatus = 'yes' | 'no' | 'partial';

export interface FeatureMatrixRow {
  feature: string;
  featureKey: string;
  currentStatus: FeatureStatus;
  currentScore?: number;
  recommendedStatus: FeatureStatus;
  recommendedScore?: number;
  delta: 'better' | 'worse' | 'same' | 'new' | 'lost';
  note?: string;
  capabilityEvidence?: string;  // Evidence text from knowledge base (e.g. "Gemini 1.5 Pro supports 1M tokens")
}

// ─── Before/After Stack Visualization ─────────────────────────────────────────

export interface StackVisualization {
  currentStack: Array<{
    toolId: string;
    toolName: string;
    role: string;
    monthlySpend: number;
    seats: number;
    isRemoved: boolean;
  }>;
  recommendedStack: Array<{
    toolId: string;
    toolName: string;
    role: string;
    estimatedMonthlyCost: number;
    seats: number;
    isNew: boolean;
    isRetained: boolean;
  }>;
  currentMonthlyCost: number;
  recommendedMonthlyCost: number;
  monthlySavings: number;
}

// ─── Audience Guidance ─────────────────────────────────────────────────────────

export interface AudienceGuidance {
  recommendedFor: string[];        // "✓ Solo Developers", "✓ Startups"
  notRecommendedFor: string[];     // "✗ Compliance-heavy companies"
  whenNotToFollow: string[];       // "Do not replace if your team depends on X"
}

// ─── Migration Checklist ───────────────────────────────────────────────────────

export interface MigrationStep {
  id: string;
  category: 'data' | 'setup' | 'team' | 'billing' | 'integration';
  action: string;
  priority: 'required' | 'recommended' | 'optional';
}

export interface MigrationChecklist {
  estimatedDays: number;
  steps: MigrationStep[];
}

// ─── Future Growth Analysis ────────────────────────────────────────────────────

export interface FutureGrowthTier {
  teamSize: number;
  label: string;                   // "Current (5)", "2× Scale (10)", "10× Scale (50)"
  projectedMonthlyCost: number;
  scalabilityScore: number;        // 0–100
  enterpriseReadiness: ConfidenceLevel;
  vendorLockIn: RiskLevel;
  upgradeRequired: boolean;
  upgradeNote?: string;
}

export interface FutureGrowthAnalysis {
  currentTier: FutureGrowthTier;
  growthTiers: FutureGrowthTier[];
  scalabilityVerdict: string;
  longTermRisk: RiskLevel;
}

// ─── Ranked Recommendation ────────────────────────────────────────────────────

export interface RankedRecommendation {
  rank: number;
  label: 'Best Recommendation' | 'Second Best' | 'Best Budget' | 'Best Performance' | 'Keep Current Stack';
  toolId: string;
  toolName: string;
  overallScore: number;           // 0–100
  confidence: ConfidenceLevel;
  monthlySavings: number;         // Signed: negative = savings, positive = cost increase (for legacy compat kept as positive)
  annualSavings: number;
  netMonthlyCostDelta: number;    // Signed: negative = savings, positive = cost increase
  replacementMonthlyCost: number; // Actual cost of this replacement option
  capabilityRetention: number;    // 0–100
  riskLevel: RiskLevel;
  summary: string;
}

// ─── Domain Impact ─────────────────────────────────────────────────────────────

export interface DomainImpact {
  coding: { delta: number; rationale: string };
  writing: { delta: number; rationale: string };
  research: { delta: number; rationale: string };
  reasoning: { delta: number; rationale: string };
  enterprise: { delta: number; rationale: string };
  security: { delta: number; rationale: string };
}

// ─── Business Impact Summary ───────────────────────────────────────────────────

export interface BusinessImpactSummary {
  costReduction: string;
  developerProductivity: string;
  workflowImpact: string;
  enterpriseReadiness: string;
  vendorLockIn: string;
  scalability: string;
  operationalComplexity: string;
  overallRisk: string;
}

// ─── Operational Deltas ────────────────────────────────────────────────────────

export interface OperationalDeltas {
  contextWindowDiff: string;
  latencyDiff: string;
  integrationChanges: string[];
  migrationDifficulty: DifficultyLevel;
  learningCurve: LearningCurveLevel;
  vendorLockInImpact: RiskLevel;
}

// ─── Scenario Simulation ──────────────────────────────────────────────────────

export interface ScenarioOption {
  id: string;
  title: string;
  action: string;
  monthlySavings: number;         // Unsigned magnitude (for legacy compat)
  annualSavings: number;
  netMonthlyCostDelta: number;    // Signed: negative = savings, positive = cost increase
  costDirection: 'savings' | 'increase' | 'neutral'; // Explicit direction for UI color coding
  replacementMonthlyCost: number; // Actual cost of replacement in this scenario
  coveragePercent: number;
  riskLevel: RiskLevel;
  tradeoffs: string[];
  recommendation: string;
}

export interface ScenarioSimulation {
  primaryScenario: ScenarioOption;
  alternativeScenario?: ScenarioOption;
  statusQuoScenario: ScenarioOption;
}

// ─── Why Not Selected ─────────────────────────────────────────────────────────

export interface WhyNotSelectedExplanation {
  providerId: string;
  providerName: string;
  primaryReason: string;
  scoreDifferences: Array<{ metric: string; targetScore: number; alternativeScore: number }>;
  keyDeficiencies: string[];
  tradeoffSummary: string;
  monthlyCostDiff: number;        // Signed delta vs recommended option (negative = alternative is cheaper)
  alternativeMonthlyCost: number; // Actual monthly cost of this alternative
}

// ─── Recommendation Trace ─────────────────────────────────────────────────────

export interface RecommendationTrace {
  knowledgeVersion: string;
  generatedAt: string;
  useCase: string;
  scoringProfile: Record<string, number>;
  decisionPath: string[];
  confidenceBreakdown: {
    capabilityMatch: number;
    workflowFit: number;
    enterpriseReadiness: number;
    financialFit: number;
    riskScore: number;
  };
}

// ─── Full Decision Report ─────────────────────────────────────────────────────

export interface DecisionReport {
  id: string;
  title: string;
  targetToolName: string;
  proposedAction: string;

  // Headline metrics
  opportunityScore: OpportunityScore;
  executiveSummary: string;
  recommendation: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;

  // Before / After stack visualization
  stackVisualization: StackVisualization;

  // Multiple ranked recommendations
  rankedRecommendations: RankedRecommendation[];

  // Cost Impact — SIGNED + DIRECTIONAL
  currentMonthlyCost: number;       // What user pays now
  projectedMonthlyCost: number;     // Actual replacement tool cost (not capped at 0)
  monthlySavings: number;           // Unsigned magnitude (0 when cost increases)
  annualSavings: number;            // Unsigned magnitude (0 when cost increases)
  netCostDelta: number;             // Signed: negative = savings, positive = cost increase
  costDirection: 'savings' | 'increase' | 'neutral'; // For UI color coding
  financialExplanation: string;     // Human-readable explanation of the cost math
  perSeatBreakdown: {
    seats: number;
    currentCostPerSeat: number;
    replacementCostPerSeat: number;
    netDeltaPerSeat: number;
  };

  // Capabilities & Coverage
  capabilityRetentionPercent: number;
  capabilitiesLost: string[];
  capabilitiesGained: string[];
  remainingCoveragePercent: number;

  // Feature difference matrix
  featureMatrix: FeatureMatrixRow[];

  // Domain & Operational Impact
  domainImpact: DomainImpact;
  operationalDeltas: OperationalDeltas;

  // Business Impact
  businessImpact: BusinessImpactSummary;
  developerImpact: string;
  enterpriseImpact: string;

  // Audience & Contextual Guidance
  audienceGuidance: AudienceGuidance;

  // Migration
  migrationChecklist: MigrationChecklist;

  // Risk & Strategy
  riskLevel: RiskLevel;
  riskFactors: string[];

  // Scenarios & Alternatives
  scenarios: ScenarioSimulation;
  whyNotSelected: WhyNotSelectedExplanation[];

  // Future Growth
  futureGrowthAnalysis: FutureGrowthAnalysis;

  // Trace
  trace: RecommendationTrace;
}

// ─── Opportunity Output Types ─────────────────────────────────────────────────

export interface ReplaceOpportunity {
  sourceToolId: string;
  sourceToolName: string;
  targetToolId: string;
  targetToolName: string;
  compatibilityScore: number;
  capabilityRetentionPercent: number;
  opportunityScore: OpportunityScore;
  rankedRecommendations: RankedRecommendation[];
  capabilitiesLost: string[];
  capabilitiesGained: string[];
  workflowImpact: 'Positive' | 'Neutral' | 'Minor Impact' | 'Major Impact';
  monthlySavings: number;           // Unsigned magnitude
  annualSavings: number;
  netCostDelta: number;             // Signed: negative = savings, positive = cost increase
  costDirection: 'savings' | 'increase' | 'neutral';
  replacementMonthlyCost: number;   // Actual target tool cost
  migrationDifficulty: DifficultyLevel;
  learningCurve: LearningCurveLevel;
  vendorLockInImpact: RiskLevel;
  riskLevel: RiskLevel;
  confidence: ConfidenceLevel;
  recommendation: string;
  decisionReport: DecisionReport;
}

export interface ConsolidateOpportunity {
  id: string;
  decommissionedToolIds: string[];
  decommissionedToolNames: string[];
  absorbingToolId: string;
  absorbingToolName: string;
  currentCost: number;
  projectedCost: number;
  monthlySavings: number;
  annualSavings: number;
  opportunityScore: OpportunityScore;
  rankedRecommendations: RankedRecommendation[];
  coverageRetainedPercent: number;
  capabilitiesLost: string[];
  capabilitiesGained: string[];
  workflowMatchPercent: number;
  migrationDifficulty: DifficultyLevel;
  vendorConcentrationHHI: number;
  riskLevel: RiskLevel;
  confidence: ConfidenceLevel;
  recommendation: string;
  businessValueScore: number;
  decisionReport: DecisionReport;
}

export interface RemoveOpportunity {
  toolId: string;
  toolName: string;
  classification: ToolRemovalClassification;
  classificationLabel: string;
  removalConfidence: ConfidenceLevel;
  remainingCoveragePercent: number;
  opportunityScore: OpportunityScore;
  rankedRecommendations: RankedRecommendation[];
  capabilitiesLost: string[];
  capabilitiesCoveredByRemaining: string[];
  workflowImpact: string;
  businessImpact: string;
  enterpriseImpact: string;
  riskLevel: RiskLevel;
  monthlySavings: number;
  annualSavings: number;
  recommendation: string;
  decisionReport: DecisionReport;
}

export interface StackIntelligenceResult {
  generatedAt: string;
  useCase: UseCase;
  replacements: ReplaceOpportunity[];
  consolidations: ConsolidateOpportunity[];
  removals: RemoveOpportunity[];
  executiveSummary: string;
}
