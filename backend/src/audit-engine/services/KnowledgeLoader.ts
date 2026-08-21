// ============================================================
// Knowledge Loader — StackSave AI Platform Intelligence
//
// Dynamically loads, validates against schema v2.0.0, normalizes,
// and caches provider JSON profiles from the knowledge repository.
// Executes KnowledgeQualityEngine validation once during server initialization.
// ============================================================

import fs from 'fs';
import path from 'path';
import { getToolById } from '../catalog';
import { KnowledgeQualityEngine, KnowledgeHealthReport } from './KnowledgeQualityEngine';

// ─── Feature Map Types ────────────────────────────────────────────────────────
export interface FeatureMapEntry {
  label: string;
  capabilityKeys: string[];
  minimumScore: number;
  description: string;
  derivedFrom?: string;  // e.g. "enterprise.compliance.hipaa === true"
}

export interface FeatureMap {
  schemaVersion: string;
  description: string;
  features: Record<string, FeatureMapEntry>;
}

// ─── Recommendation Weights Types ────────────────────────────────────────────
export interface RecommendationWeights {
  schemaVersion: string;
  compositeScore: Record<string, number>;
  preferenceModifiers: Record<string, Record<string, unknown>>;
  confidenceWeights: Record<string, number>;
  stackGeneration: {
    maxToolsPerStack: number;
    minCoverageThreshold: number;
    candidateSeedCount: number;
    complementarityMinScore: number;
    replacementMaxOverlap: number;
  };
  optimizer: {
    redundancyOverlapThreshold: number;
    maxVendorConcentrationHHI: number;
    budgetOverrunTolerance: number;
    minCoverageForBudgetStack: number;
    minCoverageForPerfStack: number;
  };
  knowledgeScoring: {
    enterpriseComplianceWeight: number;
    enterpriseIdentityWeight: number;
    enterpriseAdminWeight: number;
    costTiers: Record<string, number>;
    vendorStabilityWeights: Record<string, number>;
    benchmarkConfidenceThreshold: number;
  };
}

// ─── Knowledge Version Metadata ──────────────────────────────────────────────
export interface KnowledgeVersionMetadata {
  providerCount: number;
  schemaVersions: Record<string, string>;
  knowledgeVersions: Record<string, string>;
  lastVerifiedDates: Record<string, string>;
  featureMapVersion: string;
  workflowWeightsVersion: string;
  recommendationWeightsVersion: string;
  generatedAt: string;
}

export interface CapabilityEntry {
  score: number;
  confidence?: number;
  evidence: string;
  source?: string;
  docLink?: string;
  lastVerified?: string;
}

export interface BenchmarkEntry {
  score: number;
  confidence?: number;
  evidence: string;
  source?: string;
  date?: string;
}

export interface PlanEntry {
  id: string;
  label: string;
  monthlyPricePerSeat: number;
  annualPricePerSeat?: number;
  isPayPerUse?: boolean;
  tierRank?: number;            // Explicit ordering within the provider's plan ladder (1 = entry, N = highest)
  agentCreditsMultiplier?: number; // Relative agent credit multiplier vs entry plan
  contextWindow?: string;      // e.g. "128K", "1M"
  features?: string[];         // Human-readable feature list
  premiumFeatures?: string[];  // Features that distinguish this plan from lower tiers
}

export interface EnterpriseConfig {
  compliance: {
    soc2?: boolean;
    gdpr?: boolean;
    hipaa?: boolean;
    iso27001?: boolean;
  };
  security: {
    encryption?: boolean;
    privateDeployment?: boolean;
    zeroDataRetention?: boolean;
  };
  administration: {
    rbac?: boolean;
    auditLogs?: boolean;
    adminConsole?: boolean;
  };
  identity: {
    sso?: boolean;
    saml?: boolean;
    scim?: boolean;
  };
  governance: {
    policyManagement?: boolean;
    workspaceControls?: boolean;
  };
}

export interface DeveloperExperience {
  reasoning: number;
  coding: number;
  planning?: number;
  velocity: number;
  developerExperience: number;
  enterpriseReadiness?: number;
  maintainability?: number;
  learningCurve: 'Very Low' | 'Low' | 'Medium' | 'High';
  migrationCost: 'None' | 'Low' | 'Medium' | 'High';
  risk: 'Low' | 'Medium' | 'High';
}

