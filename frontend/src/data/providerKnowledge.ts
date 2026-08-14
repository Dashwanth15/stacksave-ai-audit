// ============================================================
// Provider Knowledge Base — Single Source of Truth
// Direct frontend import of backend provider JSON files.
// NO duplicated frontend profiles — 100% derived from backend JSONs.
// ============================================================

import type { Insight, ToolEntry, UseCase } from '../types';

import claudeProvider from '../../../backend/src/knowledge/providers/claude/provider.json';
import claudePlans from '../../../backend/src/knowledge/providers/claude/plans.json';
import claudeModel from '../../../backend/src/knowledge/providers/claude/models/claude-3-5-sonnet.json';
import claudeHaikuModel from '../../../backend/src/knowledge/providers/claude/models/claude-3-5-haiku.json';
import claudeOpusModel from '../../../backend/src/knowledge/providers/claude/models/claude-3-opus.json';

import chatgptProvider from '../../../backend/src/knowledge/providers/chatgpt/provider.json';
import chatgptPlans from '../../../backend/src/knowledge/providers/chatgpt/plans.json';
import chatgptModel from '../../../backend/src/knowledge/providers/chatgpt/models/gpt-4o.json';
import chatgptO1MiniModel from '../../../backend/src/knowledge/providers/chatgpt/models/o1-mini.json';
import chatgptO1Model from '../../../backend/src/knowledge/providers/chatgpt/models/o1.json';

import cursorProvider from '../../../backend/src/knowledge/providers/cursor/provider.json';
import cursorPlans from '../../../backend/src/knowledge/providers/cursor/plans.json';
import cursorModel from '../../../backend/src/knowledge/providers/cursor/models/claude-3-5-sonnet.json';
import cursorGpt4oModel from '../../../backend/src/knowledge/providers/cursor/models/gpt-4o.json';
import cursorGeminiModel from '../../../backend/src/knowledge/providers/cursor/models/gemini-1-5-pro.json';

import copilotProvider from '../../../backend/src/knowledge/providers/github-copilot/provider.json';
import copilotPlans from '../../../backend/src/knowledge/providers/github-copilot/plans.json';
import copilotModel from '../../../backend/src/knowledge/providers/github-copilot/models/claude-3-5-sonnet.json';
import copilotGpt4oModel from '../../../backend/src/knowledge/providers/github-copilot/models/gpt-4o.json';

import geminiProvider from '../../../backend/src/knowledge/providers/gemini/provider.json';
import geminiPlans from '../../../backend/src/knowledge/providers/gemini/plans.json';
import geminiModel from '../../../backend/src/knowledge/providers/gemini/models/gemini-1-5-pro.json';
import geminiFlashModel from '../../../backend/src/knowledge/providers/gemini/models/gemini-1-5-flash.json';

import windsurfProvider from '../../../backend/src/knowledge/providers/windsurf/provider.json';
import windsurfPlans from '../../../backend/src/knowledge/providers/windsurf/plans.json';
import windsurfModel from '../../../backend/src/knowledge/providers/windsurf/models/claude-3-5-sonnet.json';
import windsurfGpt4oModel from '../../../backend/src/knowledge/providers/windsurf/models/gpt-4o.json';

import perplexityProvider from '../../../backend/src/knowledge/providers/perplexity/provider.json';
import perplexityPlans from '../../../backend/src/knowledge/providers/perplexity/plans.json';
import perplexityModel from '../../../backend/src/knowledge/providers/perplexity/models/sonar-large.json';
import perplexitySonarSmallModel from '../../../backend/src/knowledge/providers/perplexity/models/sonar-small.json';
import perplexityClaudeModel from '../../../backend/src/knowledge/providers/perplexity/models/claude-3-5-sonnet.json';
import perplexityGpt4oModel from '../../../backend/src/knowledge/providers/perplexity/models/gpt-4o.json';

import deepseekProvider from '../../../backend/src/knowledge/providers/deepseek/provider.json';
import deepseekPlans from '../../../backend/src/knowledge/providers/deepseek/plans.json';
import deepseekModel from '../../../backend/src/knowledge/providers/deepseek/models/deepseek-coder-v2.json';
import deepseekV25Model from '../../../backend/src/knowledge/providers/deepseek/models/deepseek-v2-5.json';

import codexProvider from '../../../backend/src/knowledge/providers/codex/provider.json';
import codexPlans from '../../../backend/src/knowledge/providers/codex/plans.json';
import codexModel from '../../../backend/src/knowledge/providers/codex/models/openai-codex.json';

import anthropicApiProvider from '../../../backend/src/knowledge/providers/anthropic-api/provider.json';
import anthropicApiPlans from '../../../backend/src/knowledge/providers/anthropic-api/plans.json';
import anthropicApiModel from '../../../backend/src/knowledge/providers/anthropic-api/models/claude-3-5-sonnet.json';
import anthropicApiHaikuModel from '../../../backend/src/knowledge/providers/anthropic-api/models/claude-3-5-haiku.json';
import anthropicApiOpusModel from '../../../backend/src/knowledge/providers/anthropic-api/models/claude-3-opus.json';

import openaiApiProvider from '../../../backend/src/knowledge/providers/openai-api/provider.json';
import openaiApiPlans from '../../../backend/src/knowledge/providers/openai-api/plans.json';
import openaiApiModel from '../../../backend/src/knowledge/providers/openai-api/models/gpt-4o.json';
import openaiApiO1Model from '../../../backend/src/knowledge/providers/openai-api/models/o1.json';
import openaiApiO1MiniModel from '../../../backend/src/knowledge/providers/openai-api/models/o1-mini.json';
import openaiApiGpt4oMiniModel from '../../../backend/src/knowledge/providers/openai-api/models/gpt-4o-mini.json';

