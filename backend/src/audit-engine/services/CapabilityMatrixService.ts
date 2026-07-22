// ============================================================
// Capability Matrix Service — StackSave AI Platform Intelligence
//
// Defines 22 granular capabilities and maps the coverage level
// (0-10 score) for each provider. Compares overlap and gaps.
// ============================================================

import { ToolId } from '../../types';
import { ProviderKnowledgeService } from './ProviderKnowledgeService';

export type Capability =
  | 'reasoning'
  | 'coding'
  | 'agentWorkflows'
  | 'ideIntegration'
  | 'autocomplete'
  | 'planning'
  | 'writing'
  | 'research'
  | 'imageGeneration'
  | 'voice'
  | 'multimodal'
  | 'apiAccess'
  | 'automation'
  | 'terminalIntegration'
  | 'largeContext'
  | 'enterpriseSecurity'
  | 'compliance'
  | 'memory'
  | 'toolCalling'
  | 'functionCalling'
  | 'longContext'
  | 'largeCodebaseSupport';

// Capabilities labels for client rendering or reports
export const CAPABILITY_LABELS: Record<Capability, string> = {
  reasoning: 'Logical Reasoning',
  coding: 'Code Generation',
  agentWorkflows: 'AI Agent Workflows',
  ideIntegration: 'Native IDE Integration',
  autocomplete: 'Real-time Autocomplete',
  planning: 'Multi-step Planning',
  writing: 'Technical & Creative Writing',
  research: 'Deep Search & Research',
  imageGeneration: 'Image Generation',
  voice: 'Real-time Voice/Audio',
  multimodal: 'Multimodal Parsing',
  apiAccess: 'Developer API Access',
  automation: 'Workflow Automation',
  terminalIntegration: 'Terminal Integration',
  largeContext: 'Large Context Recall',
  enterpriseSecurity: 'Enterprise Security',
  compliance: 'IP & Privacy Compliance',
  memory: 'Contextual Memory',
  toolCalling: 'Native Tool Calling',
  functionCalling: 'Function Calling',
  longContext: 'Long Context Support',
  largeCodebaseSupport: 'Large Codebase Support'
};

