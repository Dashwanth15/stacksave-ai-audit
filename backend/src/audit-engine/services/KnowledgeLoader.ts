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
  /**
   * When true, a `derivedFrom` expression that reads the provider's `enterprise.*`
   * block is only trusted for providers whose governance data passed boilerplate
   * detection (`governanceDataVerified`). Unverified governance data stays unknown
   * instead of counting as a satisfied requirement.
   */
  requiresVerifiedGovernanceData?: boolean;
  /**
   * `"unsupported"` marks a requirement that no provider in the knowledge base can
   * satisfy. It is still reported in `missing`, but excluded from the coverage-score
   * denominator so an unsatisfiable request is not scored as a stack failure.
   */
  availability?: 'supported' | 'unsupported';
  /**
   * Hard capability prerequisite: a provider that scores below `minimumScore` on
   * `key` cannot satisfy this feature at any level, however strong its other
   * capabilities are. This replaces the per-feature `provider.category` checks that
   * used to be hardcoded in StackCoverageAnalyzer: the delivery surface a feature
   * requires is now declared here and answered from researched per-provider data, so
   * a newly added product qualifies (or not) on its own measured capability instead
   * of on a hand-assigned category label.
   */
  requiresCapability?: { key: string; minimumScore: number };
  /**
   * Delivery categories that structurally cannot expose this feature to an end user,
   * regardless of capability scores (a raw developer API endpoint has no interactive
   * chat surface). Kept as declared data rather than an `if` in the analyzer.
   */
  excludesCategories?: string[];
  /**
   * Marks a requirement that a dedicated stack role satisfies rather than the primary
   * workspace tool. `api-layer` requirements are fulfilled by the 04 API LAYER slot, so
   * they must not gate which workspace application becomes the 01 PRIMARY — otherwise
   * asking for programmatic access silently rewrites the editor/chat recommendation.
   */
  satisfiedByRole?: 'api-layer';
  /**
   * Terms matched (case-insensitively) against each provider's own published plan copy
   * (`plans[].features` + `plans[].premiumFeatures`) to locate the LOWEST tier that
   * entitles this capability. Used to make coverage plan-aware: a capability the vendor
   * sells only from its Teams tier upward is not delivered by the free tier, even though
   * the provider-level capability vector scores it.
   *
   * Absence of a match anywhere in a provider's ladder yields NO gate — unpublished plan
   * copy is not evidence of a restriction, so nothing is inferred and the provider-level
   * capability stands.
   */
  planEvidenceTerms?: string[];
  /**
   * Marks an ORGANIZATION-SCOPED requirement: one that needs a tier with an
   * administrative surface (a directory to federate, an administrator to enforce a
   * policy), not merely a product capable of it. Such a requirement is never entitled by
   * a tier whose published copy describes no organizational surface at all, which closes
   * the gap `planEvidenceTerms` alone leaves for vendors that deliver the capability
   * through a suite rather than naming it in per-plan copy.
   *
   * The floor is read from `FeatureMap.planAdminEvidenceTerms` against the provider's own
   * plan copy, so it is still the vendor's published tier position; a ladder that
   * publishes no organizational tier yields NO gate from this rule.
   */
  requiresOrgAdministration?: boolean;
  /** Documentation-only provenance note; ignored by the engine. */
  _note?: string;
  /** Documentation-only provenance note for `planEvidenceTerms`; ignored by the engine. */
  _planEvidenceNote?: string;
}

export interface FeatureMap {
  schemaVersion: string;
  description: string;
  /**
   * Shared evidence terms for an organizational delivery surface, applied to every
   * feature that declares `requiresOrgAdministration`. Kept at map level because the
   * question ("does this tier have an org surface at all?") is the same for every such
   * requirement.
   */
  planAdminEvidenceTerms?: string[];
  /** Documentation-only provenance note for `planAdminEvidenceTerms`; ignored by the engine. */
  _planAdminEvidenceNote?: string;
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

export interface VendorProfile {
  vendorId: string;
  vendorName: string;
  establishedYear?: number;
  headquarters?: string;
  fundingStage?: 'Public' | 'Private' | string;
  productFamily?: string[];
  stabilityRating?: 'Very High' | 'High' | 'Medium' | 'Low' | string;
  enterprisePresence?: boolean;
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
  vendorProfile?: VendorProfile;
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

  // ── Data provenance flags ──
  // The shipped knowledge base carries an identical, copy-pasted `enterprise`
  // block in every provider's plans.json (all 13 assert soc2/rbac/auditLogs/
  // sso/saml/zeroDataRetention = true), which contradicts the per-provider
  // capability evidence (e.g. kimi's own `sso` entry scores 0 with the note
  // "No SSO or identity management capability is documented"). When a block is
  // detected as shared boilerplate it is flagged UNVERIFIED here so scoring can
  // treat it as unknown instead of as a verified certification. See
  // detectBoilerplateGovernanceData().
  governanceDataVerified?: boolean;
  financialDataVerified?: boolean;

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
  /**
   * Product lifecycle stage, declared in provider.json. Absent means `active`.
   * `deprecated` / `sunset` products must not be scored as healthy growing
   * products — see KnowledgeScoringEngine.computeFutureGrowthScore().
   */
  lifecycleStatus?: 'active' | 'maintenance' | 'deprecated' | 'sunset';
  sources: string[];
}

export interface ProviderMetadata {
  id: string;
  name: string;
  category: 'ide' | 'chat' | 'api' | 'search';
  vendor: string;
  vendorProfile?: VendorProfile;
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
  lifecycleStatus?: 'active' | 'maintenance' | 'deprecated' | 'sunset';
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
  /** Signatures of `enterprise` / `financialProfile` blocks shared across the catalogue. */
  private static boilerplateEnterpriseSignatures = new Set<string>();
  private static boilerplateFinancialSignatures = new Set<string>();

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
            // NOTE: only the canonical id is written to `this.cache` (the enumerated
            // profile cache). Lookup aliases (e.g. 'copilot') live ONLY in
            // `knowledgeCache` above, so getProvider('copilot') still resolves while
            // getAllProviders() enumerates each provider exactly once.
            this.cache.set(synthesizedProfile.id.toLowerCase(), synthesizedProfile);
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