export interface FinancialProfile {
  costPerCapability?: number;
  vendorLockInRisk?: 'Low' | 'Medium' | 'High';
  scalingCost?: number;
  upgradeFlexibility?: string;
  subscriptionFlexibility?: string;
  maintenanceCost?: string;
  enterpriseROI?: string;
  typicalCustomerSize?: string;
  industryFit?: string[];
}

export interface ProviderProfile {
  schemaVersion?: string;
  knowledgeVersion?: string;
  benchmarkVersion?: string;
  lastVerified?: string;
  lastUpdated?: string;

  // Normalized Core Fields
  id: string;
  name: string;
  category: 'ide' | 'chat' | 'api' | 'search';
  vendor: string;
  primaryRole: string;
  secondaryRole: string;
  pricing: Record<string, number>;
  plans: PlanEntry[];
  selectedPlan?: PlanEntry;
  billingModels: string[];
  enterpriseAvailability: boolean;

  // Structured Knowledge Sections
  capabilities: Record<string, CapabilityEntry>;
  benchmarks: Record<string, BenchmarkEntry>;
  enterprise: EnterpriseConfig;
  productivityScores: DeveloperExperience; // Legacy alias
  developerExperience: DeveloperExperience;
  financialProfile: FinancialProfile;

  strengths: string[];
  weaknesses: string[];
  limitations: string[];
  bestUseCases: string[];
  typicalTeamSize: string;
  supportedModels?: string[];
  supportedPlatforms: string[];
  ideSupport?: string[];
  annualDiscountPercent?: number;
  apiSupport: boolean;
  sources: string[];
}

export interface ProviderMetadata {
  id: string;
  name: string;
  category: 'ide' | 'chat' | 'api' | 'search';
  vendor: string;
  vendorProfile?: any;
  primaryRole: string;
  secondaryRole: string;
  billingModels: string[];
  enterpriseAvailability: boolean;
  knownStrengths: string[];
  knownWeaknesses: string[];
  limitations: string[];
  bestUseCases: string[];
  typicalTeamSize: string;
  supportedModels: string[];
  supportedPlatforms: string[];
  apiSupport: boolean;
  knowledgeVersion: string;
  schemaVersion: string;
  lastUpdated: string;
  sources: string[];
  knowledgeProvenance?: any;
}

export interface ModelProfile {
  modelId: string;
  name: string;
  providerId: string;
  releaseDate?: string | null;
  capabilities: Record<string, CapabilityEntry>;
  benchmarks?: Record<string, BenchmarkEntry>;
  productivityScores?: DeveloperExperience;
  developerExperience?: DeveloperExperience;
  modelVariantDetails?: any;
  allModelVariants?: any;
}

export interface ProviderKnowledge {
  provider: ProviderMetadata;
  plans: PlanEntry[];
  models: ModelProfile[];
  enterprise?: EnterpriseConfig;
  financialProfile?: FinancialProfile;
  annualDiscountPercent?: number;
}

export class KnowledgeLoader {
  private static cache = new Map<string, ProviderProfile>();
  private static knowledgeCache = new Map<string, ProviderKnowledge>();
  private static initialized = false;
  private static healthReport: KnowledgeHealthReport | null = null;

