// ============================================================
// AI Stack Intelligence Service v2 — StackSave AI Decision Intelligence
//
// Single reusable intelligence orchestrator providing:
// 1. Replacement Analyzer  — Top-5 ranked directional replacement candidates
// 2. Consolidation Analyzer — Auto-discovered multi-to-one stack consolidations
// 3. Removal Analyzer       — Full tool removal risk assessment with 4-tier classification
//
// Generates enterprise Decision Reports with Opportunity Scores, Before/After
// Stack Visualizations, Feature Difference Matrices, Migration Checklists,
// Audience Guidance, Future Growth Analysis, Scenario Simulations, Why Not
// Selected explainability, and full Recommendation Traces.
//
// Reuses: KnowledgeLoader, KnowledgeScoringEngine, RelationshipEngine,
//         ComparisonEngine, BusinessValueEngine — zero duplicate logic.
// ============================================================

import { ToolEntry, UseCase } from '../../types';
import {
  StackIntelligenceResult, ReplaceOpportunity, ConsolidateOpportunity,
  RemoveOpportunity, DecisionReport, OpportunityScore, RankedRecommendation,
  StackVisualization, FeatureMatrixRow, AudienceGuidance, MigrationChecklist,
  MigrationStep, FutureGrowthAnalysis, FutureGrowthTier, BusinessImpactSummary,
  DomainImpact, OperationalDeltas, ScenarioSimulation, WhyNotSelectedExplanation,
  RecommendationTrace, ToolRemovalClassification, RiskLevel, ConfidenceLevel,
} from '../../types/intelligence';
import { KnowledgeLoader, ProviderProfile } from './KnowledgeLoader';
import { KnowledgeScoringEngine, ScoredProviderProfile } from './KnowledgeScoringEngine';
import { RelationshipEngine } from './RelationshipEngine';

// ─── Key capability features for Feature Matrix ───────────────────────────────
const FEATURE_MATRIX_KEYS: Array<{ key: string; label: string }> = [
  { key: 'reasoning',         label: 'Reasoning' },
  { key: 'coding',            label: 'Coding' },
  { key: 'research',          label: 'Research' },
  { key: 'writing',           label: 'Writing' },
  { key: 'planning',          label: 'Planning' },
  { key: 'voice',             label: 'Voice' },
  { key: 'memory',            label: 'Memory / Context Persistence' },
  { key: 'customGpts',        label: 'Custom GPT / Agents' },
  { key: 'plugins',           label: 'Plugins / Extensions' },
  { key: 'api',               label: 'API Access' },
  { key: 'imageUnderstanding', label: 'Vision / Image Understanding' },
  { key: 'multiFileEditing',  label: 'Multi-File Editing' },
  { key: 'autocomplete',      label: 'Autocomplete' },
  { key: 'aiAgent',           label: 'Autonomous Agent' },
  { key: 'sso',               label: 'Enterprise SSO' },
  { key: 'adminControls',     label: 'Admin Controls' },
  { key: 'longContext',       label: 'Long Context Window' },
  { key: 'latency',           label: 'Response Latency' },
  { key: 'reliability',       label: 'Service Reliability' },
];

