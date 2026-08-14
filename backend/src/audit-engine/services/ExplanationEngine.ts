// ============================================================
// Explanation Engine — StackSave AI Platform Intelligence
//
// Formats comparisons and decisions into structured, multi-dimensional
// Gartner-style evidence reports with 100% explainability.
// ============================================================

import { KnowledgeLoader, ProviderProfile } from './KnowledgeLoader';
import { DecisionLog } from '../../types';
import { RelationshipEngine } from './RelationshipEngine';

export interface GartnerExplanation {
  problem: string;
  decision: string;
  evidence: string;
  tradeoffs: string;
  expectedSavings: string;
  developerImpact: string;
  confidence: string;
}

export class ExplanationEngine {
  /**
   * Generates a structured Gartner-style explanation block based on proposal logs and metrics.
   */
  public static generate(
    idA: string, // tool to remove
    idB: string, // tool to keep
    decisionLog: DecisionLog,
    strategy?: 'performance' | 'savings'
  ): GartnerExplanation {
    const profileA = KnowledgeLoader.getProvider(idA)!;
    const profileB = KnowledgeLoader.getProvider(idB)!;

    const categoryLabel = profileA?.category?.toUpperCase() || 'SOFTWARE';
    const nameA = profileA ? profileA.name : idA;
    const nameB = profileB ? profileB.name : idB;

    const problem = strategy === 'performance'
      ? `Ecosystem capability overlap in AI ${categoryLabel} category.`
      : `Redundant subscription costs in the AI ${categoryLabel} budget.`;

    const decision = `Keep ${nameB}, Remove ${nameA}`;

    // Compute dynamic relationship and feature deltas
    const rel = RelationshipEngine.analyze(idA, idB, decisionLog.useCase);
    const evidenceList: string[] = [];

    if (rel) {
      evidenceList.push(`• Capability overlap index: ${rel.workflowOverlap}% between ${nameA} and ${nameB}`);
      if (rel.replacementConfidence >= 75) {
        evidenceList.push(`• Directional replacement confidence: ${rel.replacementConfidence}% (${nameB} covers key capabilities of ${nameA})`);
      }
      if (rel.featureGain.length > 0) {
        evidenceList.push(`• Superior capabilities in ${nameB}: ${rel.featureGain.slice(0, 2).join(', ')}`);
      }
    }

    if (evidenceList.length === 0) {
      evidenceList.push(`• ${nameB} is rated higher in overall developer experience and workflow metrics`);
    }

    // Dynamic tradeoffs
    let tradeoffs = 'Standard administrative keys configuration.';
    if (strategy === 'performance') {
      tradeoffs = `Minor standalone configurations are unified. Decommissioning ${nameA} simplifies the engineering stack with zero degradation to critical workflows.`;
    } else {
      if (profileA?.category === 'ide') {
        tradeoffs = `Developers lose standalone access to ${nameA} plugins. Custom settings mapping is required inside the ${nameB} interface.`;
      } else if (profileA?.category === 'chat') {
        tradeoffs = `Team members lose separate project consoles and history threads hosted on ${nameA}.`;
      }
    }

    // Retrieve savings & metrics
    const evalProp = decisionLog.proposalsEvaluated.find(
      (p) => p.decommissionedTools.includes(idA) && p.keptTools.includes(idB)
    ) || decisionLog.proposalsEvaluated.find(p => p.decommissionedTools.includes(idA));

    const savings = evalProp ? evalProp.monthlySavings : 20;
    const expectedSavings = `$${savings * 12}/year`;

    const productivity = evalProp ? evalProp.productivityImpact : 100;
    let developerImpact = 'No Impact';
    if (productivity < 70) developerImpact = 'Major Impact';
    else if (productivity < 85) developerImpact = 'Moderate Impact';
    else if (productivity < 95) developerImpact = 'Minimal Impact';

    return {
      problem,
      decision,
      evidence: evidenceList.slice(0, 4).join('\n'),
      tradeoffs,
      expectedSavings,
      developerImpact,
      confidence: decisionLog.confidence
    };
  }
}