  /**
   * Initializes the repository by loading hierarchical provider directories
   * (provider.json, plans.json, models/*.json) from knowledge/providers.
   * Validates profiles and runs KnowledgeQualityEngine once on startup.
   */
  public static initialize(): void {
    if (this.initialized) return;

    const searchDirs = [
      path.join(process.cwd(), 'src/knowledge/providers'),
      path.join(process.cwd(), 'knowledge/providers'),
      path.join(__dirname, '../../knowledge/providers'),
      path.join(__dirname, '../../../src/knowledge/providers')
    ];

    let loadedDir: string | null = null;

    for (const dir of searchDirs) {
      try {
        if (fs.existsSync(dir)) {
          loadedDir = dir;
          break;
        }
      } catch (err) {
        // Continue searching
      }
    }

    if (!loadedDir) {
      console.warn('⚠️ Could not find any provider search paths.');
      return;
    }

    // Inspect subdirectories in providers/ folder
    const entries = fs.readdirSync(loadedDir);

    for (const entry of entries) {
      const entryPath = path.join(loadedDir, entry);
      const isDirectory = fs.statSync(entryPath).isDirectory();

      if (isDirectory) {
        // Hierarchical loading: provider.json, plans.json, models/*.json
        const providerFile = path.join(entryPath, 'provider.json');
        const plansFile = path.join(entryPath, 'plans.json');
        const modelsDir = path.join(entryPath, 'models');

        if (fs.existsSync(providerFile)) {
          try {
            const providerMeta: ProviderMetadata = JSON.parse(fs.readFileSync(providerFile, 'utf8'));
            let plans: PlanEntry[] = [];
            let enterprise: EnterpriseConfig | undefined;
            let financialProfile: FinancialProfile | undefined;
            let annualDiscountPercent: number | undefined;

            if (fs.existsSync(plansFile)) {
              const plansData = JSON.parse(fs.readFileSync(plansFile, 'utf8'));
              plans = plansData.plans || [];
              enterprise = plansData.enterprise;
              financialProfile = plansData.financialProfile;
              annualDiscountPercent = plansData.annualDiscountPercent;
            }

            const models: ModelProfile[] = [];
            if (fs.existsSync(modelsDir) && fs.statSync(modelsDir).isDirectory()) {
              const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.json'));
              for (const mf of modelFiles) {
                const modelData: ModelProfile = JSON.parse(fs.readFileSync(path.join(modelsDir, mf), 'utf8'));
                models.push(modelData);
              }
            }

            const pk: ProviderKnowledge = {
              provider: providerMeta,
              plans,
              models,
              enterprise,
              financialProfile,
              annualDiscountPercent
            };

            this.knowledgeCache.set(providerMeta.id.toLowerCase(), pk);
            if (providerMeta.id.toLowerCase() === 'github-copilot') {
              this.knowledgeCache.set('copilot', pk);
            }

            // Synthesize ProviderProfile for backward compatibility with audit engines
            const synthesizedProfile = this.synthesizeProfile(pk);
            this.cache.set(synthesizedProfile.id.toLowerCase(), synthesizedProfile);
            if (synthesizedProfile.id.toLowerCase() === 'github-copilot') {
              this.cache.set('copilot', synthesizedProfile);
            }
          } catch (err) {
            console.error(`❌ Failed to load hierarchical provider '${entry}':`, err);
          }
        }
      } else if (entry.endsWith('.json') && !['index.json', 'feature-map.json', 'recommendation-weights.json', 'strategy-config.json', 'workflow-weights.json'].includes(entry)) {
        // Legacy flat JSON fallback (if any remaining)
        try {
          const content = fs.readFileSync(entryPath, 'utf8');
          const raw = JSON.parse(content);
          if (raw.id && !this.cache.has(raw.id.toLowerCase())) {
            const profile = this.normalizeProfile(raw);
            this.cache.set(profile.id.toLowerCase(), profile);
          }
        } catch (err) {
          // ignore
        }
      }
    }

    // Run Knowledge Quality Engine validation once during initialization
    this.healthReport = KnowledgeQualityEngine.validateKnowledgeBase(Array.from(this.cache.values()));

    this.initialized = true;
  }

  /**
   * Granular Hierarchical API methods
   */
  public static loadProvider(providerId: string): ProviderMetadata | null {
    this.initialize();
    const pk = this.knowledgeCache.get(providerId.toLowerCase());
    return pk ? pk.provider : null;
  }

  public static loadPlans(providerId: string): PlanEntry[] {
    this.initialize();
    const pk = this.knowledgeCache.get(providerId.toLowerCase());
    return pk ? pk.plans : [];
  }

  public static loadModels(providerId: string): ModelProfile[] {
    this.initialize();
    const pk = this.knowledgeCache.get(providerId.toLowerCase());
    return pk ? pk.models : [];
  }

  public static loadModel(providerId: string, modelId: string): ModelProfile | null {
    this.initialize();
    const pk = this.knowledgeCache.get(providerId.toLowerCase());
    if (!pk) return null;
    const targetSlug = modelId.toLowerCase().trim();
    return pk.models.find(m => m.modelId.toLowerCase() === targetSlug || m.name.toLowerCase() === targetSlug) || null;
  }

