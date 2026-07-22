// ============================================================
// Capability Coverage Engine — StackSave AI Platform Intelligence
//
// Computes overlap, redundancy, and gaps across tools in the stack.
// ============================================================

import { ToolId } from '../../types';
import { Capability, CapabilityMatrixService } from './CapabilityMatrixService';

export interface CoverageResult {
  overlap: {
    capability: Capability;
    tools: string[];
    maxScore: number;
  }[];
  uniqueStrengths: Record<string, Capability[]>;
}

export class CapabilityCoverageEngine {
  /**
   * Identifies all capability overlaps (where more than one tool in the stack
   * scores >= 7 in the same capability category).
   */
  public static getOverlapAnalysis(toolIds: (ToolId | string)[]): CoverageResult {
    const overlap: { capability: Capability; tools: string[]; maxScore: number }[] = [];
    const uniqueStrengths: Record<string, Capability[]> = {};

    // Initialize unique strengths map
    for (const id of toolIds) {
      uniqueStrengths[id] = [];
    }

    const capabilities = Object.keys(CapabilityMatrixService.getScoresForTool('cursor')) as Capability[];

    for (const cap of capabilities) {
      const supportingTools: { toolId: string; score: number }[] = [];

      for (const id of toolIds) {
        const score = CapabilityMatrixService.getScore(id, cap);
        if (score >= 7) {
          supportingTools.push({ toolId: id as string, score });
        }
      }

      if (supportingTools.length > 1) {
        // Overlap detected!
        overlap.push({
          capability: cap,
          tools: supportingTools.map((t) => t.toolId),
          maxScore: Math.max(...supportingTools.map((t) => t.score))
        });
      } else if (supportingTools.length === 1) {
        // Unique strength for this tool in the context of this stack
        const owner = supportingTools[0].toolId;
        uniqueStrengths[owner].push(cap);
      }
    }

    return { overlap, uniqueStrengths };
  }

  /**
   * Evaluates the capability drop (lost capabilities) if a tool is decommissioned from the stack.
   */
  public static getLostCapabilities(decommissionedToolId: ToolId | string, remainingToolIds: (ToolId | string)[]): Capability[] {
    const lost: Capability[] = [];
    const capabilities = Object.keys(CapabilityMatrixService.getScoresForTool('cursor')) as Capability[];

    for (const cap of capabilities) {
      const toolHasCap = CapabilityMatrixService.hasCapability(decommissionedToolId, cap);
      if (!toolHasCap) continue;

      // Check if any remaining tool in the stack covers this capability
      const isCoveredByOthers = remainingToolIds.some((id) => CapabilityMatrixService.hasCapability(id, cap));
      if (!isCoveredByOthers) {
        lost.push(cap);
      }
    }

    return lost;
  }
}
