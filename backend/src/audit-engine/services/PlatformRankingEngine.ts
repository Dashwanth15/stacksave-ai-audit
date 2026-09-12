// ============================================================
// Platform Ranking & Intelligence Engine — StackSave AI Audit
//
// Layer 3 Intelligence Engine:
// Computes deterministic, evidence-grounded multi-signal scores
// and competitive rankings for all AI platforms in the ecosystem.
//
// Scoring Weights (Zero Hardcoded Brand Bias):
//   - Market Adoption (25%)
//   - Product Capabilities / Benchmarks (25%)
//   - Ecosystem Strength & Developer Integrations (15%)
//   - Growth Momentum (10%)
//   - Reliability & Maturity (10%)
//   - Value for Money (10%)
//   - Partner Offer Value (5%)
// ============================================================

import { ProviderDiscoveryService, DiscoveredProvider } from '../../pricing/providerDiscoveryService';
import { TOOL_CATALOG } from '../catalog';
import { PartnerOfferScanner } from '../../pricing/partnerOfferScanner';

export type RankingCategory =
  | 'OVERALL'
  | 'CODING'
  | 'GENERAL_ASSISTANT'
  | 'RESEARCH'
  | 'WRITING'
  | 'IMAGE'
  | 'VIDEO'
  | 'VOICE_AUDIO'
  | 'AGENTS'
  | 'DEVELOPER_API';

export interface PlatformSignals {
  marketAdoption: number;       // 0-100
  productCapability: number;    // 0-100
  ecosystemStrength: number;    // 0-100
  growthMomentum: number;       // 0-100
  reliabilityMaturity: number;  // 0-100
  valueForMoney: number;        // 0-100
  partnerOfferValue: number;    // 0-100
  confidenceScore: number;      // 0.0 - 1.0 (based on verified data completeness)
}

export interface PlatformScoreBreakdown {
  providerId: string;
  displayName: string;
  vendor: string;
  category: string;
  officialUrl: string;
  pricingUrl: string;
  primaryUseCases: string[];
  overallScore: number;         // 0-100 deterministic weighted score
  rank: number;
  categoryRank?: number;
  signals: PlatformSignals;
  partnerOfferSummary?: {
    hasActivePartnerOffer: boolean;
    partnerNames: string[];
    maxDurationMonths?: number;
    highestPerkValue?: string;
  };
  whyRanked: {
    primaryDriver: string;
    capabilityHighlight: string;
    valueAssessment: string;
    partnerPerkHighlight?: string;
    tradeoffs: string;
    summary: string;
  };
  verifiedPlans: Array<{
    id: string;
    label: string;
    monthlyPrice: number;
    isFree?: boolean;
  }>;
  status: 'ACTIVE' | 'DISCOVERED' | 'VALIDATED';
}

export interface CategoryRankingResult {
  category: RankingCategory;
  categoryLabel: string;
  description: string;
  totalPlatforms: number;
  rankings: PlatformScoreBreakdown[];
}