  public static loadCompleteProvider(providerId: string): ProviderKnowledge | null {
    this.initialize();
    return this.knowledgeCache.get(providerId.toLowerCase()) || null;
  }

  /**
   * Synthesizes a unified ProviderProfile from hierarchical ProviderKnowledge
   * to provide 100% backward compatibility for existing audit and recommendation engines.
   */
  private static synthesizeProfile(pk: ProviderKnowledge, modelId?: string, planId?: string): ProviderProfile {
    const { provider, plans, models, enterprise, financialProfile } = pk;
    
    // Pick capabilities from requested model or primary model in collection
    let targetModel: ModelProfile | undefined;
    if (modelId) {
      const slug = modelId.toLowerCase().trim();
      targetModel = models.find(m => m.modelId.toLowerCase() === slug || m.name.toLowerCase() === slug);
    }
    let primaryModel: ModelProfile | undefined = targetModel;
    if (!primaryModel && models.length > 0) {
      primaryModel = models.find(m =>
        m.modelId.includes('sonnet') ||
        m.modelId === 'gpt-4o' ||
        m.modelId === 'gemini-1-5-pro' ||
        m.modelId.includes('max') ||
        m.modelId.includes('coder-v2')
      ) || models[0];
    }
    if (!primaryModel) {
      primaryModel = { modelId: 'default', name: provider.name, providerId: provider.id, capabilities: {} };
    }

    // Resolve selected plan from planId
    let selectedPlan: PlanEntry | undefined;
    if (planId) {
      const slug = planId.toLowerCase().trim();
      selectedPlan = plans.find(p => p.id.toLowerCase() === slug || p.label.toLowerCase() === slug);
    }
    if (!selectedPlan && plans.length > 0) {
      selectedPlan = plans[0];
    }

    const capabilities: Record<string, CapabilityEntry> = primaryModel.capabilities || {};
    const benchmarks: Record<string, BenchmarkEntry> = primaryModel.benchmarks || {};
    const devExp: DeveloperExperience = primaryModel.productivityScores || primaryModel.developerExperience || {
      reasoning: capabilities.reasoning?.score || 5,
      coding: capabilities.coding?.score || 5,
      planning: capabilities.planning?.score || 5,
      velocity: 8,
      developerExperience: 8,
      enterpriseReadiness: 7,
      maintainability: 8,
      learningCurve: 'Low',
      migrationCost: 'Low',
      risk: 'Low'
    };

    const pricingMap: Record<string, number> = {};
    plans.forEach(p => { pricingMap[p.id] = p.monthlyPricePerSeat; });

    // Enrich annual prices from catalog if available
    const catalogTool = getToolById(provider.id);
    if (catalogTool) {
      plans.forEach(p => {
        const catPlan = catalogTool.plans.find(cp => cp.id === p.id);
        if (catPlan?.annualPricePerSeat && !p.annualPricePerSeat) {
          p.annualPricePerSeat = catPlan.annualPricePerSeat;
        }
      });
    }

    const defaultEnterprise: EnterpriseConfig = enterprise || {
      compliance: { soc2: capabilities.enterpriseSecurity?.score !== undefined ? capabilities.enterpriseSecurity.score >= 7 : true, gdpr: true, hipaa: false, iso27001: false },
      security: { encryption: true, privateDeployment: false, zeroDataRetention: true },
      administration: { rbac: true, auditLogs: true, adminConsole: true },
      identity: { sso: capabilities.sso?.score !== undefined ? capabilities.sso.score >= 7 : true, saml: true, scim: false },
      governance: { policyManagement: true, workspaceControls: true }
    };

    const defaultFinancial: FinancialProfile = financialProfile || {
      vendorLockInRisk: 'Low',
      scalingCost: 50,
      upgradeFlexibility: 'High',
      subscriptionFlexibility: 'High',
      maintenanceCost: 'Low',
      enterpriseROI: 'High',
      typicalCustomerSize: '1-500',
      industryFit: ['Software', 'Technology', 'Financial Services']
    };

    return {
      schemaVersion: provider.schemaVersion || '2.0.0',
      knowledgeVersion: provider.knowledgeVersion || '1.0.0',
      lastVerified: provider.lastUpdated || '2026-05-07',
      lastUpdated: provider.lastUpdated || '2026-05-07',

      id: provider.id,
      name: provider.name,
      category: provider.category,
      vendor: provider.vendor,
      primaryRole: provider.primaryRole,
      secondaryRole: provider.secondaryRole,
      pricing: pricingMap,
      plans,
      selectedPlan,
      billingModels: provider.billingModels,
      enterpriseAvailability: provider.enterpriseAvailability,

      capabilities,
      benchmarks,
      enterprise: defaultEnterprise,
      productivityScores: devExp,
      developerExperience: devExp,
      financialProfile: defaultFinancial,

      strengths: provider.knownStrengths || [],
      weaknesses: provider.knownWeaknesses || [],
      limitations: provider.limitations || [],
      bestUseCases: provider.bestUseCases || [],
      typicalTeamSize: provider.typicalTeamSize || 'Any',
      supportedModels: provider.supportedModels || [],
      supportedPlatforms: provider.supportedPlatforms || [],
      ideSupport: provider.supportedPlatforms || [],
      annualDiscountPercent: pk.annualDiscountPercent ?? 0,
      apiSupport: provider.apiSupport,
      sources: provider.sources || []
    };
  }