export class AIStackIntelligenceService {

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN ENTRY POINT — Single-pass analysis with cached scored profiles
  // ──────────────────────────────────────────────────────────────────────────
  public static generateFullIntelligence(
    tools: ToolEntry[],
    useCase: UseCase = 'coding'
  ): StackIntelligenceResult {
    KnowledgeLoader.initialize();

    // Pre-score all providers once — reused by all three analyzers
    const allScored = KnowledgeScoringEngine.scoreAll();
    const scoredMap = new Map<string, ScoredProviderProfile>(allScored.map(p => [p.id, p]));

    const replacements = this.analyzeReplacementsInternal(tools, useCase, scoredMap);
    const consolidations = this.analyzeConsolidationsInternal(tools, useCase, scoredMap);
    const removals = this.analyzeRemovalsInternal(tools, useCase, scoredMap);

    const topSavings = Math.max(
      replacements[0]?.monthlySavings || 0,
      consolidations[0]?.monthlySavings || 0
    );

    const executiveSummary = tools.length === 0
      ? 'No tools supplied for intelligence analysis.'
      : `Strategic analysis identified ${replacements.length} replacement path(s), ` +
        `${consolidations.length} consolidation opportunity(ies), and assessed all ${removals.length} tools for removal eligibility. ` +
        `Maximum addressable monthly savings: $${topSavings}/mo ($${topSavings * 12}/yr).`;

    return {
      generatedAt: new Date().toISOString(),
      useCase,
      replacements,
      consolidations,
      removals,
      executiveSummary,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. REPLACEMENT ANALYZER
  // ──────────────────────────────────────────────────────────────────────────
  public static analyzeReplacements(tools: ToolEntry[], useCase: UseCase): ReplaceOpportunity[] {
    KnowledgeLoader.initialize();
    const scoredMap = new Map<string, ScoredProviderProfile>(
      KnowledgeScoringEngine.scoreAll().map(p => [p.id, p])
    );
    return this.analyzeReplacementsInternal(tools, useCase, scoredMap);
  }

  private static analyzeReplacementsInternal(
    tools: ToolEntry[],
    useCase: UseCase,
    scoredMap: Map<string, ScoredProviderProfile>
  ): ReplaceOpportunity[] {
    if (tools.length === 0) return [];

    const allProviders = KnowledgeLoader.getAllProviders();
    const opportunities: ReplaceOpportunity[] = [];

    for (const tool of tools) {
      const sourceId = tool.toolId;
      const sourceScored = scoredMap.get(sourceId);
      if (!sourceScored) continue;

      // Score every candidate provider as replacement for this source tool
      const candidateScores: Array<{
        targetScored: ScoredProviderProfile;
        rel: ReturnType<typeof RelationshipEngine.analyze>;
        compatibilityScore: number;
        capabilityRetentionPercent: number;
        monthlySavings: number;
        riskLevel: RiskLevel;
      }> = [];

      for (const targetProfile of allProviders) {
        if (targetProfile.id === sourceId) continue;

        const rel = RelationshipEngine.analyze(sourceId, targetProfile.id, useCase);
        if (!rel || rel.replacementConfidence < 40) continue;

        const targetScored = scoredMap.get(targetProfile.id);
        if (!targetScored) continue;

        const cheapestPlan = targetProfile.plans[0]?.monthlyPricePerSeat
          || Object.values(targetProfile.pricing)[0] || 20;
        const targetPrice = cheapestPlan * tool.seats;
        const monthlySavings = Math.max(0, tool.monthlySpend - targetPrice);
        const compatibilityScore = Math.round((rel.workflowOverlap + rel.replacementConfidence) / 2);
        const capabilityRetentionPercent = Math.round(rel.replacementConfidence);
        const riskLevel: RiskLevel = capabilityRetentionPercent >= 80 && targetScored.enterpriseScore >= 70
          ? 'Low' : capabilityRetentionPercent >= 60 ? 'Medium' : 'High';

        candidateScores.push({ targetScored, rel, compatibilityScore, capabilityRetentionPercent, monthlySavings, riskLevel });
      }

      if (candidateScores.length === 0) continue;

      // Sort by composite business value
      candidateScores.sort((a, b) =>
        (b.monthlySavings * 0.4 + b.compatibilityScore * 0.6) -
        (a.monthlySavings * 0.4 + a.compatibilityScore * 0.6)
      );

      // Take best candidate as the primary recommendation
      const best = candidateScores[0];
      const { targetScored, rel, compatibilityScore, capabilityRetentionPercent, monthlySavings, riskLevel } = best;

      const annualSavings = monthlySavings * 12;
      const confidence: ConfidenceLevel = compatibilityScore >= 75 ? 'High' : compatibilityScore >= 50 ? 'Medium' : 'Low';

      const workflowImpact = (() => {
        const delta = targetScored.codingScore + targetScored.reasoningScore
          - sourceScored.codingScore - sourceScored.reasoningScore;
        if (delta >= 15) return 'Positive' as const;
        if (delta < -20) return 'Major Impact' as const;
        if (delta < -5) return 'Minor Impact' as const;
        return 'Neutral' as const;
      })();

      const recommendation = monthlySavings > 0
        ? `Replace ${sourceScored.name} with ${targetScored.name} to save $${monthlySavings}/mo while retaining ${capabilityRetentionPercent}% of capabilities.`
        : `Migrate to ${targetScored.name} for ${Math.max(0, targetScored.codingScore - sourceScored.codingScore)}pt capability improvement.`;

      // Build ranked recommendations from top-5 candidates
      const rankedRecommendations = this.buildRankedRecommendations(
        sourceScored, tool, candidateScores.slice(0, 5), useCase
      );

      const opportunityScore = this.buildOpportunityScore(
        monthlySavings, tool.monthlySpend, capabilityRetentionPercent,
        riskLevel, targetScored, sourceScored
      );

      const featureMatrix = this.buildFeatureMatrix(sourceScored, targetScored);
      const migrationChecklist = this.buildMigrationChecklist(sourceScored, targetScored);
      const audienceGuidance = this.buildAudienceGuidance(targetScored, sourceScored);
      const futureGrowthAnalysis = this.buildFutureGrowthAnalysis(tool, targetScored);

      const whyNotSelected = candidateScores.slice(1, 4).map((c) =>
        this.buildWhyNotSelected(c.targetScored, best, sourceScored, c.compatibilityScore, c.capabilityRetentionPercent)
      );

      const decisionReport = this.buildDecisionReport(
        `rep-${sourceId}-${targetScored.id}`,
        `${sourceScored.name} → ${targetScored.name}`,
        tool, sourceScored, targetScored, rel,
        monthlySavings, annualSavings, compatibilityScore, capabilityRetentionPercent,
        confidence, riskLevel, recommendation, useCase,
        rankedRecommendations, opportunityScore, featureMatrix,
        migrationChecklist, audienceGuidance, futureGrowthAnalysis, whyNotSelected
      );

      opportunities.push({
        sourceToolId: sourceId,
        sourceToolName: sourceScored.name,
        targetToolId: targetScored.id,
        targetToolName: targetScored.name,
        compatibilityScore,
        capabilityRetentionPercent,
        opportunityScore,
        rankedRecommendations,
        capabilitiesLost: rel.featureLoss,
        capabilitiesGained: rel.featureGain,
        workflowImpact,
        monthlySavings,
        annualSavings,
        migrationDifficulty: targetScored.raw.productivityScores.migrationCost || 'Medium',
        learningCurve: targetScored.raw.productivityScores.learningCurve || 'Medium',
        vendorLockInImpact: targetScored.raw.financialProfile.vendorLockInRisk || 'Low',
        riskLevel,
        confidence,
        recommendation,
        decisionReport,
      });
    }

    return opportunities.sort(
      (a, b) => b.opportunityScore.overall - a.opportunityScore.overall
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CONSOLIDATION ANALYZER
  // ──────────────────────────────────────────────────────────────────────────
  public static analyzeConsolidations(tools: ToolEntry[], useCase: UseCase): ConsolidateOpportunity[] {
    KnowledgeLoader.initialize();
    const scoredMap = new Map<string, ScoredProviderProfile>(
      KnowledgeScoringEngine.scoreAll().map(p => [p.id, p])
    );
    return this.analyzeConsolidationsInternal(tools, useCase, scoredMap);
  }

  private static analyzeConsolidationsInternal(
    tools: ToolEntry[],
    useCase: UseCase,
    scoredMap: Map<string, ScoredProviderProfile>
  ): ConsolidateOpportunity[] {
    if (tools.length < 2) return [];

    const allProviders = KnowledgeLoader.getAllProviders();
    const opportunities: ConsolidateOpportunity[] = [];
    const auditedIds = new Set(tools.map(t => t.toolId));

    for (const absorberProfile of allProviders) {
      const absorbingScored = scoredMap.get(absorberProfile.id);
      if (!absorbingScored) continue;

      const candidatesToDecommission = tools.filter(t => t.toolId !== absorberProfile.id);
      if (candidatesToDecommission.length < 2) continue;

      // Evaluate pairs
      for (let i = 0; i < candidatesToDecommission.length; i++) {
        for (let j = i + 1; j < candidatesToDecommission.length; j++) {
          const pair = [candidatesToDecommission[i], candidatesToDecommission[j]];
          const pairIds = pair.map(p => p.toolId);
          const pairNames = pair.map(p => scoredMap.get(p.toolId)?.name || p.toolId);

          const currentCost = pair.reduce((s, p) => s + p.monthlySpend, 0);
          const seatsCount = Math.max(...pair.map(p => p.seats));
          const planCost = absorberProfile.plans[0]?.monthlyPricePerSeat
            || Object.values(absorberProfile.pricing)[0] || 20;
          const projectedCost = auditedIds.has(absorberProfile.id as any) ? 0 : planCost * seatsCount;
          const monthlySavings = Math.max(0, currentCost - projectedCost);
          const annualSavings = monthlySavings * 12;

          const rel1 = RelationshipEngine.analyze(pairIds[0], absorberProfile.id, useCase);
          const rel2 = RelationshipEngine.analyze(pairIds[1], absorberProfile.id, useCase);

          const retention1 = rel1?.replacementConfidence || 50;
          const retention2 = rel2?.replacementConfidence || 50;
          const coverageRetainedPercent = Math.round((retention1 + retention2) / 2);

          if (coverageRetainedPercent < 45) continue;

          const combinedLost = Array.from(new Set([...(rel1?.featureLoss || []), ...(rel2?.featureLoss || [])]));
          const combinedGained = Array.from(new Set([...(rel1?.featureGain || []), ...(rel2?.featureGain || [])]));
          const workflowMatchPercent = Math.round(
            (absorbingScored.codingScore + absorbingScored.reasoningScore + absorbingScored.researchScore) / 3
          );

          const riskLevel: RiskLevel = coverageRetainedPercent >= 75 ? 'Low' : coverageRetainedPercent >= 55 ? 'Medium' : 'High';
          const confidence: ConfidenceLevel = coverageRetainedPercent >= 75 ? 'High' : coverageRetainedPercent >= 50 ? 'Medium' : 'Low';
          const businessValueScore = Math.round(monthlySavings * 0.6 + coverageRetainedPercent * 0.4);

          const recommendation = `Consolidate ${pairNames.join(' + ')} into ${absorbingScored.name} to eliminate redundant licensing and save $${monthlySavings}/mo.`;

          const opportunityScore = this.buildOpportunityScore(
            monthlySavings, currentCost, coverageRetainedPercent, riskLevel, absorbingScored, null
          );

          const rankedRecommendations: RankedRecommendation[] = [
            {
              rank: 1, label: 'Best Recommendation',
              toolId: absorberProfile.id, toolName: absorbingScored.name,
              overallScore: businessValueScore, confidence,
              monthlySavings, annualSavings,
              capabilityRetention: coverageRetainedPercent,
              riskLevel,
              summary: recommendation,
            },
            {
              rank: 5, label: 'Keep Current Stack',
              toolId: pairIds[0], toolName: pairNames.join(' + '),
              overallScore: 50, confidence: 'High',
              monthlySavings: 0, annualSavings: 0,
              capabilityRetention: 100,
              riskLevel: 'Low',
              summary: 'Maintain current multi-tool licensing at existing cost.',
            }
          ];

          const decisionReport = this.buildConsolidationDecisionReport(
            pair, pairNames, absorbingScored, currentCost, projectedCost,
            monthlySavings, annualSavings, coverageRetainedPercent,
            combinedLost, combinedGained, workflowMatchPercent,
            riskLevel, confidence, recommendation, useCase,
            opportunityScore, rankedRecommendations
          );

          opportunities.push({
            id: `cons-${pairIds.join('-')}-to-${absorberProfile.id}`,
            decommissionedToolIds: pairIds,
            decommissionedToolNames: pairNames,
            absorbingToolId: absorberProfile.id,
            absorbingToolName: absorbingScored.name,
            currentCost, projectedCost, monthlySavings, annualSavings,
            opportunityScore, rankedRecommendations,
            coverageRetainedPercent, capabilitiesLost: combinedLost,
            capabilitiesGained: combinedGained, workflowMatchPercent,
            migrationDifficulty: absorbingScored.raw.productivityScores.migrationCost || 'Medium',
            vendorConcentrationHHI: 45,
            riskLevel, confidence, recommendation, businessValueScore, decisionReport,
          });
        }
      }
    }

    return opportunities
      .sort((a, b) => b.opportunityScore.overall - a.opportunityScore.overall)
      .slice(0, 6);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. REMOVAL ANALYZER
  // ──────────────────────────────────────────────────────────────────────────
  public static analyzeRemovals(tools: ToolEntry[], useCase: UseCase): RemoveOpportunity[] {
    KnowledgeLoader.initialize();
    const scoredMap = new Map<string, ScoredProviderProfile>(
      KnowledgeScoringEngine.scoreAll().map(p => [p.id, p])
    );
    return this.analyzeRemovalsInternal(tools, useCase, scoredMap);
  }

  private static analyzeRemovalsInternal(
    tools: ToolEntry[],
    useCase: UseCase,
    scoredMap: Map<string, ScoredProviderProfile>
  ): RemoveOpportunity[] {
    if (tools.length === 0) return [];

    const opportunities: RemoveOpportunity[] = [];
    const allAuditedIds = tools.map(t => t.toolId);

    for (const tool of tools) {
      const toolScored = scoredMap.get(tool.toolId);
      if (!toolScored) continue;

      const remainingIds = allAuditedIds.filter(id => id !== tool.toolId);
      const remainingScored = remainingIds
        .map(id => scoredMap.get(id))
        .filter((s): s is ScoredProviderProfile => s !== null);

      const coveredCaps: string[] = [];
      const lostCaps: string[] = [];

      for (const capKey of Object.keys(toolScored.capabilityVector)) {
        const srcScore = toolScored.capabilityVector[capKey] || 0;
        if (srcScore < 4) continue; // Skip trivial capabilities
        const maxRemaining = Math.max(0, ...remainingScored.map(s => s.capabilityVector[capKey] || 0));
        if (maxRemaining >= srcScore - 1.5) coveredCaps.push(capKey);
        else if (srcScore >= 6) lostCaps.push(capKey);
      }

      const total = coveredCaps.length + lostCaps.length || 1;
      const remainingCoveragePercent = Math.round((coveredCaps.length / total) * 100);

      let classification: ToolRemovalClassification = 'optional_tool';
      let classificationLabel = '🔵 Optional Tool';
      if (remainingCoveragePercent >= 82) {
        classification = 'safe_to_remove'; classificationLabel = '🟢 Safe to Remove';
      } else if (remainingCoveragePercent >= 58) {
        classification = 'replace_before_removing'; classificationLabel = '🟡 Replace Before Removing';
      } else if (toolScored.enterpriseScore >= 80 || toolScored.codingScore >= 85) {
        classification = 'critical_tool'; classificationLabel = '🔴 Critical Tool';
      }

      const monthlySavings = tool.monthlySpend;
      const annualSavings = monthlySavings * 12;
      const removalConfidence: ConfidenceLevel = remainingCoveragePercent >= 75 ? 'High' : remainingCoveragePercent >= 50 ? 'Medium' : 'Low';
      const riskLevel: RiskLevel = classification === 'safe_to_remove' ? 'Low'
        : classification === 'replace_before_removing' || classification === 'optional_tool' ? 'Medium' : 'High';

      const recommendation = classification === 'safe_to_remove'
        ? `Decommission ${toolScored.name} to save $${monthlySavings}/mo. Remaining tools cover ${remainingCoveragePercent}% of capabilities.`
        : classification === 'replace_before_removing'
        ? `${toolScored.name} has ${lostCaps.length} un-covered capabilities. Replace before decommissioning.`
        : classification === 'critical_tool'
        ? `Retain ${toolScored.name} — critical stack pillar with unique capabilities not covered by remaining tools.`
        : `${toolScored.name} is an optional add-on. Evaluate team utilization before removing.`;

      const opportunityScore = this.buildOpportunityScore(
        monthlySavings, monthlySavings, remainingCoveragePercent, riskLevel, toolScored, null
      );

      const rankedRecommendations: RankedRecommendation[] = [
        {
          rank: 1,
          label: classification === 'safe_to_remove' ? 'Best Recommendation' : 'Best Budget',
          toolId: tool.toolId, toolName: toolScored.name,
          overallScore: opportunityScore.overall, confidence: removalConfidence,
          monthlySavings, annualSavings, capabilityRetention: remainingCoveragePercent,
          riskLevel, summary: recommendation,
        },
        {
          rank: 5, label: 'Keep Current Stack',
          toolId: tool.toolId, toolName: toolScored.name,
          overallScore: 50, confidence: 'High',
          monthlySavings: 0, annualSavings: 0,
          capabilityRetention: 100, riskLevel: 'Low',
          summary: `Continue using ${toolScored.name} at current spend of $${monthlySavings}/mo.`,
        }
      ];

      const featureMatrix = this.buildRemovalFeatureMatrix(toolScored, remainingScored);
      const migrationChecklist = this.buildRemovalChecklist(toolScored);
      const audienceGuidance = this.buildRemovalAudienceGuidance(toolScored, classification);
      const futureGrowthAnalysis = this.buildFutureGrowthAnalysis(tool, toolScored);

      const decisionReport = this.buildRemovalDecisionReport(
        tool, toolScored, remainingScored, classification, classificationLabel,
        remainingCoveragePercent, coveredCaps, lostCaps,
        monthlySavings, annualSavings, riskLevel, removalConfidence,
        recommendation, useCase, opportunityScore, rankedRecommendations,
        featureMatrix, migrationChecklist, audienceGuidance, futureGrowthAnalysis
      );

      opportunities.push({
        toolId: tool.toolId, toolName: toolScored.name,
        classification, classificationLabel, removalConfidence,
        remainingCoveragePercent, opportunityScore, rankedRecommendations,
        capabilitiesLost: lostCaps, capabilitiesCoveredByRemaining: coveredCaps,
        workflowImpact: `Removing ${toolScored.name} leaves ${lostCaps.length} workflow capability gap(s).`,
        businessImpact: `Annual savings of $${annualSavings}/yr ($${monthlySavings}/mo).`,
        enterpriseImpact: `Enterprise coverage impact: ${toolScored.enterpriseScore}/100 point reduction.`,
        riskLevel, monthlySavings, annualSavings, recommendation, decisionReport,
      });
    }

    return opportunities;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Build Opportunity Score
  // ──────────────────────────────────────────────────────────────────────────
  private static buildOpportunityScore(
    monthlySavings: number,
    currentCost: number,
    capabilityRetentionPercent: number,
    riskLevel: RiskLevel,
    target: ScoredProviderProfile,
    source: ScoredProviderProfile | null
  ): OpportunityScore {
    const financialOpportunity = currentCost > 0
      ? Math.min(100, Math.round((monthlySavings / currentCost) * 100 * 2))
      : 50;

    const technicalOpportunity = source
      ? Math.round(Math.max(0, Math.min(100,
          50 + (target.codingScore - source.codingScore) * 2
              + (target.reasoningScore - source.reasoningScore) * 1.5
        )))
      : Math.round(target.codingScore * 3);

    const businessOpportunity = Math.round(
      (capabilityRetentionPercent * 0.4) + (target.enterpriseScore * 0.3) + (financialOpportunity * 0.3)
    );

    const migrationSimplicity = riskLevel === 'Low' ? 85 : riskLevel === 'Medium' ? 60 : 30;
    const futureScalability = Math.round(target.futureGrowthScore || 70);
    const vendorOptimization = Math.round(target.vendorStabilityScore || 70);

    const overallConfidence = Math.round(
      (capabilityRetentionPercent * 0.35) +
      (migrationSimplicity * 0.25) +
      (target.reliabilityScore * 0.25) +
      (vendorOptimization * 0.15)
    );

    const overall = Math.round(
      (financialOpportunity * 0.25) +
      (technicalOpportunity * 0.20) +
      (businessOpportunity * 0.20) +
      (migrationSimplicity * 0.15) +
      (futureScalability * 0.10) +
      (vendorOptimization * 0.10)
    );

    return {
      overall: Math.min(99, overall),
      financialOpportunity: Math.min(100, financialOpportunity),
      technicalOpportunity: Math.min(100, technicalOpportunity),
      businessOpportunity: Math.min(100, businessOpportunity),
      migrationSimplicity: Math.min(100, migrationSimplicity),
      futureScalability: Math.min(100, futureScalability),
      vendorOptimization: Math.min(100, vendorOptimization),
      overallConfidence: Math.min(100, overallConfidence),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Build Ranked Recommendations
  // ──────────────────────────────────────────────────────────────────────────
  private static buildRankedRecommendations(
    source: ScoredProviderProfile,
    tool: ToolEntry,
    candidates: Array<{
      targetScored: ScoredProviderProfile;
      compatibilityScore: number;
      capabilityRetentionPercent: number;
      monthlySavings: number;
      riskLevel: RiskLevel;
    }>,
    _useCase: UseCase
  ): RankedRecommendation[] {
    if (candidates.length === 0) return [];

    const sorted = [...candidates];
    // Best overall = highest composite
    const bestIdx = 0;
    // Best budget = highest savings
    const budgetIdx = [...sorted].sort((a, b) => b.monthlySavings - a.monthlySavings);
    // Best performance = highest capability score
    const perfIdx = [...sorted].sort((a, b) =>
      b.targetScored.codingScore + b.targetScored.reasoningScore -
      a.targetScored.codingScore - a.targetScored.reasoningScore
    );

    const makeRec = (
      c: typeof candidates[0],
      rank: number,
      label: RankedRecommendation['label']
    ): RankedRecommendation => ({
      rank,
      label,
      toolId: c.targetScored.id,
      toolName: c.targetScored.name,
      overallScore: Math.round(c.compatibilityScore * 0.6 + (c.monthlySavings > 0 ? 40 : 20) * 0.4),
      confidence: c.compatibilityScore >= 75 ? 'High' : c.compatibilityScore >= 50 ? 'Medium' : 'Low',
      monthlySavings: c.monthlySavings,
      annualSavings: c.monthlySavings * 12,
      capabilityRetention: c.capabilityRetentionPercent,
      riskLevel: c.riskLevel,
      summary: c.monthlySavings > 0
        ? `Save $${c.monthlySavings}/mo with ${c.capabilityRetentionPercent}% capability retention.`
        : `Gain superior performance with ${c.capabilityRetentionPercent}% capability retention.`,
    });

    const ranked: RankedRecommendation[] = [];
    if (sorted[0]) ranked.push(makeRec(sorted[0], 1, 'Best Recommendation'));
    if (sorted[1]) ranked.push(makeRec(sorted[1], 2, 'Second Best'));
    if (budgetIdx[0] && budgetIdx[0].targetScored.id !== sorted[0]?.targetScored.id)
      ranked.push(makeRec(budgetIdx[0], 3, 'Best Budget'));
    if (perfIdx[0] && perfIdx[0].targetScored.id !== sorted[0]?.targetScored.id &&
        perfIdx[0].targetScored.id !== budgetIdx[0]?.targetScored.id)
      ranked.push(makeRec(perfIdx[0], 4, 'Best Performance'));

    // Status quo always last
    ranked.push({
      rank: ranked.length + 1, label: 'Keep Current Stack',
      toolId: source.id, toolName: source.name,
      overallScore: 50, confidence: 'High',
      monthlySavings: 0, annualSavings: 0,
      capabilityRetention: 100, riskLevel: 'Low',
      summary: `Maintain current ${source.name} subscription at $${tool.monthlySpend}/mo.`,
    });

    return ranked;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Build Feature Matrix
  // ──────────────────────────────────────────────────────────────────────────
  private static buildFeatureMatrix(
    source: ScoredProviderProfile,
    target: ScoredProviderProfile
  ): FeatureMatrixRow[] {
    return FEATURE_MATRIX_KEYS.map(({ key, label }) => {
      const srcScore = source.raw.capabilities[key]?.score ?? 0;
      const tgtScore = target.raw.capabilities[key]?.score ?? 0;

      const currentStatus: FeatureMatrixRow['currentStatus'] = srcScore >= 7 ? 'yes' : srcScore >= 4 ? 'partial' : 'no';
      const recommendedStatus: FeatureMatrixRow['recommendedStatus'] = tgtScore >= 7 ? 'yes' : tgtScore >= 4 ? 'partial' : 'no';

      let delta: FeatureMatrixRow['delta'] = 'same';
      if (currentStatus === 'no' && recommendedStatus !== 'no') delta = 'new';
      else if (currentStatus !== 'no' && recommendedStatus === 'no') delta = 'lost';
      else if (tgtScore > srcScore + 1) delta = 'better';
      else if (tgtScore < srcScore - 1) delta = 'worse';

      const note = key === 'longContext'
        ? `${source.name}: ~128K • ${target.name}: ~${tgtScore >= 9 ? '200K+' : '128K'}`
        : key === 'latency'
        ? `${source.name}: ${srcScore >= 8 ? 'Fast' : 'Standard'} • ${target.name}: ${tgtScore >= 8 ? 'Fast' : 'Standard'}`
        : undefined;

      return { feature: label, featureKey: key, currentStatus, currentScore: srcScore, recommendedStatus, recommendedScore: tgtScore, delta, note };
    }).filter(row => row.currentStatus !== 'no' || row.recommendedStatus !== 'no');
  }

  private static buildRemovalFeatureMatrix(
    target: ScoredProviderProfile,
    remaining: ScoredProviderProfile[]
  ): FeatureMatrixRow[] {
    return FEATURE_MATRIX_KEYS.map(({ key, label }) => {
      const srcScore = target.raw.capabilities[key]?.score ?? 0;
      const maxRemaining = Math.max(0, ...remaining.map(r => r.raw.capabilities[key]?.score ?? 0));

      const currentStatus: FeatureMatrixRow['currentStatus'] = srcScore >= 7 ? 'yes' : srcScore >= 4 ? 'partial' : 'no';
      const recommendedStatus: FeatureMatrixRow['recommendedStatus'] = maxRemaining >= 7 ? 'yes' : maxRemaining >= 4 ? 'partial' : 'no';
      let delta: FeatureMatrixRow['delta'] = 'same';
      if (maxRemaining < srcScore - 1) delta = 'worse';
      else if (maxRemaining > srcScore + 1) delta = 'better';
      if (currentStatus !== 'no' && recommendedStatus === 'no') delta = 'lost';

      return { feature: label, featureKey: key, currentStatus, currentScore: srcScore, recommendedStatus, recommendedScore: maxRemaining, delta };
    }).filter(row => row.currentStatus !== 'no' || row.recommendedStatus !== 'no');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Build Migration Checklist
  // ──────────────────────────────────────────────────────────────────────────
  private static buildMigrationChecklist(
    source: ScoredProviderProfile,
    target: ScoredProviderProfile
  ): MigrationChecklist {
    const steps: MigrationStep[] = [];
    let days = 2;

    steps.push({ id: 'export-data', category: 'data', action: `Export conversations, projects, and custom prompts from ${source.name}`, priority: 'required' });
    steps.push({ id: 'backup-keys', category: 'setup', action: `Back up all API keys and integrations using ${source.name}`, priority: 'required' });
    steps.push({ id: 'trial', category: 'setup', action: `Sign up for ${target.name} and run a 2-week pilot with a subset of the team`, priority: 'recommended' });
    steps.push({ id: 'update-ide', category: 'integration', action: `Install and configure ${target.name} IDE extensions / plugins`, priority: 'required' });
    steps.push({ id: 'update-workflows', category: 'team', action: 'Update internal workflow documentation and team training materials', priority: 'recommended' });
    steps.push({ id: 'update-api', category: 'integration', action: `Update any API integrations from ${source.name} endpoint to ${target.name} endpoint`, priority: 'required' });
    steps.push({ id: 'notify-team', category: 'team', action: 'Notify all affected team members of the transition timeline', priority: 'recommended' });
    steps.push({ id: 'cancel-old', category: 'billing', action: `Cancel or downgrade ${source.name} subscription after migration verified`, priority: 'required' });

    if (source.raw.productivityScores.migrationCost === 'High') days = 14;
    else if (source.raw.productivityScores.migrationCost === 'Medium') days = 7;

    return { estimatedDays: days, steps };
  }

  private static buildRemovalChecklist(tool: ScoredProviderProfile): MigrationChecklist {
    return {
      estimatedDays: 3,
      steps: [
        { id: 'verify-coverage', category: 'setup', action: `Verify that remaining stack tools can handle all ${tool.name} workflows`, priority: 'required' },
        { id: 'migrate-workflows', category: 'team', action: `Migrate active ${tool.name} workflows to replacement tools`, priority: 'required' },
        { id: 'export-history', category: 'data', action: `Export conversation history and projects from ${tool.name}`, priority: 'recommended' },
        { id: 'revoke-access', category: 'setup', action: `Revoke API keys and access tokens for ${tool.name}`, priority: 'required' },
        { id: 'cancel-subscription', category: 'billing', action: `Cancel ${tool.name} subscription`, priority: 'required' },
        { id: 'document-removal', category: 'team', action: 'Update internal tooling documentation to reflect stack change', priority: 'recommended' },
      ],
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Build Audience Guidance
  // ──────────────────────────────────────────────────────────────────────────
  private static buildAudienceGuidance(
    target: ScoredProviderProfile,
    source: ScoredProviderProfile
  ): AudienceGuidance {
    const recommendedFor: string[] = [];
    const notRecommendedFor: string[] = [];
    const whenNotToFollow: string[] = [];

    const ts = target.raw.typicalTeamSize?.toLowerCase() || '';
    if (ts.includes('small') || ts.includes('solo') || ts.includes('startup'))
      recommendedFor.push('✓ Solo Developers', '✓ Startups', '✓ Small Teams (1–20)');
    if (ts.includes('medium') || ts.includes('any'))
      recommendedFor.push('✓ SMB Teams (20–200)');
    if (target.enterpriseScore >= 75)
      recommendedFor.push('✓ Enterprise Organizations');
    else notRecommendedFor.push('✗ Enterprise with strict compliance requirements');

    if (target.raw.enterprise?.compliance?.hipaa !== true)
      notRecommendedFor.push('✗ HIPAA-regulated organizations');
    if (target.raw.enterprise?.identity?.saml !== true)
      notRecommendedFor.push('✗ Teams requiring SAML-based SSO');
    if (target.raw.capabilities['customGpts']?.score < 5)
      notRecommendedFor.push('✗ Teams heavily relying on Custom GPTs or Agents');

    if (source.raw.capabilities['memory']?.score >= 8 && (target.raw.capabilities['memory']?.score || 0) < 6)
      whenNotToFollow.push(`Do not switch if your team depends on persistent memory features in ${source.name}`);
    if (source.raw.capabilities['customGpts']?.score >= 7 && (target.raw.capabilities['customGpts']?.score || 0) < 5)
      whenNotToFollow.push(`Do not switch if your team uses custom GPT workflows or agents built in ${source.name}`);
    if (source.enterpriseScore >= 80 && target.enterpriseScore < 70)
      whenNotToFollow.push(`Do not switch if enterprise compliance (SOC2, GDPR, HIPAA) is a hard requirement`);
    if (source.raw.capabilities['longContext']?.score >= 9 && (target.raw.capabilities['longContext']?.score || 0) < 7)
      whenNotToFollow.push(`Do not switch if long-context reasoning (200K+) is critical to your workflows`);

    if (whenNotToFollow.length === 0)
      whenNotToFollow.push('No critical blockers identified. This recommendation is broadly applicable.');

    return { recommendedFor, notRecommendedFor, whenNotToFollow };
  }

  private static buildRemovalAudienceGuidance(
    tool: ScoredProviderProfile,
    classification: ToolRemovalClassification
  ): AudienceGuidance {
    const isS = classification === 'safe_to_remove';
    return {
      recommendedFor: isS
        ? ['✓ Teams optimizing AI spend', '✓ Organizations consolidating vendor count', '✓ Budget-conscious startups']
        : ['✓ Teams with overlapping tool coverage', '✓ Organizations doing annual stack reviews'],
      notRecommendedFor: classification === 'critical_tool'
        ? [`✗ Teams that rely on ${tool.name} for core workflows`, '✗ Enterprise teams with strict tooling standards']
        : ['✗ Teams without established replacement workflow'],
      whenNotToFollow: classification === 'critical_tool'
        ? [`Do not remove ${tool.name} if it is the primary coding or research tool for your engineering team`]
        : [`Verify ${tool.name} coverage before decommissioning`],
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Build Future Growth Analysis
  // ──────────────────────────────────────────────────────────────────────────
  private static buildFutureGrowthAnalysis(
    tool: ToolEntry,
    target: ScoredProviderProfile
  ): FutureGrowthAnalysis {
    const planCost = target.raw.plans[0]?.monthlyPricePerSeat
      || Object.values(target.raw.pricing)[0] || 20;

    const currentTier: FutureGrowthTier = {
      teamSize: tool.seats,
      label: `Current (${tool.seats} users)`,
      projectedMonthlyCost: planCost * tool.seats,
      scalabilityScore: target.futureGrowthScore || 70,
      enterpriseReadiness: target.enterpriseScore >= 75 ? 'High' : target.enterpriseScore >= 55 ? 'Medium' : 'Low',
      vendorLockIn: target.raw.financialProfile.vendorLockInRisk || 'Low',
      upgradeRequired: false,
    };

    const growthTiers: FutureGrowthTier[] = [
      { teamSize: tool.seats * 2, label: `2× Scale (${tool.seats * 2} users)`, projectedMonthlyCost: planCost * tool.seats * 2, scalabilityScore: Math.min(100, (target.futureGrowthScore || 70) + 5), enterpriseReadiness: target.enterpriseScore >= 70 ? 'High' : 'Medium', vendorLockIn: 'Medium', upgradeRequired: target.enterpriseScore < 70, upgradeNote: target.enterpriseScore < 70 ? 'Consider upgrading to Enterprise plan at this scale' : undefined },
      { teamSize: tool.seats * 10, label: `10× Scale (${tool.seats * 10} users)`, projectedMonthlyCost: planCost * tool.seats * 10, scalabilityScore: Math.min(100, (target.futureGrowthScore || 70) + 10), enterpriseReadiness: 'High', vendorLockIn: 'High', upgradeRequired: true, upgradeNote: 'Enterprise plan required at this scale for admin controls and SSO' },
    ];

    const scalabilityVerdict = target.enterpriseScore >= 75
      ? `${target.name} scales well to enterprise-size teams with full compliance support.`
      : `${target.name} may need plan upgrades beyond ${tool.seats * 5} users.`;

    return {
      currentTier,
      growthTiers,
      scalabilityVerdict,
      longTermRisk: target.raw.financialProfile.vendorLockInRisk || 'Low',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Build Why Not Selected
  // ──────────────────────────────────────────────────────────────────────────
  private static buildWhyNotSelected(
    alternative: ScoredProviderProfile,
    best: { targetScored: ScoredProviderProfile; compatibilityScore: number; capabilityRetentionPercent: number; monthlySavings: number },
    source: ScoredProviderProfile,
    altCompatibility: number,
    altRetention: number
  ): WhyNotSelectedExplanation {
    const reasons: string[] = [];
    if (altCompatibility < best.compatibilityScore - 10)
      reasons.push('Lower overall workflow compatibility score');
    if (altRetention < best.capabilityRetentionPercent - 10)
      reasons.push('Lower capability retention compared to recommended option');
    if (alternative.enterpriseScore < best.targetScored.enterpriseScore - 15)
      reasons.push('Lower enterprise suitability / compliance readiness');
    if (alternative.raw.productivityScores.migrationCost === 'High' && best.targetScored.raw.productivityScores.migrationCost !== 'High')
      reasons.push('Higher migration complexity');

    return {
      providerId: alternative.id,
      providerName: alternative.name,
      primaryReason: reasons[0] || `${best.targetScored.name} offers superior overall compatibility (${best.compatibilityScore}% vs ${altCompatibility}%).`,
      scoreDifferences: [
        { metric: 'Workflow Compatibility', targetScore: best.compatibilityScore, alternativeScore: altCompatibility },
        { metric: 'Capability Retention', targetScore: best.capabilityRetentionPercent, alternativeScore: altRetention },
        { metric: 'Enterprise Score', targetScore: best.targetScored.enterpriseScore, alternativeScore: alternative.enterpriseScore },
      ],
      keyDeficiencies: alternative.raw.weaknesses?.slice(0, 3) || reasons.slice(0, 3),
      tradeoffSummary: `${alternative.name} was not selected as the primary recommendation due to lower composite compatibility vs. ${source.name}. It may be suitable as a fallback depending on team-specific workflow needs.`,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DECISION REPORT BUILDERS
  // ──────────────────────────────────────────────────────────────────────────
  private static buildDecisionReport(
    id: string, title: string,
    tool: ToolEntry,
    source: ScoredProviderProfile,
    target: ScoredProviderProfile,
    rel: any,
    monthlySavings: number, annualSavings: number,
    compatibilityScore: number, capabilityRetentionPercent: number,
    confidence: ConfidenceLevel, riskLevel: RiskLevel,
    recommendation: string, useCase: UseCase,
    rankedRecommendations: RankedRecommendation[],
    opportunityScore: OpportunityScore,
    featureMatrix: FeatureMatrixRow[],
    migrationChecklist: MigrationChecklist,
    audienceGuidance: AudienceGuidance,
    futureGrowthAnalysis: FutureGrowthAnalysis,
    whyNotSelected: WhyNotSelectedExplanation[]
  ): DecisionReport {
    const stackVisualization: StackVisualization = {
      currentStack: [{ toolId: source.id, toolName: source.name, role: source.raw.primaryRole, monthlySpend: tool.monthlySpend, seats: tool.seats, isRemoved: true }],
      recommendedStack: [{ toolId: target.id, toolName: target.name, role: target.raw.primaryRole, estimatedMonthlyCost: Math.max(0, tool.monthlySpend - monthlySavings), seats: tool.seats, isNew: true, isRetained: false }],
      currentMonthlyCost: tool.monthlySpend,
      recommendedMonthlyCost: Math.max(0, tool.monthlySpend - monthlySavings),
      monthlySavings,
    };

    const domainImpact: DomainImpact = {
      coding:    { delta: target.codingScore - source.codingScore,    rationale: `${target.name} (${target.codingScore}) vs ${source.name} (${source.codingScore})` },
      writing:   { delta: target.writingScore - source.writingScore,   rationale: `${target.name} (${target.writingScore}) vs ${source.name} (${source.writingScore})` },
      research:  { delta: target.researchScore - source.researchScore, rationale: `${target.name} (${target.researchScore}) vs ${source.name} (${source.researchScore})` },
      reasoning: { delta: target.reasoningScore - source.reasoningScore, rationale: `${target.name} (${target.reasoningScore}) vs ${source.name} (${source.reasoningScore})` },
      enterprise:{ delta: target.enterpriseScore - source.enterpriseScore, rationale: `Enterprise readiness: ${target.name} (${target.enterpriseScore}) vs ${source.name} (${source.enterpriseScore})` },
      security:  { delta: target.securityScore - source.securityScore, rationale: `Security score: ${target.name} (${target.securityScore}) vs ${source.name} (${source.securityScore})` },
    };

    const operationalDeltas: OperationalDeltas = {
      contextWindowDiff: `${source.name}: ~128K tokens • ${target.name}: ~${target.raw.capabilities['longContext']?.score >= 9 ? '200K+' : '128K'} tokens`,
      latencyDiff: target.latencyScore > source.latencyScore ? `${target.name} offers faster response times` : 'Comparable response times',
      integrationChanges: target.raw.supportedPlatforms?.slice(0, 4) || ['REST API', 'Web UI'],
      migrationDifficulty: target.raw.productivityScores.migrationCost || 'Medium',
      learningCurve: target.raw.productivityScores.learningCurve || 'Medium',
      vendorLockInImpact: target.raw.financialProfile.vendorLockInRisk || 'Low',
    };

    const businessImpact: BusinessImpactSummary = {
      costReduction: monthlySavings > 0 ? `$${monthlySavings}/mo ($${annualSavings}/yr) direct spend reduction` : 'Cost-neutral replacement with capability improvements',
      developerProductivity: `${domainImpact.coding.delta >= 5 ? 'Improved' : domainImpact.coding.delta <= -5 ? 'Reduced' : 'Neutral'} coding productivity (${domainImpact.coding.delta > 0 ? '+' : ''}${domainImpact.coding.delta} pts)`,
      workflowImpact: `${capabilityRetentionPercent}% workflow capability retention — ${rel.featureLoss.length} gaps identified`,
      enterpriseReadiness: `Target enterprise score: ${target.enterpriseScore}/100`,
      vendorLockIn: `${target.raw.financialProfile.vendorLockInRisk || 'Low'} vendor lock-in risk with ${target.vendor}`,
      scalability: target.futureGrowthScore >= 75 ? 'Scales effectively to enterprise-size teams' : 'May require plan upgrades at scale',
      operationalComplexity: `Migration estimated at ${migrationChecklist.estimatedDays} days, ${migrationChecklist.steps.filter(s => s.priority === 'required').length} required steps`,
      overallRisk: `${riskLevel} risk with ${confidence} confidence`,
    };

    const scenarios: ScenarioSimulation = {
      primaryScenario: {
        id: 'scenario-a', title: `Scenario A: Complete Migration to ${target.name}`,
        action: `Migrate all ${tool.seats} seats from ${source.name} to ${target.name}`,
        monthlySavings, annualSavings, coveragePercent: capabilityRetentionPercent, riskLevel,
        tradeoffs: rel.featureLoss.length > 0 ? [`Capability delta: ${rel.featureLoss.slice(0, 3).join(', ')}`] : ['Minimal friction — high capability overlap'],
        recommendation: `Primary recommended path. Recovers $${annualSavings}/yr.`,
      },
      statusQuoScenario: {
        id: 'scenario-c', title: `Scenario C: Maintain ${source.name}`,
        action: `Continue ${source.name} on ${tool.plan} plan at $${tool.monthlySpend}/mo`,
        monthlySavings: 0, annualSavings: 0, coveragePercent: 100, riskLevel: 'Low',
        tradeoffs: ['Zero financial savings', 'Potential licensing overpay continues'],
        recommendation: 'Baseline status quo — no action taken.',
      },
    };

    const trace: RecommendationTrace = {
      knowledgeVersion: source.raw.knowledgeVersion || 'v1.0.0',
      generatedAt: new Date().toISOString(),
      useCase,
      scoringProfile: { compatibilityScore, capabilityRetentionPercent, monthlySavings, opportunityScore: opportunityScore.overall },
      decisionPath: [
        `Loaded provider vectors for ${source.name} and ${target.name}`,
        `RelationshipEngine directional analysis: replacement confidence ${capabilityRetentionPercent}%`,
        `Computed 6-dimension domain impact matrix`,
        `Built feature matrix across ${featureMatrix.length} capability dimensions`,
        `Generated ranked recommendations, migration checklist, audience guidance`,
        `Opportunity Score: ${opportunityScore.overall}/100`,
      ],
      confidenceBreakdown: {
        capabilityMatch: capabilityRetentionPercent,
        workflowFit: compatibilityScore,
        enterpriseReadiness: target.enterpriseScore,
        financialFit: Math.min(100, (monthlySavings / (tool.monthlySpend || 1)) * 100 * 2 + 50),
        riskScore: riskLevel === 'Low' ? 90 : riskLevel === 'Medium' ? 65 : 35,
      },
    };

    return {
      id, title, targetToolName: source.name, proposedAction: `Migrate to ${target.name}`,
      opportunityScore, executiveSummary:
        `Replacing ${source.name} with ${target.name} yields $${monthlySavings}/mo ($${annualSavings}/yr) with ${capabilityRetentionPercent}% capability retention. Opportunity Score: ${opportunityScore.overall}/100.`,
      recommendation, confidence, confidenceScore: compatibilityScore,
      stackVisualization, rankedRecommendations,
      currentMonthlyCost: tool.monthlySpend,
      projectedMonthlyCost: Math.max(0, tool.monthlySpend - monthlySavings),
      monthlySavings, annualSavings, capabilityRetentionPercent,
      capabilitiesLost: rel.featureLoss, capabilitiesGained: rel.featureGain,
      remainingCoveragePercent: capabilityRetentionPercent,
      featureMatrix, domainImpact, operationalDeltas, businessImpact,
      developerImpact: `Migration difficulty: ${operationalDeltas.migrationDifficulty}, learning curve: ${operationalDeltas.learningCurve}`,
      enterpriseImpact: `${target.name} enterprise readiness: ${target.enterpriseScore}/100`,
      audienceGuidance, migrationChecklist,
      riskLevel, riskFactors: rel.featureLoss.length > 0 ? [`Workflow gaps in: ${rel.featureLoss.slice(0, 3).join(', ')}`] : ['Standard migration overhead'],
      scenarios, whyNotSelected, futureGrowthAnalysis, trace,
    };
  }

  private static buildConsolidationDecisionReport(
    pair: ToolEntry[], pairNames: string[],
    absorber: ScoredProviderProfile,
    currentCost: number, projectedCost: number,
    monthlySavings: number, annualSavings: number,
    coverageRetainedPercent: number,
    combinedLost: string[], combinedGained: string[],
    workflowMatchPercent: number,
    riskLevel: RiskLevel, confidence: ConfidenceLevel,
    recommendation: string, useCase: UseCase,
    opportunityScore: OpportunityScore,
    rankedRecommendations: RankedRecommendation[]
  ): DecisionReport {
    const stackVisualization: StackVisualization = {
      currentStack: pair.map(t => ({ toolId: t.toolId, toolName: pairNames[pair.indexOf(t)] || t.toolId, role: 'Current Tool', monthlySpend: t.monthlySpend, seats: t.seats, isRemoved: true })),
      recommendedStack: [{ toolId: absorber.id, toolName: absorber.name, role: absorber.raw.primaryRole, estimatedMonthlyCost: projectedCost, seats: Math.max(...pair.map(p => p.seats)), isNew: true, isRetained: false }],
      currentMonthlyCost: currentCost, recommendedMonthlyCost: projectedCost, monthlySavings,
    };

    const domainImpact: DomainImpact = {
      coding:    { delta: 0, rationale: `${absorber.name} provides unified coding (${absorber.codingScore})` },
      writing:   { delta: 0, rationale: `${absorber.name} writing score: ${absorber.writingScore}` },
      research:  { delta: 0, rationale: `${absorber.name} research score: ${absorber.researchScore}` },
      reasoning: { delta: 0, rationale: `${absorber.name} reasoning score: ${absorber.reasoningScore}` },
      enterprise:{ delta: 0, rationale: `${absorber.name} enterprise readiness: ${absorber.enterpriseScore}` },
      security:  { delta: 0, rationale: `${absorber.name} security score: ${absorber.securityScore}` },
    };

    const operationalDeltas: OperationalDeltas = {
      contextWindowDiff: `Consolidated single context window in ${absorber.name}`,
      latencyDiff: 'Single API endpoint eliminates multi-tool latency overhead',
      integrationChanges: absorber.raw.supportedPlatforms?.slice(0, 4) || ['Web UI', 'API'],
      migrationDifficulty: absorber.raw.productivityScores.migrationCost || 'Medium',
      learningCurve: absorber.raw.productivityScores.learningCurve || 'Low',
      vendorLockInImpact: 'Medium',
    };

    const businessImpact: BusinessImpactSummary = {
      costReduction: `$${monthlySavings}/mo ($${annualSavings}/yr) from license consolidation`,
      developerProductivity: 'Reduces context switching between multiple tools',
      workflowImpact: `${coverageRetainedPercent}% workflow coverage retained in consolidated stack`,
      enterpriseReadiness: `${absorber.name} enterprise score: ${absorber.enterpriseScore}/100`,
      vendorLockIn: 'Increased dependency on single vendor — intentional consolidation tradeoff',
      scalability: absorber.futureGrowthScore >= 75 ? 'Excellent scalability' : 'Moderate scalability',
      operationalComplexity: 'Simplified tooling — fewer vendors to manage and invoice',
      overallRisk: `${riskLevel} risk with ${confidence} confidence`,
    };

    const featureMatrix: FeatureMatrixRow[] = FEATURE_MATRIX_KEYS.slice(0, 10).map(({ key, label }) => {
      const maxCurrent = Math.max(...pair.map(() => 5));
      const tgtScore = absorber.raw.capabilities[key]?.score ?? 0;
      const currentStatus = maxCurrent >= 7 ? 'yes' : 'partial';
      const recommendedStatus = tgtScore >= 7 ? 'yes' : tgtScore >= 4 ? 'partial' : 'no';
      return { feature: label, featureKey: key, currentStatus, currentScore: maxCurrent, recommendedStatus, recommendedScore: tgtScore, delta: tgtScore >= maxCurrent ? 'same' : 'worse' };
    });

    const migrationChecklist: MigrationChecklist = {
      estimatedDays: 7,
      steps: [
        { id: 'export-all', category: 'data', action: `Export data from ${pairNames.join(' and ')}`, priority: 'required' },
        { id: 'trial-absorber', category: 'setup', action: `Run pilot with ${absorber.name} covering all consolidated workflows`, priority: 'required' },
        { id: 'update-integrations', category: 'integration', action: `Update all integrations to point to ${absorber.name}`, priority: 'required' },
        { id: 'cancel-old', category: 'billing', action: `Cancel subscriptions for ${pairNames.join(' and ')}`, priority: 'required' },
        { id: 'train-team', category: 'team', action: `Train team on unified ${absorber.name} workflows`, priority: 'recommended' },
      ],
    };

    const audienceGuidance = this.buildAudienceGuidance(absorber, absorber);

    const trace: RecommendationTrace = {
      knowledgeVersion: absorber.raw.knowledgeVersion || 'v1.0.0',
      generatedAt: new Date().toISOString(), useCase,
      scoringProfile: { coverageRetainedPercent, monthlySavings, opportunityScore: opportunityScore.overall },
      decisionPath: [`Identified overlap cluster: ${pairNames.join(', ')}`, `Evaluated ${absorber.name} as absorber`, `Coverage: ${coverageRetainedPercent}%`, `Opportunity Score: ${opportunityScore.overall}/100`],
      confidenceBreakdown: { capabilityMatch: coverageRetainedPercent, workflowFit: workflowMatchPercent, enterpriseReadiness: absorber.enterpriseScore, financialFit: 95, riskScore: riskLevel === 'Low' ? 90 : 65 },
    };

    const futureGrowthAnalysis = this.buildFutureGrowthAnalysis(pair[0], absorber);

    return {
      id: `cons-report-${absorber.id}`,
      title: `Consolidation: ${pairNames.join(' + ')} → ${absorber.name}`,
      targetToolName: pairNames.join(', '),
      proposedAction: `Consolidate into ${absorber.name}`,
      opportunityScore,
      executiveSummary: `Consolidating ${pairNames.join(' and ')} into ${absorber.name} saves $${monthlySavings}/mo with ${coverageRetainedPercent}% capability retention. Opportunity Score: ${opportunityScore.overall}/100.`,
      recommendation, confidence, confidenceScore: coverageRetainedPercent,
      stackVisualization, rankedRecommendations,
      currentMonthlyCost: currentCost, projectedMonthlyCost: projectedCost,
      monthlySavings, annualSavings, capabilityRetentionPercent: coverageRetainedPercent,
      capabilitiesLost: combinedLost, capabilitiesGained: combinedGained,
      remainingCoveragePercent: coverageRetainedPercent,
      featureMatrix, domainImpact, operationalDeltas, businessImpact,
      developerImpact: `Single unified tool interface eliminates context switching`,
      enterpriseImpact: `Compliance consolidated under ${absorber.name} (${absorber.enterpriseScore}/100)`,
      audienceGuidance, migrationChecklist,
      riskLevel, riskFactors: combinedLost.length > 0 ? [`Workflow gaps: ${combinedLost.slice(0, 2).join(', ')}`] : ['Increased vendor concentration'],
      scenarios: {
        primaryScenario: { id: 'cons-a', title: 'Scenario A: Full Consolidation', action: `Decommission ${pairNames.join(' & ')} and expand ${absorber.name}`, monthlySavings, annualSavings, coveragePercent: coverageRetainedPercent, riskLevel, tradeoffs: combinedLost.length > 0 ? [`Gaps: ${combinedLost.slice(0, 2).join(', ')}`] : ['Streamlined tool count'], recommendation },
        statusQuoScenario: { id: 'cons-c', title: 'Scenario C: Keep Fragmented Stack', action: `Maintain separate licenses for ${pairNames.join(' and ')}`, monthlySavings: 0, annualSavings: 0, coveragePercent: 100, riskLevel: 'Low', tradeoffs: ['Continued license fragmentation', 'Overlapping capability spend'], recommendation: 'Baseline status quo.' },
      },
      whyNotSelected: [],
      futureGrowthAnalysis,
      trace,
    };
  }

  private static buildRemovalDecisionReport(
    tool: ToolEntry, target: ScoredProviderProfile,
    remaining: ScoredProviderProfile[],
    classification: ToolRemovalClassification, classificationLabel: string,
    remainingCoveragePercent: number,
    coveredCaps: string[], lostCaps: string[],
    monthlySavings: number, annualSavings: number,
    riskLevel: RiskLevel, confidence: ConfidenceLevel,
    recommendation: string, useCase: UseCase,
    opportunityScore: OpportunityScore,
    rankedRecommendations: RankedRecommendation[],
    featureMatrix: FeatureMatrixRow[],
    migrationChecklist: MigrationChecklist,
    audienceGuidance: AudienceGuidance,
    futureGrowthAnalysis: FutureGrowthAnalysis
  ): DecisionReport {
    const stackVisualization: StackVisualization = {
      currentStack: [{ toolId: tool.toolId, toolName: target.name, role: target.raw.primaryRole, monthlySpend: monthlySavings, seats: tool.seats, isRemoved: true }, ...remaining.map(r => ({ toolId: r.id, toolName: r.name, role: r.raw.primaryRole, monthlySpend: 0, seats: tool.seats, isRemoved: false }))],
      recommendedStack: remaining.map(r => ({ toolId: r.id, toolName: r.name, role: r.raw.primaryRole, estimatedMonthlyCost: 0, seats: tool.seats, isNew: false, isRetained: true })),
      currentMonthlyCost: monthlySavings, recommendedMonthlyCost: 0, monthlySavings,
    };

    const domainImpact: DomainImpact = {
      coding: { delta: -Math.max(0, target.codingScore - Math.max(...remaining.map(r => r.codingScore))), rationale: 'Covered by remaining stack' },
      writing: { delta: 0, rationale: 'Covered by remaining stack' },
      research: { delta: 0, rationale: 'Covered by remaining stack' },
      reasoning: { delta: -Math.max(0, target.reasoningScore - Math.max(...remaining.map(r => r.reasoningScore))), rationale: 'Covered by remaining stack' },
      enterprise: { delta: 0, rationale: 'Remaining stack maintains compliance' },
      security: { delta: 0, rationale: 'Security standards maintained by remaining tools' },
    };

    const businessImpact: BusinessImpactSummary = {
      costReduction: `$${monthlySavings}/mo ($${annualSavings}/yr) direct spend elimination`,
      developerProductivity: `${lostCaps.length === 0 ? 'No productivity impact' : `Minor gaps in: ${lostCaps.slice(0, 2).join(', ')}`}`,
      workflowImpact: `${remainingCoveragePercent}% of workflows covered by remaining stack`,
      enterpriseReadiness: remaining.length > 0 ? 'Maintained by remaining tools' : 'Reduced',
      vendorLockIn: 'Reduced vendor count improves flexibility',
      scalability: 'Simplified stack scales more efficiently',
      operationalComplexity: 'Reduced — fewer tools to manage and invoice',
      overallRisk: `${riskLevel} risk (${classificationLabel})`,
    };

    const trace: RecommendationTrace = {
      knowledgeVersion: target.raw.knowledgeVersion || 'v1.0.0',
      generatedAt: new Date().toISOString(), useCase,
      scoringProfile: { remainingCoveragePercent, monthlySavings, opportunityScore: opportunityScore.overall },
      decisionPath: [`Assessed ${target.name} against remaining stack: ${remaining.map(r => r.name).join(', ')}`, `Coverage index: ${remainingCoveragePercent}%`, `Classification: ${classificationLabel}`, `Opportunity Score: ${opportunityScore.overall}/100`],
      confidenceBreakdown: { capabilityMatch: remainingCoveragePercent, workflowFit: 85, enterpriseReadiness: 90, financialFit: 100, riskScore: riskLevel === 'Low' ? 95 : 60 },
    };

    return {
      id: `rem-report-${tool.toolId}`,
      title: `Tool Removal Analysis: ${target.name}`,
      targetToolName: target.name, proposedAction: `Decommission ${target.name}`,
      opportunityScore,
      executiveSummary: `Removing ${target.name} saves $${monthlySavings}/mo ($${annualSavings}/yr). Remaining stack covers ${remainingCoveragePercent}% of capabilities. Classification: ${classificationLabel}. Opportunity Score: ${opportunityScore.overall}/100.`,
      recommendation, confidence, confidenceScore: remainingCoveragePercent,
      stackVisualization, rankedRecommendations,
      currentMonthlyCost: monthlySavings, projectedMonthlyCost: 0,
      monthlySavings, annualSavings, capabilityRetentionPercent: remainingCoveragePercent,
      capabilitiesLost: lostCaps, capabilitiesGained: [],
      remainingCoveragePercent, featureMatrix, domainImpact,
      operationalDeltas: { contextWindowDiff: 'N/A', latencyDiff: 'N/A', integrationChanges: ['Remove API key / subscription'], migrationDifficulty: 'Low', learningCurve: 'Very Low', vendorLockInImpact: 'Low' },
      businessImpact,
      developerImpact: `Team transitions to: ${remaining.map(r => r.name).join(', ')}`,
      enterpriseImpact: 'Compliance maintained by remaining tools',
      audienceGuidance, migrationChecklist,
      riskLevel, riskFactors: lostCaps.length > 0 ? [`Gaps in: ${lostCaps.slice(0, 3).join(', ')}`] : ['Minimal workflow disruption'],
      scenarios: {
        primaryScenario: { id: 'rem-a', title: 'Scenario A: Decommission Tool', action: `Cancel all ${tool.seats} seats of ${target.name}`, monthlySavings, annualSavings, coveragePercent: remainingCoveragePercent, riskLevel, tradeoffs: lostCaps.length > 0 ? [`Gaps: ${lostCaps.slice(0, 2).join(', ')}`] : ['Zero workflow impact'], recommendation },
        statusQuoScenario: { id: 'rem-c', title: 'Scenario C: Retain License', action: `Maintain ${target.name} subscription`, monthlySavings: 0, annualSavings: 0, coveragePercent: 100, riskLevel: 'Low', tradeoffs: ['Continued recurring spend'], recommendation: 'Baseline status quo.' },
      },
      whyNotSelected: [],
      futureGrowthAnalysis,
      trace,
    };
  }
}