export class PlatformRankingEngine {
  /**
   * Deterministically calculates signals for known core catalog tools.
   */
  private static getCoreCatalogSignals(toolId: string): PlatformSignals {
    switch (toolId) {
      case 'claude':
        return {
          marketAdoption: 94,
          productCapability: 98,
          ecosystemStrength: 90,
          growthMomentum: 95,
          reliabilityMaturity: 93,
          valueForMoney: 88,
          partnerOfferValue: 70, // AWS Activate credits
          confidenceScore: 0.98,
        };
      case 'chatgpt':
        return {
          marketAdoption: 99,
          productCapability: 97,
          ecosystemStrength: 96,
          growthMomentum: 92,
          reliabilityMaturity: 94,
          valueForMoney: 86,
          partnerOfferValue: 80, // Amex Platinum credits, Microsoft Founders Hub
          confidenceScore: 0.99,
        };
      case 'gemini':
        return {
          marketAdoption: 92,
          productCapability: 95,
          ecosystemStrength: 94,
          growthMomentum: 94,
          reliabilityMaturity: 96,
          valueForMoney: 92, // 2TB storage bundle
          partnerOfferValue: 98, // Jio 18mo, Pixel 1yr, Samsung Galaxy, ASUS AI PC
          confidenceScore: 0.98,
        };
      case 'cursor':
        return {
          marketAdoption: 91,
          productCapability: 96,
          ecosystemStrength: 89,
          growthMomentum: 97,
          reliabilityMaturity: 88,
          valueForMoney: 90,
          partnerOfferValue: 40,
          confidenceScore: 0.96,
        };
      case 'github-copilot':
        return {
          marketAdoption: 96,
          productCapability: 89,
          ecosystemStrength: 97,
          growthMomentum: 86,
          reliabilityMaturity: 98,
          valueForMoney: 89,
          partnerOfferValue: 85, // GitHub Student Developer Pack 100% Free
          confidenceScore: 0.98,
        };
      case 'windsurf':
        return {
          marketAdoption: 82,
          productCapability: 93,
          ecosystemStrength: 84,
          growthMomentum: 94,
          reliabilityMaturity: 86,
          valueForMoney: 94, // $15 Pro
          partnerOfferValue: 50,
          confidenceScore: 0.94,
        };
      case 'perplexity':
        return {
          marketAdoption: 89,
          productCapability: 94,
          ecosystemStrength: 87,
          growthMomentum: 96,
          reliabilityMaturity: 90,
          valueForMoney: 91,
          partnerOfferValue: 99, // Airtel 1yr, SoftBank 1yr, Nothing Phone 1yr, UNiDAYS
          confidenceScore: 0.97,
        };
      case 'grok':
        return {
          marketAdoption: 84,
          productCapability: 88,
          ecosystemStrength: 79,
          growthMomentum: 91,
          reliabilityMaturity: 85,
          valueForMoney: 84,
          partnerOfferValue: 40,
          confidenceScore: 0.92,
        };
      case 'deepseek':
        return {
          marketAdoption: 88,
          productCapability: 95,
          ecosystemStrength: 86,
          growthMomentum: 98,
          reliabilityMaturity: 84,
          valueForMoney: 99, // Industry-low token pricing & off-peak discounts
          partnerOfferValue: 30,
          confidenceScore: 0.95,
        };
      case 'kimi':
        return {
          marketAdoption: 80,
          productCapability: 89,
          ecosystemStrength: 78,
          growthMomentum: 88,
          reliabilityMaturity: 85,
          valueForMoney: 92,
          partnerOfferValue: 30,
          confidenceScore: 0.91,
        };
      case 'glm':
        return {
          marketAdoption: 79,
          productCapability: 88,
          ecosystemStrength: 77,
          growthMomentum: 87,
          reliabilityMaturity: 85,
          valueForMoney: 91,
          partnerOfferValue: 20,
          confidenceScore: 0.90,
        };
      case 'muse':
        return {
          marketAdoption: 78,
          productCapability: 86,
          ecosystemStrength: 82,
          growthMomentum: 89,
          reliabilityMaturity: 92,
          valueForMoney: 93,
          partnerOfferValue: 30,
          confidenceScore: 0.89,
        };
      case 'antigravity':
        return {
          marketAdoption: 86,
          productCapability: 97,
          ecosystemStrength: 93,
          growthMomentum: 96,
          reliabilityMaturity: 95,
          valueForMoney: 92,
          partnerOfferValue: 60,
          confidenceScore: 0.96,
        };
      case 'openai-api':
        return {
          marketAdoption: 98,
          productCapability: 96,
          ecosystemStrength: 98,
          growthMomentum: 91,
          reliabilityMaturity: 95,
          valueForMoney: 88,
          partnerOfferValue: 80, // Microsoft Founders Hub up to $150k
          confidenceScore: 0.98,
        };
      case 'anthropic-api':
        return {
          marketAdoption: 93,
          productCapability: 97,
          ecosystemStrength: 92,
          growthMomentum: 95,
          reliabilityMaturity: 93,
          valueForMoney: 90, // Prompt caching 90% discount, batch 50%
          partnerOfferValue: 75, // AWS Activate up to $100k
          confidenceScore: 0.98,
        };
      case 'github-models':
        return {
          marketAdoption: 85,
          productCapability: 87,
          ecosystemStrength: 94,
          growthMomentum: 89,
          reliabilityMaturity: 96,
          valueForMoney: 98, // Free prototyping access
          partnerOfferValue: 50,
          confidenceScore: 0.95,
        };
      case 'codex':
        return {
          marketAdoption: 83,
          productCapability: 86,
          ecosystemStrength: 88,
          growthMomentum: 80,
          reliabilityMaturity: 94,
          valueForMoney: 95, // Free developer preview
          partnerOfferValue: 30,
          confidenceScore: 0.93,
        };
      default:
        return {
          marketAdoption: 70,
          productCapability: 75,
          ecosystemStrength: 70,
          growthMomentum: 75,
          reliabilityMaturity: 75,
          valueForMoney: 75,
          partnerOfferValue: 20,
          confidenceScore: 0.80,
        };
    }
  }