  /**
   * Returns the startup Knowledge Health Report generated by KQE.
   */
  public static getHealthReport(): KnowledgeHealthReport | null {
    this.initialize();
    return this.healthReport;
  }

  /**
   * Patches the in-memory plan cache with DB-verified plans from PricingOverlayService.
   *
   * Called exclusively by PricingOverlayService after a successful pricing sync.
   * Only VERIFIED records are passed here — the overlay service enforces this.
   *
   * Maps NormalizedPlan[] (from the sync pipeline) into PlanEntry[] format
   * (used by KnowledgeLoader) by preserving all compatible fields.
   *
   * @param providerId - The provider ID to patch (must match knowledgeCache key)
   * @param dbPlans - VERIFIED plans from PricingSource collection
   * @returns true if the provider was found and patched, false if not in cache
   */
  public static patchPlansFromDB(
    providerId: string,
    dbPlans: Array<{
      id: string;
      label: string;
      monthlyPricePerSeat: number;
      annualPricePerSeat?: number;
      isPayPerUse?: boolean;
      currency?: string;
    }>
  ): boolean {
    const key = providerId.toLowerCase();
    const pk = this.knowledgeCache.get(key);
    if (!pk) return false;

    // Convert NormalizedPlan[] → PlanEntry[], preserving fields compatible with both schemas.
    // We only update plans that exist in the DB sync; we don't remove static-only plans
    // (e.g. enterprise plans that are never returned by the sync).
    const existingPlans = pk.plans;
    const dbPlanMap = new Map(dbPlans.map((p) => [p.id, p]));

    const patchedPlans: PlanEntry[] = existingPlans.map((existing) => {
      const dbPlan = dbPlanMap.get(existing.id);
      if (dbPlan) {
        // Apply DB-verified price — preserve non-pricing fields (features, tierRank, etc.)
        return {
          ...existing,
          monthlyPricePerSeat: dbPlan.monthlyPricePerSeat,
          annualPricePerSeat: dbPlan.annualPricePerSeat ?? existing.annualPricePerSeat,
          isPayPerUse: dbPlan.isPayPerUse ?? existing.isPayPerUse,
        };
      }
      return existing; // No DB record for this plan — keep static value
    });

    // Also add any new plans from DB that aren't in the static list
    for (const dbPlan of dbPlans) {
      if (!existingPlans.find((p) => p.id === dbPlan.id)) {
        patchedPlans.push({
          id: dbPlan.id,
          label: dbPlan.label,
          monthlyPricePerSeat: dbPlan.monthlyPricePerSeat,
          annualPricePerSeat: dbPlan.annualPricePerSeat,
          isPayPerUse: dbPlan.isPayPerUse,
        });
      }
    }

    // Mutate in-place so all references to pk.plans see the updated prices
    pk.plans.length = 0;
    pk.plans.push(...patchedPlans);

    // Also update the pricingMap in the synthesized ProviderProfile cache
    const profile = this.cache.get(key);
    if (profile) {
      for (const p of patchedPlans) {
        profile.pricing[p.id] = p.monthlyPricePerSeat;
      }
      profile.plans = patchedPlans;
    }

    return true;
  }