// 0-10 mapping for each tool's strength in each capability
const CAPABILITY_SCORES: Record<string, Record<Capability, number>> = {
  cursor: {
    reasoning: 9, coding: 10, agentWorkflows: 10, ideIntegration: 10, autocomplete: 10,
    planning: 9, writing: 4, research: 6, imageGeneration: 0, voice: 0,
    multimodal: 8, apiAccess: 2, automation: 7, terminalIntegration: 10, largeContext: 8,
    enterpriseSecurity: 7, compliance: 7, memory: 8, toolCalling: 9, functionCalling: 9,
    longContext: 8, largeCodebaseSupport: 10
  },
  'github-copilot': {
    reasoning: 7, coding: 8, agentWorkflows: 4, ideIntegration: 9, autocomplete: 10,
    planning: 5, writing: 3, research: 5, imageGeneration: 0, voice: 0,
    multimodal: 6, apiAccess: 1, automation: 2, terminalIntegration: 2, largeContext: 5,
    enterpriseSecurity: 10, compliance: 10, memory: 5, toolCalling: 6, functionCalling: 6,
    longContext: 5, largeCodebaseSupport: 6
  },
  claude: {
    reasoning: 10, coding: 9, agentWorkflows: 8, ideIntegration: 2, autocomplete: 1,
    planning: 8, writing: 10, research: 8, imageGeneration: 0, voice: 1,
    multimodal: 9, apiAccess: 2, automation: 6, terminalIntegration: 1, largeContext: 10,
    enterpriseSecurity: 8, compliance: 8, memory: 8, toolCalling: 8, functionCalling: 9,
    longContext: 10, largeCodebaseSupport: 5
  },
  chatgpt: {
    reasoning: 9, coding: 8, agentWorkflows: 7, ideIntegration: 2, autocomplete: 1,
    planning: 8, writing: 8, research: 10, imageGeneration: 10, voice: 10,
    multimodal: 10, apiAccess: 2, automation: 7, terminalIntegration: 1, largeContext: 7,
    enterpriseSecurity: 8, compliance: 8, memory: 9, toolCalling: 8, functionCalling: 9,
    longContext: 7, largeCodebaseSupport: 4
  },
  gemini: {
    reasoning: 8, coding: 8, agentWorkflows: 6, ideIntegration: 2, autocomplete: 1,
    planning: 7, writing: 7, research: 8, imageGeneration: 8, voice: 8,
    multimodal: 9, apiAccess: 2, automation: 6, terminalIntegration: 1, largeContext: 10,
    enterpriseSecurity: 8, compliance: 8, memory: 7, toolCalling: 7, functionCalling: 8,
    longContext: 10, largeCodebaseSupport: 5
  },
  windsurf: {
    reasoning: 9, coding: 9, agentWorkflows: 9, ideIntegration: 10, autocomplete: 9,
    planning: 9, writing: 4, research: 5, imageGeneration: 0, voice: 0,
    multimodal: 7, apiAccess: 2, automation: 6, terminalIntegration: 8, largeContext: 7,
    enterpriseSecurity: 6, compliance: 6, memory: 7, toolCalling: 9, functionCalling: 9,
    longContext: 7, largeCodebaseSupport: 9
  },
  'openai-api': {
    reasoning: 9, coding: 8, agentWorkflows: 7, ideIntegration: 1, autocomplete: 1,
    planning: 8, writing: 8, research: 7, imageGeneration: 9, voice: 9,
    multimodal: 10, apiAccess: 10, automation: 8, terminalIntegration: 1, largeContext: 7,
    enterpriseSecurity: 9, compliance: 9, memory: 6, toolCalling: 8, functionCalling: 10,
    longContext: 7, largeCodebaseSupport: 4
  },
  'anthropic-api': {
    reasoning: 10, coding: 9, agentWorkflows: 8, ideIntegration: 1, autocomplete: 1,
    planning: 8, writing: 9, research: 7, imageGeneration: 0, voice: 1,
    multimodal: 9, apiAccess: 10, automation: 8, terminalIntegration: 1, largeContext: 10,
    enterpriseSecurity: 9, compliance: 9, memory: 8, toolCalling: 9, functionCalling: 10,
    longContext: 10, largeCodebaseSupport: 4
  },
  perplexity: {
    reasoning: 9, coding: 7, agentWorkflows: 6, ideIntegration: 1, autocomplete: 1,
    planning: 7, writing: 8, research: 10, imageGeneration: 0, voice: 2,
    multimodal: 8, apiAccess: 4, automation: 5, terminalIntegration: 1, largeContext: 6,
    enterpriseSecurity: 8, compliance: 8, memory: 6, toolCalling: 7, functionCalling: 7,
    longContext: 6, largeCodebaseSupport: 3
  },
  deepseek: {
    reasoning: 9, coding: 9, agentWorkflows: 8, ideIntegration: 1, autocomplete: 1,
    planning: 8, writing: 7, research: 7, imageGeneration: 0, voice: 1,
    multimodal: 8, apiAccess: 10, automation: 6, terminalIntegration: 1, largeContext: 8,
    enterpriseSecurity: 6, compliance: 6, memory: 7, toolCalling: 8, functionCalling: 9,
    longContext: 8, largeCodebaseSupport: 4
  },
  'github-models': {
    reasoning: 8, coding: 8, agentWorkflows: 7, ideIntegration: 1, autocomplete: 1,
    planning: 7, writing: 7, research: 6, imageGeneration: 7, voice: 5,
    multimodal: 8, apiAccess: 10, automation: 6, terminalIntegration: 1, largeContext: 8,
    enterpriseSecurity: 9, compliance: 9, memory: 5, toolCalling: 7, functionCalling: 8,
    longContext: 8, largeCodebaseSupport: 4
  },
  codex: {
    reasoning: 4, coding: 5, agentWorkflows: 2, ideIntegration: 6, autocomplete: 6,
    planning: 2, writing: 2, research: 2, imageGeneration: 0, voice: 0,
    multimodal: 0, apiAccess: 5, automation: 1, terminalIntegration: 1, largeContext: 2,
    enterpriseSecurity: 5, compliance: 5, memory: 2, toolCalling: 2, functionCalling: 2,
    longContext: 2, largeCodebaseSupport: 2
  }
};

export class CapabilityMatrixService {
  /**
   * Returns a score (0 to 10) representing a provider's capability strength.
   */
  public static getScore(toolId: ToolId | string, capability: Capability): number {
    const normalized = toolId.toLowerCase();
    const scores = CAPABILITY_SCORES[normalized];
    return scores ? scores[capability] : 0;
  }

  /**
   * Check if a provider has a strong support level for a capability (score >= 7).
   */
  public static hasCapability(toolId: ToolId | string, capability: Capability): boolean {
    return this.getScore(toolId, capability) >= 7;
  }

  /**
   * Retrieves the full set of capability scores for a single tool.
   */
  public static getScoresForTool(toolId: ToolId | string): Record<Capability, number> {
    const normalized = toolId.toLowerCase();
    return CAPABILITY_SCORES[normalized] || {
      reasoning: 0, coding: 0, agentWorkflows: 0, ideIntegration: 0, autocomplete: 0,
      planning: 0, writing: 0, research: 0, imageGeneration: 0, voice: 0,
      multimodal: 0, apiAccess: 0, automation: 0, terminalIntegration: 0, largeContext: 0,
      enterpriseSecurity: 0, compliance: 0, memory: 0, toolCalling: 0, functionCalling: 0,
      longContext: 0, largeCodebaseSupport: 0
    };
  }

  /**
   * Compares two tools and returns capabilities where tool A is stronger than tool B.
   */
  public static getSuperiorCapabilities(toolIdA: ToolId | string, toolIdB: ToolId | string): Capability[] {
    const superior: Capability[] = [];
    const keys = Object.keys(CAPABILITY_SCORES.cursor) as Capability[];

    for (const cap of keys) {
      const scoreA = this.getScore(toolIdA, cap);
      const scoreB = this.getScore(toolIdB, cap);
      if (scoreA > scoreB && scoreA >= 7) {
        superior.push(cap);
      }
    }

    return superior;
  }
}