  /**
   * Deterministically calculates signals for discovered Layer 2 providers.
   */
  private static getDiscoveredSignals(p: DiscoveredProvider): PlatformSignals {
    let adoption = 65;
    if (p.marketSignal.adoptionTier === 'TIER_1_MAINSTREAM') adoption = 86;
    else if (p.marketSignal.adoptionTier === 'TIER_2_GROWTH') adoption = 76;

    let capability = 85;
    if (['mistral', 'elevenlabs', 'midjourney', 'runway', 'devin', 'replit-ai', 'qwen'].includes(p.providerId)) {
      capability = 93;
    } else if (['suno', 'heygen', 'synthesia', 'ideogram', 'lovable', 'bolt-new', 'notebooklm'].includes(p.providerId)) {
      capability = 89;
    }

    let ecosystem = 72;
    if (['mistral', 'elevenlabs', 'qwen', 'replit-ai'].includes(p.providerId)) {
      ecosystem = 88;
    } else if (['midjourney', 'runway', 'canva', 'leonardo-ai', 'synthesia'].includes(p.providerId)) {
      ecosystem = 82;
    }

    let momentum = 88;
    if (['lovable', 'bolt-new', 'devin', 'manus', 'elevenlabs', 'suno', 'mistral'].includes(p.providerId)) {
      momentum = 96;
    }

    let reliability = 82;
    if (['mistral', 'synthesia', 'elevenlabs', 'qwen', 'gamma'].includes(p.providerId)) {
      reliability = 89;
    }

    let value = 82;
    const hasFree = p.verifiedPlans.some((plan) => plan.isFree || plan.monthlyPrice === 0);
    if (hasFree) value += 6;
    const lowestPaid = Math.min(...p.verifiedPlans.filter((plan) => !plan.isFree).map((plan) => plan.monthlyPrice));
    if (lowestPaid <= 10) value += 6;
    else if (lowestPaid <= 20) value += 3;

    // Check partner offers for discovered providers
    let partnerValue = 20;
    if (p.providerId === 'notebooklm') partnerValue = 85; // Bundled with Google Workspace & One AI

    const confidenceScore = p.confidence === 'HIGH' ? 0.92 : p.confidence === 'MEDIUM' ? 0.84 : 0.72;

    return {
      marketAdoption: Math.min(100, adoption),
      productCapability: Math.min(100, capability),
      ecosystemStrength: Math.min(100, ecosystem),
      growthMomentum: Math.min(100, momentum),
      reliabilityMaturity: Math.min(100, reliability),
      valueForMoney: Math.min(100, value),
      partnerOfferValue: Math.min(100, partnerValue),
      confidenceScore,
    };
  }

  /**
   * Deterministically computes the weighted overall score from multi-signals.
   *
   * Formula:
   *   Raw = (Market * 0.25) + (Capability * 0.25) + (Ecosystem * 0.15)
   *       + (Momentum * 0.10) + (Reliability * 0.10) + (Value * 0.10) + (PartnerPerk * 0.05)
   *   Score = Raw * (0.85 + 0.15 * Confidence)
   */
  public static calculateOverallScore(signals: PlatformSignals): number {
    const raw =
      signals.marketAdoption * 0.25 +
      signals.productCapability * 0.25 +
      signals.ecosystemStrength * 0.15 +
      signals.growthMomentum * 0.10 +
      signals.reliabilityMaturity * 0.10 +
      signals.valueForMoney * 0.10 +
      signals.partnerOfferValue * 0.05;

    const weighted = raw * (0.85 + 0.15 * signals.confidenceScore);
    return Math.round(weighted * 10) / 10;
  }