  /**
   * Validates raw JSON object structure before registering.
   */
  private static validateSchema(raw: any, fileName: string): boolean {
    if (!raw || typeof raw !== 'object') {
      console.error(`Validation Error [${fileName}]: Object is empty or null.`);
      return false;
    }

    const id = raw.id || raw.info?.id;
    if (!id || typeof id !== 'string') {
      console.error(`Validation Error [${fileName}]: Missing or invalid 'id' field.`);
      return false;
    }

    const name = raw.name || raw.info?.name;
    if (!name || typeof name !== 'string') {
      console.error(`Validation Error [${fileName}]: Missing or invalid 'name' field.`);
      return false;
    }

    const capabilities = raw.capabilities;
    if (!capabilities || typeof capabilities !== 'object') {
      console.error(`Validation Error [${fileName}]: Missing 'capabilities' section.`);
      return false;
    }

    return true;
  }

  /**
   * Normalizes raw JSON into a typed ProviderProfile supporting both legacy and v2 schemas.
   */
  private static normalizeProfile(raw: any): ProviderProfile {
    const id = (raw.id || raw.info?.id || '').toLowerCase();
    const name = raw.name || raw.info?.name || id;
    const category = raw.category || raw.info?.category || 'ide';
    const vendor = raw.vendor || raw.info?.vendor || '';
    const primaryRole = raw.primaryRole || raw.info?.primaryRole || '';
    const secondaryRole = raw.secondaryRole || raw.info?.secondaryRole || '';

    // Normalize plans & pricing
    const pricing: Record<string, number> = raw.pricing || {};
    let plans: PlanEntry[] = raw.plans || [];
    if (plans.length === 0 && Object.keys(pricing).length > 0) {
      plans = Object.entries(pricing).map(([planId, price]) => ({
        id: planId,
        label: planId.charAt(0).toUpperCase() + planId.slice(1),
        monthlyPricePerSeat: price
      }));
    }
    if (Object.keys(pricing).length === 0 && plans.length > 0) {
      plans.forEach(p => { pricing[p.id] = p.monthlyPricePerSeat; });
    }

    // Enrich annual prices from catalog if available
    const catalogTool = getToolById(id);
    if (catalogTool) {
      plans.forEach(p => {
        const catPlan = catalogTool.plans.find(cp => cp.id === p.id);
        if (catPlan?.annualPricePerSeat && !p.annualPricePerSeat) {
          p.annualPricePerSeat = catPlan.annualPricePerSeat;
        }
      });
    }

    // Enterprise config normalization
    const enterprise: EnterpriseConfig = raw.enterprise || {
      compliance: {
        soc2: raw.capabilities?.enterpriseSecurity?.score >= 7,
        gdpr: raw.capabilities?.enterpriseSecurity?.score >= 7,
        hipaa: false,
        iso27001: false
      },
      security: {
        encryption: true,
        privateDeployment: false,
        zeroDataRetention: raw.capabilities?.enterpriseSecurity?.score >= 8
      },
      administration: {
        rbac: raw.capabilities?.adminControls?.score >= 7,
        auditLogs: raw.capabilities?.adminControls?.score >= 7,
        adminConsole: raw.capabilities?.adminControls?.score >= 7
      },
      identity: {
        sso: raw.capabilities?.sso?.score >= 7,
        saml: raw.capabilities?.sso?.score >= 7,
        scim: false
      },
      governance: {
        policyManagement: raw.capabilities?.adminControls?.score >= 7,
        workspaceControls: raw.capabilities?.adminControls?.score >= 7
      }
    };

    // Developer experience / productivity scores
    const devExp: DeveloperExperience = raw.developerExperience || raw.productivityScores || {
      reasoning: raw.capabilities?.reasoning?.score || 5,
      coding: raw.capabilities?.coding?.score || 5,
      planning: raw.capabilities?.planning?.score || 5,
      velocity: 8,
      developerExperience: 8,
      enterpriseReadiness: 7,
      maintainability: 8,
      learningCurve: 'Low',
      migrationCost: 'Medium',
      risk: 'Low'
    };

    // Financial Profile
    const financialProfile: FinancialProfile = raw.financialProfile || {
      costPerCapability: 2.0,
      vendorLockInRisk: 'Medium',
      scalingCost: 1.2,
      upgradeFlexibility: 'High',
      subscriptionFlexibility: 'Monthly',
      maintenanceCost: 'Low',
      enterpriseROI: 'High',
      typicalCustomerSize: raw.typicalTeamSize || '1-100',
      industryFit: ['software', 'technology']
    };

    return {
      schemaVersion: raw.schemaVersion || '2.0.0',
      knowledgeVersion: raw.knowledgeVersion || '1.0.0',
      benchmarkVersion: raw.benchmarkVersion || '2026-Q2',
      lastVerified: raw.lastVerified || '2026-05-07',
      lastUpdated: raw.lastUpdated || '2026-05-07',

      id,
      name,
      category,
      vendor,
      primaryRole,
      secondaryRole,
      pricing,
      plans,
      billingModels: raw.billingModels || ['monthly', 'annual'],
      enterpriseAvailability: raw.enterpriseAvailability ?? true,

      capabilities: raw.capabilities || {},
      benchmarks: raw.benchmarks || {},
      enterprise,
      productivityScores: devExp,
      developerExperience: devExp,
      financialProfile,

      strengths: raw.strengths || raw.knownStrengths || [],
      weaknesses: raw.weaknesses || raw.knownWeaknesses || [],
      limitations: raw.limitations || [],
      bestUseCases: raw.bestUseCases || [],
      typicalTeamSize: raw.typicalTeamSize || 'Any',
      supportedModels: raw.supportedModels || [],
      supportedPlatforms: raw.supportedPlatforms || raw.ideSupport || [],
      apiSupport: raw.apiSupport ?? (category === 'api'),
      sources: raw.sources || []
    };
  }