import githubModelsProvider from '../../../backend/src/knowledge/providers/github-models/provider.json';
import githubModelsPlans from '../../../backend/src/knowledge/providers/github-models/plans.json';
import githubModelsModel from '../../../backend/src/knowledge/providers/github-models/models/claude-3-5-sonnet.json';
import githubModelsGpt4oModel from '../../../backend/src/knowledge/providers/github-models/models/gpt-4o.json';
import githubModelsLlama3Model from '../../../backend/src/knowledge/providers/github-models/models/llama-3.json';

import kimiProvider from '../../../backend/src/knowledge/providers/kimi/provider.json';
import kimiPlans from '../../../backend/src/knowledge/providers/kimi/plans.json';
import kimiModel from '../../../backend/src/knowledge/providers/kimi/models/kimi-k3-max.json';
import kimiK3Model from '../../../backend/src/knowledge/providers/kimi/models/kimi-k3.json';
import kimiBatchModel from '../../../backend/src/knowledge/providers/kimi/models/kimi-k2-7-code-batch.json';

export interface ProviderCapability {
  score: number;
  evidence: string;
  source?: string;
  lastVerified?: string;
}

export interface ProviderPlan {
  id: string;
  label: string;
  monthlyPricePerSeat: number;
  annualPricePerSeat?: number;
  isPayPerUse?: boolean;
}

export interface ProviderJSON {
  id: string;
  name: string;
  category: string;
  vendor: string;
  primaryRole: string;
  secondaryRole?: string;
  pricing?: Record<string, number>;
  billingModels?: string[];
  capabilities: Record<string, ProviderCapability>;
  knownStrengths: string[];
  knownWeaknesses: string[];
  bestUseCases: string[];
  annualDiscountPercent?: number;
  plans?: ProviderPlan[];
  selectedPlan?: any;
  supportedModels?: string[];
  ideSupport?: string[];
}

function buildProviderJSON(provider: any, plans: any, model: any): ProviderJSON {
  return {
    id: provider.id,
    name: provider.name,
    category: provider.category,
    vendor: provider.vendor,
    primaryRole: provider.primaryRole,
    secondaryRole: provider.secondaryRole,
    pricing: plans.pricing || {},
    annualDiscountPercent: plans.annualDiscountPercent || 0,
    plans: plans.plans || [],
    billingModels: provider.billingModels || ['monthly'],
    capabilities: model.capabilities || {},
    knownStrengths: provider.knownStrengths || [],
    knownWeaknesses: provider.knownWeaknesses || [],
    bestUseCases: provider.bestUseCases || [],
    supportedModels: provider.supportedModels || [],
    ideSupport: provider.supportedPlatforms || []
  };
}

export interface ModelOption {
  modelId: string;
  name: string;
  shortName: string;
  modelObj: any;
}

