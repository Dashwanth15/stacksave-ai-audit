// ============================================================
// Explanation Engine — StackSave AI Platform Intelligence
//
// Formats comparisons into structured Gartner-style evidence reports.
// Strict constraint to avoid repeating sentences across fields.
// ============================================================

import { KnowledgeLoader } from './KnowledgeLoader';
import { DecisionLog } from '../../types';

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
   * Generates a Gartner-style explanation block based on proposal logs and metrics.
   */
  public static generate(
    idA: string, // tool to remove
    idB: string, // tool to keep
    decisionLog: DecisionLog,
    strategy?: 'performance' | 'savings'
  ): GartnerExplanation {
    const profileA = KnowledgeLoader.getProvider(idA)!;
    const profileB = KnowledgeLoader.getProvider(idB)!;

    const problem = strategy === 'performance'
      ? `Ecosystem capability overlap in AI ${profileA.category.toUpperCase()} category.`
      : `Redundant subscription costs in the AI ${profileA.category.toUpperCase()} budget.`;

    const decision = `Keep ${profileB.name}, Remove ${profileA.name}`;

    // Collect capability difference highlights mathematically
    const evidenceList: string[] = [];
    const capsToCheck = [
      { key: 'aiAgent', label: 'AI agent workflows' },
      { key: 'largeCodebaseUnderstanding', label: 'codebase indexing and semantic search' },
      { key: 'multiFileEditing', label: 'multi-file editing / Composer' },
      { key: 'autocomplete', label: 'inline autocomplete' },
      { key: 'reasoning', label: 'complex context reasoning' },
      { key: 'longContext', label: 'context window size' }
    ];

    for (const item of capsToCheck) {
      const scoreA = profileA.capabilities[item.key]?.score || 0;
      const scoreB = profileB.capabilities[item.key]?.score || 0;
      const diff = scoreB - scoreA;

      if (diff >= 2) {
        evidenceList.push(`• ${profileB.name} provides superior ${item.label} (score ${scoreB} vs ${scoreA})`);
      } else if (diff <= -2) {
        evidenceList.push(`• ${profileA.name} provides stronger standalone ${item.label} (score ${scoreA} vs ${scoreB})`);
      }
    }

    if (evidenceList.length === 0) {
      evidenceList.push(`• ${profileB.name} is rated higher in overall developer experience and workflow metrics`);
    }

    // Deduplicated tradeoffs
    let tradeoffs = 'Standard administrative keys configuration.';
    if (strategy === 'performance') {
      tradeoffs = `Minor standalone configurations are unified. Decommissioning ${profileA.name} simplifies the engineering stack with zero degradation to critical workflows.`;
    } else {
      if (profileA.category === 'ide') {
        tradeoffs = `Developers lose standalone access to the ${profileA.name} plugins. Custom settings mapping is required inside the ${profileB.name} interface.`;
      } else if (profileA.category === 'chat') {
        tradeoffs = `Team members lose separate project consoles and history threads hosted on ${profileA.name}.`;
      }
    }

    // Retrieve savings and metrics from the proposal evaluation that decommissioned tool A
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