  public static getProvider(id: string, modelId?: string, planId?: string): ProviderProfile | null {
    this.initialize();
    const pk = this.knowledgeCache.get(id.toLowerCase());
    if (pk) {
      return this.synthesizeProfile(pk, modelId, planId);
    }
    return this.cache.get(id.toLowerCase()) || null;
  }

  public static getAllProviders(): ProviderProfile[] {
    this.initialize();
    return Array.from(this.cache.values());
  }

  public static getProvidersByCategory(category: 'ide' | 'chat' | 'api' | 'search'): ProviderProfile[] {
    this.initialize();
    return Array.from(this.cache.values()).filter(p => p.category === category);
  }

  public static clearCache(): void {
    this.cache.clear();
    this.knowledgeCache.clear();
    this.weights = null;
    this.strategies = null;
    this.featureMap = null;
    this.recommendationWeights = null;
    this.healthReport = null;
    this.initialized = false;
  }

  // ─── Workflow Weights ──────────────────────────────────────────────────────
  private static weights: Record<string, Record<string, number>> | null = null;

  public static getWorkflowWeights(): Record<string, Record<string, number>> {
    if (this.weights) return this.weights;
    const content = this.readKnowledgeFile('workflow-weights.json');
    if (content) {
      this.weights = JSON.parse(content);
      return this.weights!;
    }
    return {};
  }

  // ─── Feature Map ──────────────────────────────────────────────────────────
  private static featureMap: FeatureMap | null = null;

  public static getFeatureMap(): FeatureMap {
    if (this.featureMap) return this.featureMap;
    const content = this.readKnowledgeFile('feature-map.json');
    if (content) {
      this.featureMap = JSON.parse(content);
      return this.featureMap!;
    }
    return { schemaVersion: '1.0.0', description: '', features: {} };
  }

  // ─── Recommendation Weights ───────────────────────────────────────────────
  private static recommendationWeights: RecommendationWeights | null = null;

