// ============================================================
// AI Decision Intelligence Platform (ADIP) Types — Frontend v2
// Keep in sync with backend/src/types/intelligence.ts
// ============================================================

import type { UseCase } from './index';

export type ToolRemovalClassification =
  | 'safe_to_remove'
  | 'replace_before_removing'
  | 'optional_tool'
  | 'critical_tool';

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type DifficultyLevel = 'None' | 'Low' | 'Medium' | 'High';
export type LearningCurveLevel = 'Very Low' | 'Low' | 'Medium' | 'High';

export interface OpportunityScore {
  overall: number;
  financialOpportunity: number;
  technicalOpportunity: number;
  businessOpportunity: number;
  migrationSimplicity: number;
  futureScalability: number;
  vendorOptimization: number;
  overallConfidence: number;
}

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
}

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

export interface AudienceGuidance {
  recommendedFor: string[];
  notRecommendedFor: string[];
  whenNotToFollow: string[];
}

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

export interface FutureGrowthTier {
  teamSize: number;
  label: string;
  projectedMonthlyCost: number;
  scalabilityScore: number;
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

export interface RankedRecommendation {
  rank: number;
  label: 'Best Recommendation' | 'Second Best' | 'Best Budget' | 'Best Performance' | 'Keep Current Stack';
  toolId: string;
  toolName: string;
  overallScore: number;
  confidence: ConfidenceLevel;
  monthlySavings: number;
  annualSavings: number;
  capabilityRetention: number;
  riskLevel: RiskLevel;
  summary: string;
}

export interface DomainImpact {
  coding: { delta: number; rationale: string };
  writing: { delta: number; rationale: string };
  research: { delta: number; rationale: string };
  reasoning: { delta: number; rationale: string };
  enterprise: { delta: number; rationale: string };
  security: { delta: number; rationale: string };
}

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

export interface OperationalDeltas {
  contextWindowDiff: string;
  latencyDiff: string;
  integrationChanges: string[];
  migrationDifficulty: DifficultyLevel;
  learningCurve: LearningCurveLevel;
  vendorLockInImpact: RiskLevel;
}

export interface ScenarioOption {
  id: string;
  title: string;
  action: string;
  monthlySavings: number;
  annualSavings: number;
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

export interface WhyNotSelectedExplanation {
  providerId: string;
  providerName: string;
  primaryReason: string;
  scoreDifferences: Array<{ metric: string; targetScore: number; alternativeScore: number }>;
  keyDeficiencies: string[];
  tradeoffSummary: string;
}

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

export interface DecisionReport {
  id: string;
  title: string;
  targetToolName: string;
  proposedAction: string;

  opportunityScore: OpportunityScore;
  executiveSummary: string;
  recommendation: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;

  stackVisualization: StackVisualization;
  rankedRecommendations: RankedRecommendation[];

  currentMonthlyCost: number;
  projectedMonthlyCost: number;
  monthlySavings: number;
  annualSavings: number;

  capabilityRetentionPercent: number;
  capabilitiesLost: string[];
  capabilitiesGained: string[];
  remainingCoveragePercent: number;

  featureMatrix: FeatureMatrixRow[];
  domainImpact: DomainImpact;
  operationalDeltas: OperationalDeltas;
  businessImpact: BusinessImpactSummary;
  developerImpact: string;
  enterpriseImpact: string;
  audienceGuidance: AudienceGuidance;
  migrationChecklist: MigrationChecklist;

  riskLevel: RiskLevel;
  riskFactors: string[];

  scenarios: ScenarioSimulation;
  whyNotSelected: WhyNotSelectedExplanation[];
  futureGrowthAnalysis: FutureGrowthAnalysis;
  trace: RecommendationTrace;
}

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
  monthlySavings: number;
  annualSavings: number;
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
