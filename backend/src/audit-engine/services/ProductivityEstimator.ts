// ============================================================
// Productivity Estimator — StackSave AI Platform Intelligence
//
// Models developer productivity, reasoning, planning scores, and impact.
// ============================================================

import { ToolId } from '../../types';
import { ProviderKnowledgeService } from './ProviderKnowledgeService';
import { CapabilityMatrixService } from './CapabilityMatrixService';

export interface ProductivityAssessment {
  productivityImpact: 'None' | 'Minimal' | 'Noticeable';
  confidence: 'High' | 'Medium' | 'Low';
  tradeoffsDescription: string;
}

export class ProductivityEstimator {
  /**
   * Estimates the impact of replacing toolA (decommissioned) with toolB (recommended replacement).
   */
  public static assessReplacement(
    toolA: ToolId | string,
    toolB: ToolId | string,
    teamSize: number,
    strategy: 'performance' | 'savings'
  ): ProductivityAssessment {
    const metaA = ProviderKnowledgeService.getProvider(toolA);
    const metaB = ProviderKnowledgeService.getProvider(toolB);

    if (!metaA || !metaB) {
      return {
        productivityImpact: 'None',
        confidence: 'High',
        tradeoffsDescription: 'Standard console adjustment.'
      };
    }

    const prodWeightA = metaA.productivityWeight;
    const prodWeightB = metaB.productivityWeight;
    const codeBenchA = metaA.benchmarkScores.codingBenchmark;
    const codeBenchB = metaA.benchmarkScores.codingBenchmark;

    // Direct loss mapping
    const deltaWeight = prodWeightA - prodWeightB;
    const isDegrade = deltaWeight > 0.05;

    let productivityImpact: 'None' | 'Minimal' | 'Noticeable' = 'None';
    let confidence: 'High' | 'Medium' | 'Low' = 'High';
    let tradeoffsDescription = 'Consolidating duplicate roles yields identical operations.';

    if (isDegrade) {
      // Degrading tools (e.g. Cursor Pro to Copilot Pro)
      if (strategy === 'performance') {
        productivityImpact = 'Noticeable';
        confidence = 'High';
        tradeoffsDescription = `Developer velocity drops. ${metaA.name} includes native codebase indexing and autonomous agent Composer workflows that ${metaB.name} lacks.`;
      } else {
        productivityImpact = 'Minimal';
        confidence = 'Medium';
        tradeoffsDescription = `Developers lose the autonomous multi-file generation capabilities of ${metaA.name}. Basic completion remains fully active via ${metaB.name}.`;
      }
    } else {
      // Upgrading or equal role transfer
      productivityImpact = 'None';
      confidence = 'High';
      tradeoffsDescription = `Direct capability parity. ${metaB.name} supports identical IDE actions as ${metaA.name}.`;
    }

    return { productivityImpact, confidence, tradeoffsDescription };
  }
}