    // Flag copy-pasted governance/financial blocks as unverified before any
    // engine reads them (must run after every provider is cached).
    this.detectBoilerplateGovernanceData();

    // Run Knowledge Quality Engine validation once during initialization
    this.healthReport = KnowledgeQualityEngine.validateKnowledgeBase(Array.from(this.cache.values()));

    this.initialized = true;
  }

  /**
   * Marks `enterprise` / `financialProfile` blocks that are shared boilerplate
   * rather than researched per-provider data.
   *
   * Why this exists: every provider's plans.json currently ships a byte-identical
   * `enterprise` block (soc2/rbac/auditLogs/sso/saml/zeroDataRetention all true)
   * and an identical `financialProfile` (vendorLockInRisk "Low", scalingCost 50,
   * ...). Consuming those as facts produced constant securityScore (67),
   * enterpriseScore (70) and complianceScore (50) for all 13 providers, made the
   * enterprise-security strategy's 35% security weight inert, and made the
   * `requireZeroRetention` penalty impossible to trigger — while directly
   * contradicting the per-provider capability evidence.
   *
   * Detection is structural, not name-based: any block whose canonical signature
   * is shared by at least half of the catalogue (and by 3+ providers) is
   * boilerplate. If real per-provider data is authored later, its signature
   * becomes distinct and the flag flips to verified with no code change.
   */
  private static detectBoilerplateGovernanceData(): void {
    const profiles = Array.from(this.cache.values());
    if (profiles.length === 0) return;

    const threshold = Math.max(3, Math.ceil(profiles.length / 2));

    const collect = (pick: (p: ProviderProfile) => unknown): Set<string> => {
      const counts = new Map<string, number>();
      for (const p of profiles) {
        const sig = this.canonicalSignature(pick(p));
        if (sig === null) continue;
        counts.set(sig, (counts.get(sig) ?? 0) + 1);
      }
      const shared = new Set<string>();
      counts.forEach((count, sig) => { if (count >= threshold) shared.add(sig); });
      return shared;
    };

    this.boilerplateEnterpriseSignatures = collect(p => p.enterprise);
    this.boilerplateFinancialSignatures = collect(p => p.financialProfile);

    for (const p of profiles) this.applyDataProvenanceFlags(p);
  }

  /**
   * Stamps `governanceDataVerified` / `financialDataVerified` onto a profile.
   * Called both by the startup detection pass and by every fresh
   * synthesizeProfile() call, so profiles obtained via getProvider(id, modelId)
   * carry the same provenance flags as the cached ones.
   */
  private static applyDataProvenanceFlags(p: ProviderProfile): void {
    const entSig = this.canonicalSignature(p.enterprise);
    const finSig = this.canonicalSignature(p.financialProfile);
    p.governanceDataVerified = entSig !== null && !this.boilerplateEnterpriseSignatures.has(entSig);
    p.financialDataVerified = finSig !== null && !this.boilerplateFinancialSignatures.has(finSig);
  }

  /** Order-independent JSON signature used to spot duplicated data blocks. */
  private static canonicalSignature(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const walk = (v: any): any => {
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        return Object.keys(v).sort().reduce<Record<string, any>>((acc, k) => {
          acc[k] = walk(v[k]);
          return acc;
        }, {});
      }
      return v;
    };
    try {
      return JSON.stringify(walk(value));
    } catch {
      return null;
    }
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

    const profile: ProviderProfile = {
      schemaVersion: provider.schemaVersion || '2.0.0',
      knowledgeVersion: provider.knowledgeVersion || '1.0.0',
      lastVerified: provider.lastUpdated || '2026-05-07',
      lastUpdated: provider.lastUpdated || '2026-05-07',

      id: provider.id,
      name: provider.name,
      category: provider.category,
      vendor: provider.vendor,
      // Real, per-provider vendor data (stabilityRating "Very High"/"High"/
      // "Medium", establishedYear, fundingStage, enterprisePresence, vendorId,
      // productFamily). Previously dropped here, which made
      // KnowledgeScoringEngine's `raw.vendorProfile?.stabilityRating` lookup
      // always undefined and silently collapsed vendor stability to a constant.
      vendorProfile: provider.vendorProfile,
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
      lifecycleStatus: provider.lifecycleStatus,
      sources: provider.sources || []
    };

    this.applyDataProvenanceFlags(profile);
    return profile;
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
      vendorProfile: raw.vendorProfile,
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
      lifecycleStatus: raw.lifecycleStatus,
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
    // Defensive de-duplication by canonical id: guarantees each provider is
    // enumerated exactly once even if a future lookup alias leaks into `cache`.
    // First occurrence wins, preserving insertion order.
    const unique = new Map<string, ProviderProfile>();
    for (const profile of this.cache.values()) {
      const key = profile.id.toLowerCase();
      if (!unique.has(key)) unique.set(key, profile);
    }
    return Array.from(unique.values());
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