export const providerModelCatalog: Record<string, { provider: any; plans: any; models: ModelOption[] }> = {
  claude: {
    provider: claudeProvider,
    plans: claudePlans,
    models: [
      { modelId: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', shortName: '3.5 Sonnet', modelObj: claudeModel },
      { modelId: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', shortName: '3.5 Haiku', modelObj: claudeHaikuModel },
      { modelId: 'claude-3-opus', name: 'Claude 3 Opus', shortName: '3 Opus', modelObj: claudeOpusModel },
    ]
  },
  chatgpt: {
    provider: chatgptProvider,
    plans: chatgptPlans,
    models: [
      { modelId: 'gpt-4o', name: 'GPT-4o', shortName: 'GPT-4o', modelObj: chatgptModel },
      { modelId: 'o1-mini', name: 'OpenAI o1-mini', shortName: 'o1-mini', modelObj: chatgptO1MiniModel },
      { modelId: 'o1', name: 'OpenAI o1', shortName: 'o1', modelObj: chatgptO1Model },
    ]
  },
  kimi: {
    provider: kimiProvider,
    plans: kimiPlans,
    models: [
      { modelId: 'kimi-k3-max', name: 'Kimi K3 Max', shortName: 'K3 Max', modelObj: kimiModel },
      { modelId: 'kimi-k3', name: 'Kimi K3', shortName: 'K3', modelObj: kimiK3Model },
      { modelId: 'kimi-k2-7-code-batch', name: 'Kimi K2.7 Code', shortName: 'K2.7 Code', modelObj: kimiBatchModel },
    ]
  },
  gemini: {
    provider: geminiProvider,
    plans: geminiPlans,
    models: [
      { modelId: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', shortName: '1.5 Pro', modelObj: geminiModel },
      { modelId: 'gemini-1-5-flash', name: 'Gemini 1.5 Flash', shortName: '1.5 Flash', modelObj: geminiFlashModel },
    ]
  },
  cursor: {
    provider: cursorProvider,
    plans: cursorPlans,
    models: [
      { modelId: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', shortName: '3.5 Sonnet', modelObj: cursorModel },
      { modelId: 'gpt-4o', name: 'GPT-4o', shortName: 'GPT-4o', modelObj: cursorGpt4oModel },
      { modelId: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', shortName: '1.5 Pro', modelObj: cursorGeminiModel },
    ]
  },
  'github-copilot': {
    provider: copilotProvider,
    plans: copilotPlans,
    models: [
      { modelId: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', shortName: '3.5 Sonnet', modelObj: copilotModel },
      { modelId: 'gpt-4o', name: 'GPT-4o', shortName: 'GPT-4o', modelObj: copilotGpt4oModel },
    ]
  },
  copilot: {
    provider: copilotProvider,
    plans: copilotPlans,
    models: [
      { modelId: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', shortName: '3.5 Sonnet', modelObj: copilotModel },
      { modelId: 'gpt-4o', name: 'GPT-4o', shortName: 'GPT-4o', modelObj: copilotGpt4oModel },
    ]
  },
  windsurf: {
    provider: windsurfProvider,
    plans: windsurfPlans,
    models: [
      { modelId: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', shortName: '3.5 Sonnet', modelObj: windsurfModel },
      { modelId: 'gpt-4o', name: 'GPT-4o', shortName: 'GPT-4o', modelObj: windsurfGpt4oModel },
    ]
  },
  perplexity: {
    provider: perplexityProvider,
    plans: perplexityPlans,
    models: [
      { modelId: 'sonar-large', name: 'Sonar Large', shortName: 'Sonar Large', modelObj: perplexityModel },
      { modelId: 'sonar-small', name: 'Sonar Small', shortName: 'Sonar Small', modelObj: perplexitySonarSmallModel },
      { modelId: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', shortName: '3.5 Sonnet', modelObj: perplexityClaudeModel },
      { modelId: 'gpt-4o', name: 'GPT-4o', shortName: 'GPT-4o', modelObj: perplexityGpt4oModel },
    ]
  },
  deepseek: {
    provider: deepseekProvider,
    plans: deepseekPlans,
    models: [
      { modelId: 'deepseek-coder-v2', name: 'DeepSeek Coder V2', shortName: 'Coder V2', modelObj: deepseekModel },
      { modelId: 'deepseek-v2-5', name: 'DeepSeek V2.5', shortName: 'V2.5', modelObj: deepseekV25Model },
    ]
  },
  codex: {
    provider: codexProvider,
    plans: codexPlans,
    models: [
      { modelId: 'openai-codex', name: 'OpenAI Codex', shortName: 'Codex', modelObj: codexModel },
    ]
  },
  'anthropic-api': {
    provider: anthropicApiProvider,
    plans: anthropicApiPlans,
    models: [
      { modelId: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', shortName: '3.5 Sonnet', modelObj: anthropicApiModel },
      { modelId: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', shortName: '3.5 Haiku', modelObj: anthropicApiHaikuModel },
      { modelId: 'claude-3-opus', name: 'Claude 3 Opus', shortName: '3 Opus', modelObj: anthropicApiOpusModel },
    ]
  },
  'openai-api': {
    provider: openaiApiProvider,
    plans: openaiApiPlans,
    models: [
      { modelId: 'gpt-4o', name: 'GPT-4o', shortName: 'GPT-4o', modelObj: openaiApiModel },
      { modelId: 'o1', name: 'OpenAI o1', shortName: 'o1', modelObj: openaiApiO1Model },
      { modelId: 'o1-mini', name: 'OpenAI o1-mini', shortName: 'o1-mini', modelObj: openaiApiO1MiniModel },
      { modelId: 'gpt-4o-mini', name: 'GPT-4o Mini', shortName: '4o Mini', modelObj: openaiApiGpt4oMiniModel },
    ]
  },
  'github-models': {
    provider: githubModelsProvider,
    plans: githubModelsPlans,
    models: [
      { modelId: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', shortName: '3.5 Sonnet', modelObj: githubModelsModel },
      { modelId: 'gpt-4o', name: 'GPT-4o', shortName: 'GPT-4o', modelObj: githubModelsGpt4oModel },
      { modelId: 'llama-3', name: 'Llama 3 70B', shortName: 'Llama 3', modelObj: githubModelsLlama3Model },
    ]
  }
};

const copilotJsonCombined = buildProviderJSON(copilotProvider, copilotPlans, copilotModel);

export const providerKnowledgeMap: Record<string, ProviderJSON> = {
  claude: buildProviderJSON(claudeProvider, claudePlans, claudeModel),
  chatgpt: buildProviderJSON(chatgptProvider, chatgptPlans, chatgptModel),
  cursor: buildProviderJSON(cursorProvider, cursorPlans, cursorModel),
  'github-copilot': copilotJsonCombined,
  copilot: copilotJsonCombined,
  gemini: buildProviderJSON(geminiProvider, geminiPlans, geminiModel),
  windsurf: buildProviderJSON(windsurfProvider, windsurfPlans, windsurfModel),
  perplexity: buildProviderJSON(perplexityProvider, perplexityPlans, perplexityModel),
  deepseek: buildProviderJSON(deepseekProvider, deepseekPlans, deepseekModel),
  codex: buildProviderJSON(codexProvider, codexPlans, codexModel),
  'anthropic-api': buildProviderJSON(anthropicApiProvider, anthropicApiPlans, anthropicApiModel),
  'openai-api': buildProviderJSON(openaiApiProvider, openaiApiPlans, openaiApiModel),
  'github-models': buildProviderJSON(githubModelsProvider, githubModelsPlans, githubModelsModel),
  kimi: buildProviderJSON(kimiProvider, kimiPlans, kimiModel),
};

export interface GlobalModelOption extends ModelOption {
  providerId: string;
  providerName: string;
  isCurrentProvider: boolean;
}

export function getProviderModels(toolId: string, auditTools: ToolEntry[] = []): GlobalModelOption[] {
  const norm = toolId.toLowerCase().trim();
  const currentEntry = providerModelCatalog[norm];

  const results: GlobalModelOption[] = [];
  const addedKeys = new Set<string>();

  // 1. Same Provider Models (Primary)
  if (currentEntry) {
    currentEntry.models.forEach(m => {
      const key = `${norm}:${m.modelId}`;
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        results.push({
          ...m,
          providerId: currentEntry.provider.id,
          providerName: currentEntry.provider.name,
          isCurrentProvider: true
        });
      }
    });
  }

  // 2. Models from other audited tools in the user's stack
  if (auditTools && auditTools.length > 0) {
    auditTools.forEach(t => {
      const tNorm = t.toolId.toLowerCase().trim();
      if (tNorm !== norm && providerModelCatalog[tNorm]) {
        const cat = providerModelCatalog[tNorm];
        cat.models.forEach(m => {
          const key = `${cat.provider.id}:${m.modelId}`;
          if (!addedKeys.has(key)) {
            addedKeys.add(key);
            results.push({
              ...m,
              providerId: cat.provider.id,
              providerName: cat.provider.name,
              isCurrentProvider: false
            });
          }
        });
      }
    });
  }

  // 3. Models from all other providers in providerModelCatalog
  Object.keys(providerModelCatalog).forEach(k => {
    const cat = providerModelCatalog[k];
    cat.models.forEach(m => {
      const key = `${cat.provider.id}:${m.modelId}`;
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        results.push({
          ...m,
          providerId: cat.provider.id,
          providerName: cat.provider.name,
          isCurrentProvider: false
        });
      }
    });
  });

  return results;
}

export function getProviderJSON(toolId: string, modelId?: string, planId?: string): ProviderJSON | null {
  const normalized = toolId.toLowerCase().trim();
  const cat = providerModelCatalog[normalized];
  if (!cat) {
    const base = providerKnowledgeMap[normalized] || null;
    if (base && planId && (base as any).plans) {
      const pSlug = planId.toLowerCase().trim();
      const foundPlan = (base as any).plans.find((p: any) => p.id.toLowerCase() === pSlug || p.label?.toLowerCase() === pSlug);
      if (foundPlan) {
        return { ...base, selectedPlan: foundPlan };
      }
    }
    return base;
  }

  let targetModelObj = cat.models[0].modelObj;
  if (modelId) {
    const slug = modelId.toLowerCase().trim();
    const target = cat.models.find(m => m.modelId.toLowerCase() === slug || m.name.toLowerCase() === slug || m.shortName.toLowerCase() === slug);
    if (target) {
      targetModelObj = target.modelObj;
    }
  }

  const baseJSON = buildProviderJSON(cat.provider, cat.plans, targetModelObj);
  if (planId && cat.plans && (cat.plans as any).plans) {
    const pSlug = planId.toLowerCase().trim();
    const foundPlan = (cat.plans as any).plans.find((p: any) => p.id.toLowerCase() === pSlug || p.label?.toLowerCase() === pSlug);
    if (foundPlan) {
      return { ...baseJSON, selectedPlan: foundPlan };
    }
  }

  return baseJSON;
}

export function deriveSubscriptionValue(
  confidenceScore: number | undefined,
  potentialSaving: number,
  currentSpend: number,
  insightType?: string
): 'Excellent' | 'Good' | 'Average' | 'Poor' {
  if (insightType === 'already_optimal' || potentialSaving === 0) return 'Excellent';
  if (insightType === 'annual_discount') return 'Good';
  const score = confidenceScore ?? 70;
  const wasteRatio = currentSpend > 0 ? potentialSaving / currentSpend : 0;
  if (wasteRatio > 0.4) return 'Poor';
  if (wasteRatio > 0.2) return 'Average';
  if (score >= 85 && wasteRatio < 0.05) return 'Excellent';
  return 'Good';
}

// ─── Audit-Aware Health Assessment Builder ─────────────────────────────────────

export interface AuditAwareHealthReport {
  provider: ProviderJSON;
  subscriptionValue: 'Excellent' | 'Good' | 'Average' | 'Poor';
  executiveSummary: string;
  billingAnalysis: {
    monthlySpend: number;
    recommendedMonthlySpend: number;
    potentialSaving: number;
    annualDiscountAvailable: boolean;
    annualDiscountPercent: number;
    annualSavingsAmount: number;
    tradeoffs?: string;
  };
  premiumFeatures: { name: string; available: boolean; auditContext: string }[];
  activelyUsedFeatures: { name: string; context: string }[];
  underutilizedFeatures: { name: string; context: string }[];
  quickFacts: { label: string; value: string; highlight?: boolean }[];
  bestUseCases: string[];
  dynamicCompetitorComparison: { competitor: string; reasons: string[] }[];
  consultantVerdict: string;
}

export function buildAuditAwareReport(
  insight: Insight,
  auditTools: ToolEntry[] = [],
  primaryUseCase?: UseCase
): AuditAwareHealthReport | null {
  const currentToolEntry = auditTools.find((t) => t.toolId === insight.toolId);
  const provider = getProviderJSON(insight.toolId, currentToolEntry?.modelId, currentToolEntry?.plan);
  if (!provider) return null;

  const selectedPlan = (provider as any).selectedPlan;
  const planLabel = selectedPlan ? selectedPlan.label : (currentToolEntry?.plan || '');

  const seats = currentToolEntry?.seats || 1;
  const monthlySpend = insight.currentMonthlySpend || currentToolEntry?.monthlySpend || 0;
  const saving = insight.potentialMonthlySaving || 0;
  const annualSaving = Math.round(saving * 12);
  const subscriptionValue = deriveSubscriptionValue(insight.confidenceScore, saving, monthlySpend, insight.type);

  const annualDiscountPercent = provider.annualDiscountPercent || (provider.billingModels?.includes('annual') ? 15 : 0);
  const annualDiscountAvailable = annualDiscountPercent > 0;
  const annualSavingsAmount = annualDiscountAvailable && monthlySpend > 0
    ? Math.round((monthlySpend * annualDiscountPercent) / 100 * 12)
    : 0;

  const useCaseFocus = primaryUseCase || currentToolEntry?.useCase || 'mixed';
  const formattedUseCase = useCaseFocus === 'mixed' ? 'mixed/general' : useCaseFocus;

  // ── Dynamic scale classifiers ─────────────────────────────────
  // Seat scale: solo (1), small (2-4), medium (5-14), large (15+)
  const seatScale: 'solo' | 'small' | 'medium' | 'large' =
    seats === 1 ? 'solo' : seats <= 4 ? 'small' : seats <= 14 ? 'medium' : 'large';

  // Spend magnitude: trivial (<$30), moderate ($30-$99), significant ($100-$499), enterprise ($500+)
  const spendScale: 'trivial' | 'moderate' | 'significant' | 'enterprise' =
    monthlySpend < 30 ? 'trivial' : monthlySpend < 100 ? 'moderate' : monthlySpend < 500 ? 'significant' : 'enterprise';

  // Annual savings urgency: negligible (<$60), notable ($60-$299), strong ($300-$999), critical ($1000+)
  const savingsUrgency: 'negligible' | 'notable' | 'strong' | 'critical' =
    annualSaving < 60 ? 'negligible' : annualSaving < 300 ? 'notable' : annualSaving < 1000 ? 'strong' : 'critical';

  const planStr = planLabel ? `${provider.name} ${planLabel}` : provider.name;
  const seatStr = seats === 1 ? '1 seat' : `${seats} seats`;
  const spendStr = `$${monthlySpend}/mo`;

  // ── Helper: seat-scale context phrase ────────────────────────
  function seatContext(): string {
    if (seatScale === 'solo') return 'your individual setup';
    if (seatScale === 'small') return `your ${seats}-person team`;
    if (seatScale === 'medium') return `your ${seats}-seat team`;
    return `your ${seats}-seat organization`;
  }

  // ── Helper: spend-scale qualifier ────────────────────────────
  function spendQualifier(): string {
    if (spendScale === 'trivial') return 'a modest';
    if (spendScale === 'moderate') return 'a moderate';
    if (spendScale === 'significant') return 'a significant';
    return 'an enterprise-level';
  }

  // ── Helper: savings-urgency framing ──────────────────────────
  function savingsFrame(savingMo: number, savingYr: number): string {
    if (savingsUrgency === 'negligible') return `saves $${savingMo}/mo ($${savingYr}/year)`;
    if (savingsUrgency === 'notable') return `recovers $${savingMo}/mo — $${savingYr}/year in contract savings`;
    if (savingsUrgency === 'strong') return `unlocks $${savingMo}/mo in savings ($${savingYr}/year) — a material cost reduction`;
    return `saves $${savingMo}/mo ($${savingYr}/year) — a substantial annual contract gain that should be prioritized`;
  }

  // ── Executive Summary — Dynamic, insight-type specific ───────
  let executiveSummary = '';

  if (insight.type === 'annual_discount') {
    if (savingsUrgency === 'negligible') {
      executiveSummary = `Your ${planStr} subscription (${seatStr}) is on ${spendQualifier()} monthly outlay of ${spendStr}. Switching to annual billing ${savingsFrame(saving, annualSaving)}. The saving is modest, but there is no risk — zero feature or workflow changes.`;
    } else if (savingsUrgency === 'notable') {
      executiveSummary = `Your ${planStr} subscription (${seatStr}, ${spendStr}) is paying month-to-month when an annual contract is available at a lower rate. Switching ${savingsFrame(saving, annualSaving)} with no change to active features.`;
    } else if (savingsUrgency === 'strong') {
      executiveSummary = `Your ${planStr} subscription (${seatStr}) carries ${spendQualifier()} monthly commitment of ${spendStr} on a monthly billing cycle. An annual contract ${savingsFrame(saving, annualSaving)}. At this scale, the billing switch is the clearest near-term optimization available.`;
    } else {
      executiveSummary = `Your ${planStr} subscription (${seatStr}) represents ${spendQualifier()} monthly spend of ${spendStr}. You are paying month-to-month at a premium when an annual contract is available. Switching ${savingsFrame(saving, annualSaving)}. At this organization scale, this billing decision has a material P&L impact.`;
    }
  } else if (insight.type === 'unused_seats') {
    executiveSummary = `Your ${planStr} subscription is provisioned for ${seatStr}, but your audit context identifies active utilization for fewer users. You are carrying ${spendQualifier()} outlay of ${spendStr} with idle seat allocations. Reducing unused seats ${savingsFrame(saving, annualSaving)} immediately, with no capacity loss.`;
  } else if (insight.type === 'overpaid_plan') {
    executiveSummary = `Your ${planStr} subscription (${seatStr}) is on ${spendQualifier()} monthly outlay of ${spendStr}. Based on your ${formattedUseCase} workflow and current team size, this tier includes premium features that are not actively utilized. Adjusting your plan ${savingsFrame(saving, annualSaving)} while retaining core capabilities.`;
  } else if (insight.type === 'cheaper_alternative') {
    executiveSummary = `Your current ${planStr} setup for ${seatContext()} costs ${spendStr}. Based on your ${formattedUseCase} requirements, ${insight.suggestion} ${savingsFrame(saving, annualSaving)}.`;
  } else if (insight.type === 'overlapping_tools') {
    executiveSummary = `Your ${planStr} subscription has significant functional overlap with other tools in your active stack. Consolidating platforms ${savingsFrame(saving, annualSaving)} without reducing capability coverage.`;
  } else if (saving > 0) {
    executiveSummary = `Your ${planStr} subscription (${seatStr}, ${spendStr}) has an available optimization opportunity. ${insight.suggestion} ${savingsFrame(saving, annualSaving)} for ${seatContext()}.`;
  } else {
    // already_optimal — use spend + seat scale to vary the message
    if (seatScale === 'solo') {
      executiveSummary = `Your ${planStr} individual subscription (${spendStr}) is well-configured for your ${formattedUseCase} workflow. No pricing tier, seat, or billing optimizations are available at this time.`;
    } else if (seatScale === 'small') {
      executiveSummary = `Your ${planStr} subscription for ${seatContext()} (${spendStr}) is correctly sized. The current plan tier, seat allocation, and billing structure are appropriate for your ${formattedUseCase} workflow.`;
    } else if (seatScale === 'medium') {
      executiveSummary = `Your ${planStr} subscription for ${seatContext()} carries ${spendQualifier()} monthly outlay of ${spendStr}. The current plan and seat configuration are validated for your ${formattedUseCase} requirements. No immediate reconfiguration is recommended.`;
    } else {
      executiveSummary = `Your ${planStr} subscription at ${seatContext()} scale represents ${spendQualifier()} monthly commitment of ${spendStr}. The current plan tier and seat allocation are validated. At this scale, continue to review utilization data periodically to ensure seat density remains aligned with actual usage.`;
    }
  }


  // Premium Features (Plan-Aware)
  const premiumFeatures: { name: string; available: boolean; auditContext: string }[] = [];
  if (selectedPlan && selectedPlan.features && selectedPlan.features.length > 0) {
    selectedPlan.features.forEach((feat: string) => {
      premiumFeatures.push({
        name: feat,
        available: true,
        auditContext: `Included in ${selectedPlan.label} tier`
      });
    });
  } else {
    premiumFeatures.push(
      {
        name: 'Deep Reasoning & Logic',
        available: (provider.capabilities.reasoning?.score || 0) >= 8,
        auditContext: (provider.capabilities.reasoning?.score || 0) >= 8 ? 'Core strength active in workflow' : 'Standard capability',
      },
      {
        name: 'Extended Context Window',
        available: (provider.capabilities.longContext?.score || 0) >= 7 || (provider.capabilities.largeCodebaseUnderstanding?.score || 0) >= 7,
        auditContext: 'Large document synthesis supported; limited daily utilization',
      },
      {
        name: 'Vision & Screenshot Parsing',
        available: (provider.capabilities.vision?.score || 0) >= 7 || (provider.capabilities.imageUnderstanding?.score || 0) >= 7,
        auditContext: 'Visual input supported for architecture & diagram analysis',
      },
      {
        name: 'IDE Autocomplete & Agent',
        available: (provider.capabilities.autocomplete?.score || 0) >= 7 || (provider.capabilities.aiAgent?.score || 0) >= 7,
        auditContext: (provider.capabilities.aiAgent?.score || 0) >= 7 ? 'Inline coding agent enabled' : 'Chat-only workspace',
      },
      {
        name: 'Enterprise Security & SSO',
        available: (provider.capabilities.enterpriseSecurity?.score || 0) >= 7 || (provider.capabilities.sso?.score || 0) >= 7,
        auditContext: 'SOC2 compliant; data training disabled',
      }
    );
  }

  // Actively Used vs Underutilized Features (Workflow-Aware)
  const activelyUsedFeatures: { name: string; context: string }[] = [];
  const underutilizedFeatures: { name: string; context: string }[] = [];

  const caps = provider.capabilities || {};

  // Capability scores map
  const reasoningScore = caps.reasoning?.score || 0;
  const codingScore = caps.coding?.score || 0;
  const writingScore = caps.writing?.score || 0;
  const researchScore = caps.research?.score || 0;
  const visionScore = caps.vision?.score || caps.imageUnderstanding?.score || 0;
  const autocompleteScore = caps.autocomplete?.score || 0;
  const agentScore = caps.aiAgent?.score || 0;
  const longContextScore = caps.longContext?.score || caps.largeCodebaseUnderstanding?.score || 0;
  const voiceScore = caps.voice?.score || 0;
  const memoryScore = caps.memory?.score || 0;

  if (useCaseFocus === 'coding') {
    if (codingScore >= 7) activelyUsedFeatures.push({ name: 'Code Generation & Syntax', context: 'Core developer workflow' });
    if (autocompleteScore >= 7 || provider.category === 'ide') activelyUsedFeatures.push({ name: 'IDE Autocomplete & Integration', context: 'Inline editor assistance active' });
    if (agentScore >= 7) activelyUsedFeatures.push({ name: 'Autonomous Agent & Terminal', context: 'Multi-file edits & debugging active' });
    if (longContextScore >= 7) activelyUsedFeatures.push({ name: 'Repository & Codebase Indexing', context: 'Semantic codebase chat active' });
    if (reasoningScore >= 8) activelyUsedFeatures.push({ name: 'Logic & Architecture Reasoning', context: 'Complex refactoring support' });

    if (voiceScore < 6) underutilizedFeatures.push({ name: 'Voice Mode Interaction', context: 'Rarely used for software engineering' });
    if (writingScore >= 7) underutilizedFeatures.push({ name: 'Writing & Marketing Templates', context: 'Non-coding feature outside dev workflow' });
    if (memoryScore >= 7) underutilizedFeatures.push({ name: 'Custom GPTs & Memory Base', context: 'Low team adoption for pure coding tasks' });
  } else if (useCaseFocus === 'writing') {
    if (writingScore >= 7 || reasoningScore >= 7) activelyUsedFeatures.push({ name: 'Writing & Composition Quality', context: 'Primary content creation workflow' });
    if (caps.editing?.score || 7) activelyUsedFeatures.push({ name: 'Editing, Grammar & Rewriting', context: 'Refining tone & document structure' });
    if (longContextScore >= 7) activelyUsedFeatures.push({ name: 'Long-Form Document Generation', context: 'Extended manuscript & report drafting' });
    if (reasoningScore >= 8) activelyUsedFeatures.push({ name: 'Content Planning & Structure', context: 'Outlining & logical flow' });

    if (provider.category === 'ide' || autocompleteScore >= 7) underutilizedFeatures.push({ name: 'IDE & Terminal Integration', context: 'Developer tooling irrelevant for content creation' });
    if (codingScore >= 7) underutilizedFeatures.push({ name: 'Code Generation & Autocomplete', context: 'Paid in subscription but unused by writers' });
    if (caps.api?.score || 0) underutilizedFeatures.push({ name: 'Developer Console & API Keys', context: 'Unused technical features' });
  } else if (useCaseFocus === 'research') {
    if (researchScore >= 7 || caps.webSearch?.score || 7) activelyUsedFeatures.push({ name: 'Web Search & Real-Time Grounding', context: 'Live web & cited search active' });
    if (longContextScore >= 7) activelyUsedFeatures.push({ name: 'Long-Context & PDF Synthesis', context: 'Parsing lengthy whitepapers & docs' });
    if (reasoningScore >= 8) activelyUsedFeatures.push({ name: 'Deep Research & Multi-Step Reasoning', context: 'Complex investigative synthesis' });
    if (visionScore >= 7) activelyUsedFeatures.push({ name: 'Document & Diagram Visual Parsing', context: 'Extracting data from charts & images' });

    if (provider.category === 'ide' || autocompleteScore >= 7) underutilizedFeatures.push({ name: 'IDE Extensions & Autocomplete', context: 'Developer editor tooling outside research scope' });
    if (codingScore >= 7) underutilizedFeatures.push({ name: 'Code Interpreter & Syntax Execution', context: 'Technical code generation underutilized' });
    if (voiceScore < 6) underutilizedFeatures.push({ name: 'Voice Interaction Mode', context: 'Secondary feature for research synthesis' });
  } else if (useCaseFocus === 'data') {
    if (codingScore >= 7 || caps.codeInterpreter?.score || 7) activelyUsedFeatures.push({ name: 'Python Execution & Code Interpreter', context: 'Data transformation & analysis' });
    if (reasoningScore >= 8) activelyUsedFeatures.push({ name: 'Data Reasoning & Quantitative Logic', context: 'Statistical evaluation & calculations' });
    if (visionScore >= 7) activelyUsedFeatures.push({ name: 'Chart & Visualization Generation', context: 'Rendering plots & visual reports' });
    if (longContextScore >= 7) activelyUsedFeatures.push({ name: 'CSV & Large Dataset Support', context: 'Parsing tabular data files' });

    if (voiceScore < 6) underutilizedFeatures.push({ name: 'Voice Mode Interaction', context: 'Unused for quantitative analytical tasks' });
    if (writingScore >= 7) underutilizedFeatures.push({ name: 'Content Writing Templates', context: 'Outside quantitative data focus' });
    if (autocompleteScore >= 7) underutilizedFeatures.push({ name: 'Inline IDE Autocomplete', context: 'Full IDE extensions underutilized' });
  } else {
    // Mixed / General (Balanced default)
    if (reasoningScore >= 8) activelyUsedFeatures.push({ name: 'Reasoning & Architecture Logic', context: 'High daily adoption across team' });
    if (codingScore >= 8) activelyUsedFeatures.push({ name: 'Code Generation', context: 'Primary team workflow' });
    if (visionScore >= 7) activelyUsedFeatures.push({ name: 'Visual Parsing', context: 'Used for screenshot & diagram input' });

    if (memoryScore >= 7) underutilizedFeatures.push({ name: 'Workspace Projects & Memory', context: 'Paid in plan tier but low team utilization' });
    if (voiceScore < 5) underutilizedFeatures.push({ name: 'Voice Mode Interaction', context: 'Feature not supported or utilized' });
    if (longContextScore >= 8) underutilizedFeatures.push({ name: '200k Token Context Window', context: 'Rarely required for standard daily tasks' });
  }

  // Quick Facts (Sourced 100% from JSON)
  const quickFacts = [
    { label: 'Primary Role', value: provider.primaryRole, highlight: true },
    { label: 'Vendor', value: provider.vendor },
    { label: 'Reasoning Score', value: `${provider.capabilities.reasoning?.score || 7}/10` },
    { label: 'Coding Score', value: `${provider.capabilities.coding?.score || 7}/10` },
    { label: 'Context Limit', value: provider.capabilities.longContext?.evidence ? provider.capabilities.longContext.evidence.split(' ')[0] || '128k' : '128k' },
    { label: 'Security Rating', value: provider.capabilities.enterpriseSecurity?.score && provider.capabilities.enterpriseSecurity.score >= 8 ? 'SOC2 Certified' : 'Standard' },
  ];

  // Dynamic Competitor Comparison (Audit-Aware)
  const dynamicCompetitorComparison: { competitor: string; reasons: string[] }[] = [];

  if (provider.category === 'chat' && (primaryUseCase === 'coding' || !primaryUseCase)) {
    dynamicCompetitorComparison.push({
      competitor: 'Cursor ($20/mo)',
      reasons: [
        'Your team performs frequent IDE development where Cursor provides native multi-file editing and terminal execution.',
        'Eliminates copy-pasting code between browser chat and VS Code.',
      ],
    });
  }
  if (provider.category === 'chat' && provider.id === 'claude') {
    dynamicCompetitorComparison.push({
      competitor: 'ChatGPT Plus ($20/mo)',
      reasons: [
        'If your workflow requires real-time web search grounding, ChatGPT provides live web search integration.',
        'Includes Advanced Voice Mode for real-time oral interaction.',
      ],
    });
  }
  if (provider.id === 'cursor') {
    dynamicCompetitorComparison.push({
      competitor: 'GitHub Copilot ($10–$19/mo)',
      reasons: [
        'If your team works inside JetBrains IDEs or requires enterprise IP indemnification.',
        'Lower per-seat monthly cost for basic autocomplete requirements.',
      ],
    });
  }

  // Consultant Verdict (Audit-Aware, Scale-Dynamic)
  let consultantVerdict = '';
  if (insight.type === 'annual_discount') {
    if (savingsUrgency === 'negligible') {
      consultantVerdict = `The ${planStr} plan tier is correctly selected. Switch to annual billing to capture the available $${annualSaving}/year saving — a simple billing change with no operational impact.`;
    } else if (savingsUrgency === 'notable') {
      consultantVerdict = `${planStr} tier is appropriate for ${seatContext()}. Execute the annual billing switch to lock in $${annualSaving}/year in contract savings — zero feature or capability changes required.`;
    } else if (savingsUrgency === 'strong') {
      consultantVerdict = `At ${seatStr} and ${spendStr}, switching ${planStr} to annual billing is the highest-priority action. It unlocks $${saving}/mo ($${annualSaving}/year) with no disruption. This should be actioned in the current billing cycle.`;
    } else {
      consultantVerdict = `With ${seatStr} at ${spendStr}, the annual billing switch on ${planStr} is a critical cost action — recovering $${annualSaving}/year. At this organizational scale, continuing on monthly billing is a significant avoidable cost. Prioritize this immediately.`;
    }
  } else if (insight.type === 'unused_seats') {
    consultantVerdict = `Trimming idle seat allocations from ${planStr} recovers $${saving}/mo ($${annualSaving}/year) for ${seatContext()} immediately, without affecting any active team members.`;
  } else if (insight.type === 'overpaid_plan') {
    consultantVerdict = `Right-sizing ${planStr} to ${insight.suggestion} reduces per-seat costs by $${saving}/mo ($${annualSaving}/year) for ${seatContext()} while preserving core feature coverage.`;
  } else if (saving > 0) {
    consultantVerdict = `Executing this optimization saves $${saving}/mo ($${annualSaving}/year) for ${seatContext()}. We recommend ${insight.suggestion.toLowerCase()} immediately.`;
  } else if (annualDiscountAvailable && monthlySpend >= 40 && (insight.type as string) !== 'annual_discount') {
    if (spendScale === 'enterprise' || spendScale === 'significant') {
      consultantVerdict = `Your ${planStr} tier is validated for ${seatContext()} (${spendStr}). Switching to annual billing would additionally lock in $${annualSavingsAmount}/year in contract savings — the most actionable next step at this spend level.`;
    } else {
      consultantVerdict = `Your ${planStr} subscription tier is optimal for ${seatContext()}. Switch to annual billing to additionally lock in $${annualSavingsAmount}/year in contract savings.`;
    }
  } else {
    if (seatScale === 'large' || spendScale === 'enterprise') {
      consultantVerdict = `Your ${planStr} configuration is validated for ${seatContext()} (${spendStr}). At this scale, maintain current configuration and review seat utilization data quarterly to stay ahead of over-provisioning.`;
    } else {
      consultantVerdict = `Your ${planStr} setup is fully optimized for ${seatContext()}. Retain your current plan to preserve team velocity and workflow continuity.`;
    }
  }

  return {
    provider,
    subscriptionValue,
    executiveSummary,
    billingAnalysis: {
      monthlySpend,
      recommendedMonthlySpend: insight.recommendedMonthlySpend || monthlySpend - saving,
      potentialSaving: saving,
      annualDiscountAvailable,
      annualDiscountPercent,
      annualSavingsAmount,
      tradeoffs: insight.tradeoffs,
    },
    premiumFeatures,
    activelyUsedFeatures,
    underutilizedFeatures,
    quickFacts,
    bestUseCases: provider.bestUseCases || [],
    dynamicCompetitorComparison,
    consultantVerdict,
  };
}
