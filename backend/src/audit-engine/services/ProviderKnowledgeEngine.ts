// ============================================================
// Provider Knowledge Engine — StackSave AI Platform
//
// Pure descriptor: maps raw ProviderProfile JSON data into a
// typed ProviderKnowledge object with normalized capability
// score vectors (0–10 per dimension).
//
// Relationship logic (canReplace, areComplementary, dominance)
// lives exclusively in RelationshipEngine, not here.
// ============================================================

import { KnowledgeLoader, ProviderProfile } from './KnowledgeLoader';

/**
 * A record of capability dimension → numeric score (0–10).
 * Derived directly from the provider's JSON profile.
 */
export interface CapabilityVector {
  [capabilityKey: string]: number;
}

/**
 * Normalized numeric productivity scores for the provider.
 */
export interface ProductivityVector {
  reasoning: number;
  coding: number;
  planning: number;
  velocity: number;
  developerExperience: number;
  enterpriseReadiness: number;
  maintainability: number;
}

/**
 * Rich, fully typed description of a single AI provider.
 * All relationships between providers are computed dynamically
 * by RelationshipEngine — none are stored here.
 */
export interface ProviderKnowledge {
  id: string;
  name: string;
  category: string;
  primaryRole: string;

  /** Full capability score vector (0–10 per dimension) */
  capabilityVector: CapabilityVector;

  /** Productivity attribute scores (0–10) */
  productivityVector: ProductivityVector;

  /** Cheapest non-free monthly plan price in USD */
  nominalMonthlyPrice: number;

  /** % discount when billed annually (0 = no annual billing available) */
  annualDiscountPercent: number;

  migrationCost: 'None' | 'Low' | 'Medium' | 'High';
  learningCurve: 'Very Low' | 'Low' | 'Medium' | 'High';
  supportedIdes: string[];
  supportedModels: string[];
  strengths: string[];
  weaknesses: string[];
  bestUseCases: string[];
}

export class ProviderKnowledgeEngine {
  private static knowledgeCache = new Map<string, ProviderKnowledge>();

  /**
   * Returns rich knowledge for a provider by ID.
   * Returns null if the provider is not found in the knowledge base.
   */
  public static getKnowledge(id: string): ProviderKnowledge | null {
    if (this.knowledgeCache.has(id)) return this.knowledgeCache.get(id)!;

    KnowledgeLoader.initialize();
    const profile = KnowledgeLoader.getProvider(id);
    if (!profile) return null;

    const knowledge = this.buildKnowledge(profile);
    this.knowledgeCache.set(id, knowledge);
    return knowledge;
  }

  /**
   * Returns all known provider IDs from the loaded knowledge base.
   */
  public static getAllIds(): string[] {
    KnowledgeLoader.initialize();
    return KnowledgeLoader.getAllProviders().map(p => p.id);
  }

  /**
   * Returns all known providers as ProviderKnowledge objects.
   */
  public static getAllKnowledge(): ProviderKnowledge[] {
    return this.getAllIds()
      .map(id => this.getKnowledge(id))
      .filter(Boolean) as ProviderKnowledge[];
  }

  /**
   * Clears the in-memory cache (useful for testing).
   */
  public static clearCache(): void {
    this.knowledgeCache.clear();
  }

  // ─── Private ──────────────────────────────────────────────────────────────────

  /**
   * Builds a ProviderKnowledge object from the raw ProviderProfile.
   * The capability vector preserves all dimension scores as numeric values.
   */
  private static buildKnowledge(profile: ProviderProfile): ProviderKnowledge {
    const raw = profile as any;

    // Nominal monthly price = cheapest paid (non-free) plan
    const paidPrices = Object.entries(profile.pricing)
      .filter(([key]) => key !== 'free')
      .map(([, val]) => val as number)
      .filter(v => v > 0);
    const nominalMonthlyPrice = paidPrices.length > 0 ? Math.min(...paidPrices) : 0;

    // Build capability vector: dimension key → numeric score
    const capabilityVector: CapabilityVector = {};
    for (const [key, entry] of Object.entries(profile.capabilities)) {
      capabilityVector[key] = (entry as any).score ?? 0;
    }

    // Build productivity vector from productivityScores
    const ps = profile.productivityScores || profile.developerExperience || {
      reasoning: 5, coding: 5, planning: 5, velocity: 8, developerExperience: 8, enterpriseReadiness: 7, maintainability: 8, learningCurve: 'Low', migrationCost: 'Medium', risk: 'Low'
    };
    const productivityVector: ProductivityVector = {
      reasoning: ps.reasoning || 5,
      coding: ps.coding || 5,
      planning: ps.planning || 5,
      velocity: ps.velocity || 8,
      developerExperience: ps.developerExperience || 8,
      enterpriseReadiness: ps.enterpriseReadiness || 7,
      maintainability: ps.maintainability || 8,
    };

    return {
      id: profile.id,
      name: profile.name,
      category: profile.category,
      primaryRole: profile.primaryRole,
      capabilityVector,
      productivityVector,
      nominalMonthlyPrice,
      annualDiscountPercent: raw.annualDiscountPercent ?? 0,
      migrationCost: (ps.migrationCost || 'Medium') as ProviderKnowledge['migrationCost'],
      learningCurve: (ps.learningCurve || 'Low') as ProviderKnowledge['learningCurve'],
      supportedIdes: profile.supportedPlatforms || [],
      supportedModels: profile.supportedModels || [],
      strengths: profile.strengths || [],
      weaknesses: profile.weaknesses || [],
      bestUseCases: profile.bestUseCases || [],
    };
  }
}