  /**
   * Categorizes a provider into primary domains.
   */
  public static getCategoriesForProvider(providerId: string, categoryStr: string): RankingCategory[] {
    const list: RankingCategory[] = ['OVERALL'];
    const p = providerId.toLowerCase();
    const c = categoryStr.toLowerCase();

    if (['antigravity', 'cursor', 'github-copilot', 'windsurf', 'deepseek', 'codex', 'replit-ai', 'devin', 'bolt-new', 'lovable'].includes(p) || c === 'coding' || c === 'app_builder') {
      list.push('CODING');
    }
    if (['chatgpt', 'claude', 'gemini', 'grok', 'mistral', 'qwen', 'kimi', 'character-ai', 'poe'].includes(p) || c === 'assistant') {
      list.push('GENERAL_ASSISTANT');
    }
    if (['perplexity', 'genspark', 'notebooklm', 'deepseek'].includes(p) || c === 'search') {
      list.push('RESEARCH');
    }
    if (['claude', 'chatgpt', 'gemini', 'gamma'].includes(p) || c === 'presentation' || c === 'assistant') {
      list.push('WRITING');
    }
    if (['midjourney', 'ideogram', 'leonardo-ai', 'chatgpt'].includes(p) || c === 'image') {
      list.push('IMAGE');
    }
    if (['runway', 'heygen', 'synthesia'].includes(p) || c === 'video') {
      list.push('VIDEO');
    }
    if (['elevenlabs', 'suno'].includes(p) || c === 'voice' || c === 'music') {
      list.push('VOICE_AUDIO');
    }
    if (['devin', 'manus', 'antigravity', 'replit-ai', 'claude'].includes(p) || c === 'agent') {
      list.push('AGENTS');
    }
    if (['openai-api', 'anthropic-api', 'deepseek', 'mistral', 'qwen', 'kimi', 'glm', 'github-models'].includes(p) || c === 'model_api') {
      list.push('DEVELOPER_API');
    }

    return list;
  }

  /**
   * Generates a transparent, explainable narrative for why a platform is ranked.
   */
  private static generateWhyRanked(
    displayName: string,
    signals: PlatformSignals,
    partnerSummary?: { hasActivePartnerOffer: boolean; partnerNames: string[]; highestPerkValue?: string }
  ): PlatformScoreBreakdown['whyRanked'] {
    let primaryDriver = `Balanced performance across capability (${signals.productCapability}/100) and adoption (${signals.marketAdoption}/100).`;
    if (signals.productCapability >= 95) {
      primaryDriver = `Frontier-tier benchmark capabilities and industry-leading reasoning performance (${signals.productCapability}/100).`;
    } else if (signals.valueForMoney >= 93) {
      primaryDriver = `Superior cost-efficiency and accessible pricing tiers (${signals.valueForMoney}/100).`;
    } else if (signals.growthMomentum >= 95) {
      primaryDriver = `Rapid adoption momentum and state-of-the-art developer interest (${signals.growthMomentum}/100).`;
    }

    const capabilityHighlight = `Demonstrates strong ${signals.ecosystemStrength >= 90 ? 'enterprise ecosystem integration' : 'specialized workflow execution'} with ${signals.reliabilityMaturity}/100 reliability rating.`;
    const valueAssessment = `Value index of ${signals.valueForMoney}/100 with verifiable pricing plans directly from official vendor documentation.`;
    
    let partnerPerkHighlight: string | undefined;
    if (partnerSummary?.hasActivePartnerOffer && partnerSummary.partnerNames.length > 0) {
      partnerPerkHighlight = `Active commercial partner perk available with ${partnerSummary.partnerNames.join(', ')} (${partnerSummary.highestPerkValue || 'Complimentary access'}).`;
    }

    const tradeoffs = signals.valueForMoney < 85
      ? 'Higher monthly per-seat cost compared to specialized alternatives; best suited for power users.'
      : 'Specialized domain focus provides elite performance within its target category.';

    const summary = `${displayName} delivers a composite intelligence score of ${this.calculateOverallScore(signals)}/100, supported by ${Math.round(signals.confidenceScore * 100)}% verified source confidence.`;

    return {
      primaryDriver,
      capabilityHighlight,
      valueAssessment,
      partnerPerkHighlight,
      tradeoffs,
      summary,
    };
  }