  public static getRecommendationWeights(): RecommendationWeights {
    if (this.recommendationWeights) return this.recommendationWeights;
    const content = this.readKnowledgeFile('recommendation-weights.json');
    if (content) {
      this.recommendationWeights = JSON.parse(content);
      return this.recommendationWeights!;
    }
    // Safe defaults if file not found
    return {
      schemaVersion: '1.0.0',
      compositeScore: { workflowMatch: 0.30, featureCoverage: 0.25, capabilityScore: 0.20, costEfficiency: 0.15, enterpriseScore: 0.05, vendorStability: 0.05 },
      preferenceModifiers: {},
      confidenceWeights: { workflowMatch: 0.30, featureCoverage: 0.25, budgetFit: 0.15, capabilitySuperiority: 0.10, securityMatch: 0.10, vendorStability: 0.05, futureGrowth: 0.05 },
      stackGeneration: { maxToolsPerStack: 4, minCoverageThreshold: 0.80, candidateSeedCount: 8, complementarityMinScore: 60, replacementMaxOverlap: 75 },
      optimizer: { redundancyOverlapThreshold: 75, maxVendorConcentrationHHI: 6000, budgetOverrunTolerance: 0.10, minCoverageForBudgetStack: 0.70, minCoverageForPerfStack: 0.85 },
      knowledgeScoring: { enterpriseComplianceWeight: 0.40, enterpriseIdentityWeight: 0.30, enterpriseAdminWeight: 0.30, costTiers: { free: 100, lte10: 85, lte20: 70, lte40: 55, lte80: 35, above80: 20 }, vendorStabilityWeights: { reliabilityScore: 0.50, enterpriseAvailability: 0.20, sourcesPresent: 0.30 }, benchmarkConfidenceThreshold: 70 }
    } as RecommendationWeights;
  }

  // ─── Knowledge Version Metadata ───────────────────────────────────────────
  public static getKnowledgeVersionMetadata(): KnowledgeVersionMetadata {
    this.initialize();
    const providers = Array.from(this.cache.values());
    const schemaVersions: Record<string, string> = {};
    const knowledgeVersions: Record<string, string> = {};
    const lastVerifiedDates: Record<string, string> = {};

    for (const p of providers) {
      schemaVersions[p.id] = p.schemaVersion || '2.0.0';
      knowledgeVersions[p.id] = p.knowledgeVersion || '1.0.0';
      lastVerifiedDates[p.id] = p.lastVerified || 'unknown';
    }

    const fm = this.getFeatureMap();
    const rw = this.getRecommendationWeights();

    return {
      providerCount: providers.length,
      schemaVersions,
      knowledgeVersions,
      lastVerifiedDates,
      featureMapVersion: fm.schemaVersion || '1.0.0',
      workflowWeightsVersion: '1.0.0',
      recommendationWeightsVersion: rw.schemaVersion || '1.0.0',
      generatedAt: new Date().toISOString()
    };
  }

  // ─── Internal file reader helper ─────────────────────────────────────────
  private static readKnowledgeFile(filename: string): string | null {
    const searchDirs = [
      path.join(process.cwd(), 'src/knowledge'),
      path.join(process.cwd(), 'knowledge'),
      path.join(__dirname, '../../knowledge'),
      path.join(__dirname, '../../../src/knowledge')
    ];
    for (const dir of searchDirs) {
      try {
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath)) {
          return fs.readFileSync(filePath, 'utf8');
        }
      } catch {
        // continue
      }
    }
    return null;
  }

  private static strategies: any = null;

  public static getStrategyConfig(): Record<string, any> {
    if (this.strategies) return this.strategies;
    const content = this.readKnowledgeFile('strategy-config.json');
    if (content) {
      this.strategies = JSON.parse(content);
      return this.strategies!;
    }
    return {
      performance: {
        minimumCapability: 7,
        maximumCapabilityLoss: 2,
        minimumRetention: 95,
        weights: { workflowCapability: 0.45, monthlyCost: 0.05, capabilityRetention: 0.20, productivityImpact: 0.20, migrationRisk: 0.10 }
      },
      savings: {
        minimumCapability: 6,
        maximumCapabilityLoss: 3,
        minimumRetention: 85,
        weights: { workflowCapability: 0.20, monthlyCost: 0.45, capabilityRetention: 0.20, productivityImpact: 0.10, migrationRisk: 0.05 }
      }
    };
  }
}