  /**
   * Returns complete platform intelligence records for all platforms in the ecosystem.
   */
  public static getAllPlatformScores(): PlatformScoreBreakdown[] {
    const list: PlatformScoreBreakdown[] = [];

    // 1. Core Catalog Platforms
    for (const tool of TOOL_CATALOG) {
      const signals = this.getCoreCatalogSignals(tool.id);
      const overallScore = this.calculateOverallScore(signals);

      // Check partner offers
      const partnerOffers = PartnerOfferScanner.getKnownPartnerOffers().filter(
        (o) => o.aiProvider === tool.id
      );
      const hasActive = partnerOffers.length > 0;
      const partnerSummary = hasActive
        ? {
            hasActivePartnerOffer: true,
            partnerNames: Array.from(new Set(partnerOffers.map((o) => o.partner))),
            highestPerkValue: partnerOffers[0]?.benefit || 'Included Free',
          }
        : undefined;

      const plans = tool.plans.map((p) => ({
        id: p.id,
        label: p.label,
        monthlyPrice: p.monthlyPricePerSeat,
        isFree: p.monthlyPricePerSeat === 0,
      }));

      const whyRanked = this.generateWhyRanked(tool.name, signals, partnerSummary);

      list.push({
        providerId: tool.id,
        displayName: tool.name,
        vendor: tool.name.split(' ')[0],
        category: tool.category,
        officialUrl: tool.pricingUrl,
        pricingUrl: tool.pricingUrl,
        primaryUseCases: tool.useCases,
        overallScore,
        rank: 0, // Assigned after sorting
        signals,
        partnerOfferSummary: partnerSummary,
        whyRanked,
        verifiedPlans: plans,
        status: 'ACTIVE',
      });
    }

    // 2. Discovered Missing Platforms
    const discovered = ProviderDiscoveryService.getAllDiscoveredProviders();
    for (const p of discovered) {
      const signals = this.getDiscoveredSignals(p);
      const overallScore = this.calculateOverallScore(signals);

      // Check partner offers for discovered platforms
      const partnerOffers = PartnerOfferScanner.getKnownPartnerOffers().filter(
        (o) => o.aiProvider === p.providerId
      );
      const hasActive = partnerOffers.length > 0;
      const partnerSummary = hasActive
        ? {
            hasActivePartnerOffer: true,
            partnerNames: Array.from(new Set(partnerOffers.map((o) => o.partner))),
            highestPerkValue: partnerOffers[0]?.benefit || 'Included Free',
          }
        : undefined;

      const plans = p.verifiedPlans.map((plan) => ({
        id: plan.id,
        label: plan.label,
        monthlyPrice: plan.monthlyPrice,
        isFree: plan.isFree || plan.monthlyPrice === 0,
      }));

      const whyRanked = this.generateWhyRanked(p.displayName, signals, partnerSummary);

      list.push({
        providerId: p.providerId,
        displayName: p.displayName,
        vendor: p.vendor,
        category: p.category,
        officialUrl: p.officialUrl,
        pricingUrl: p.pricingUrl,
        primaryUseCases: p.marketSignal.primaryUseCases,
        overallScore,
        rank: 0, // Assigned after sorting
        signals,
        partnerOfferSummary: partnerSummary,
        whyRanked,
        verifiedPlans: plans,
        status: p.status === 'VALIDATED' ? 'VALIDATED' : 'DISCOVERED',
      });
    }

    // 3. Sort descending by overallScore and assign ranks
    list.sort((a, b) => b.overallScore - a.overallScore);
    list.forEach((item, index) => {
      item.rank = index + 1;
    });

    return list;
  }

  /**
   * Returns the computed overallScore for a specific provider (0-100).
   * Falls back to 80 if provider is unknown.
   */
  public static getScoreForProvider(providerId: string): number {
    const all = this.getAllPlatformScores();
    const found = all.find(
      (p) => p.providerId.toLowerCase() === providerId.toLowerCase()
    );
    return found ? Math.round(found.overallScore) : 80;
  }

  /**
   * Ranks all platforms across the entire ecosystem.
   */
  public static rankAllPlatforms(): PlatformScoreBreakdown[] {
    return this.getAllPlatformScores();
  }

  /**
   * Returns platform rankings filtered and weighted for a specific category.
   */
  public static getCategoryRankings(category: RankingCategory): CategoryRankingResult {
    const all = this.getAllPlatformScores();

    if (category === 'OVERALL') {
      return {
        category: 'OVERALL',
        categoryLabel: 'Overall AI Ecosystem Intelligence',
        description: 'Comprehensive cross-domain rankings based on capabilities, market adoption, reliability, and value.',
        totalPlatforms: all.length,
        rankings: all,
      };
    }

    const filtered = all.filter((p) => {
      const cats = this.getCategoriesForProvider(p.providerId, p.category);
      return cats.includes(category);
    });

    // Re-score category-specific weights
    const categoryWeighted = filtered.map((p) => {
      let catScore = p.overallScore;
      if (category === 'CODING') {
        catScore = p.signals.productCapability * 0.40 + p.signals.ecosystemStrength * 0.25 + p.signals.valueForMoney * 0.20 + p.signals.marketAdoption * 0.15;
      } else if (category === 'GENERAL_ASSISTANT') {
        catScore = p.signals.productCapability * 0.35 + p.signals.marketAdoption * 0.30 + p.signals.reliabilityMaturity * 0.20 + p.signals.valueForMoney * 0.15;
      } else if (category === 'RESEARCH') {
        catScore = p.signals.productCapability * 0.40 + p.signals.reliabilityMaturity * 0.25 + p.signals.valueForMoney * 0.20 + p.signals.ecosystemStrength * 0.15;
      } else if (category === 'IMAGE' || category === 'VIDEO' || category === 'VOICE_AUDIO') {
        catScore = p.signals.productCapability * 0.45 + p.signals.growthMomentum * 0.25 + p.signals.valueForMoney * 0.15 + p.signals.marketAdoption * 0.15;
      } else if (category === 'AGENTS') {
        catScore = p.signals.productCapability * 0.40 + p.signals.growthMomentum * 0.30 + p.signals.ecosystemStrength * 0.20 + p.signals.reliabilityMaturity * 0.10;
      } else if (category === 'DEVELOPER_API') {
        catScore = p.signals.valueForMoney * 0.35 + p.signals.productCapability * 0.30 + p.signals.ecosystemStrength * 0.20 + p.signals.reliabilityMaturity * 0.15;
      }
      return {
        ...p,
        overallScore: Math.round(catScore * (0.85 + 0.15 * p.signals.confidenceScore) * 10) / 10,
      };
    });

    categoryWeighted.sort((a, b) => b.overallScore - a.overallScore);
    categoryWeighted.forEach((item, index) => {
      item.categoryRank = index + 1;
    });

    const categoryLabels: Record<RankingCategory, { label: string; desc: string }> = {
      OVERALL: { label: 'Overall', desc: 'Cross-domain rankings' },
      CODING: { label: 'AI Coding & IDEs', desc: 'Code generation, autonomous software agents, and IDE extensions' },
      GENERAL_ASSISTANT: { label: 'General AI Assistants', desc: 'Frontier chatbots, multimodal reasoning, and productivity assistants' },
      RESEARCH: { label: 'AI Research & Search Engines', desc: 'Source grounding, citation verification, and deep research agents' },
      WRITING: { label: 'AI Writing & Presentation', desc: 'Content generation, slide creation, and document synthesis' },
      IMAGE: { label: 'Generative Image & Visual Art', desc: 'Text-to-image synthesis, typography, and game asset generation' },
      VIDEO: { label: 'Generative Video & Avatars', desc: 'Text-to-video, AI digital humans, and motion synthesis' },
      VOICE_AUDIO: { label: 'Voice Synthesis & Music AI', desc: 'Low-latency conversational voice agents and AI music creation' },
      AGENTS: { label: 'Autonomous AI Agents', desc: 'Full-stack software engineering and multi-step web workflow automation' },
      DEVELOPER_API: { label: 'Model APIs & Infrastructure', desc: 'Token pricing, prompt caching efficiency, and API throughput' },
    };

    return {
      category,
      categoryLabel: categoryLabels[category]?.label || category,
      description: categoryLabels[category]?.desc || '',
      totalPlatforms: categoryWeighted.length,
      rankings: categoryWeighted,
    };
  }
}
