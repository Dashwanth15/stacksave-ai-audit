// ============================================================
// AI Stack Recommendation Engine — StackSave AI Platform Intelligence
//
// Core stack intelligence engine for Flow 2 (Build Stack).
// Evaluates provider capabilities, enforces application vs infrastructure
// separation, constructs prioritized multi-role stacks (01 PRIMARY,
// 02 SECONDARY, 03 OPTIONAL, 04 API LAYER), and generates 5-8 distinct,
// deduplicated procurement strategy models with ranked alternatives.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { KnowledgeLoader } from './KnowledgeLoader';
import { ScoredProviderProfile, KnowledgeScoringEngine } from './KnowledgeScoringEngine';
import { StackCoverageAnalyzer, StackCoverageResult } from './StackCoverageAnalyzer';
import { WorkflowEngine } from './WorkflowEngine';
import {
  StackBuilderRequest,
  StackRecommendation,
  OptimizedStackSet,
  CategoryResult,
  StructuredStack,
  StackToolAssignment,
  AlternativeStackComparison,
  RejectedAlternative,
  RejectionCategory,
  BudgetSimulation,
  RecommendationTrace,
  ProviderScoreTrace,
  StackStrategy,
  UserContextSummary,
  BudgetConstraintState
} from '../../types/stackBuilder';

const DOMAIN_LABELS: Record<string, string> = {
  'software-engineering': 'Software Engineering',
  'ai-data-ml': 'AI & Machine Learning',
  'research-knowledge': 'Research & Knowledge Intelligence',
  'product-design': 'Product & Design Engineering',
  'business-operations': 'Business Operations & Automation',
  'content-communication': 'Content & Technical Communication',
  'enterprise-compliance': 'Enterprise Security & Governance',
  'general-productivity': 'General Team Productivity',
  // Legacy aliases
  'coding': 'Software Engineering',
  'frontend': 'Frontend & UI Engineering',
  'backend': 'Backend & Systems Engineering',
  'fullstack': 'Full-Stack Engineering',
  'ai-engineering': 'AI & ML Engineering',
  'data-science': 'Data & Analytics',
  'research': 'Research & Knowledge',
  'writing': 'Content & Writing',
  // Frontend-sent domain aliases that must not fall back to software-engineering
  'enterprise-governance': 'Enterprise Security & Governance',
  'general': 'General Team Productivity',
  'ai-ml': 'AI & Machine Learning',
  'research-and-knowledge': 'Research & Knowledge Intelligence',
  'content': 'Content & Technical Communication',
  'product': 'Product & Design Engineering',
  'business': 'Business Operations & Automation',
};

const STRATEGY_METAS: Record<StackStrategy, { title: string; badge: string; description: string }> = {
  'balanced': {
    title: 'Best Overall Architecture',
    badge: 'Recommended',
    description: 'Optimal balance of core domain execution, complementary reasoning, and seat cost efficiency.'
  },
  'best-value': {
    title: 'Best Value Architecture',
    badge: 'Cost Optimized',
    description: 'Maximizes cost savings per seat while preserving critical workflow requirements and capability retention.'
  },
  'max-performance': {
    title: 'Maximum Performance Suite',
    badge: 'Top Benchmarks',
    description: 'Uncompromised benchmark quality, state-of-the-art reasoning, and maximum execution velocity.'
  },
  'enterprise-security': {
    title: 'Enterprise Security & Governance',
    badge: 'Strict Security',
    description: 'Zero data retention, SAML SSO, SOC 2/HIPAA compliance, and enterprise administrative controls.'
  }
};

export class AIStackRecommendationEngine {

  /**
   * Main entry point for Flow 2 recommendation intelligence.
   */
  public static run(rawReq: StackBuilderRequest): StackRecommendation {
    const startTime = Date.now();
    const recommendationId = uuidv4();
    KnowledgeLoader.initialize();

    const weights = KnowledgeLoader.getRecommendationWeights();

    // 1. Normalize user inputs
    const domain = this.normalizeDomain(rawReq);
    const requirements = this.normalizeRequirements(rawReq);
    const activeStrategy: StackStrategy = rawReq.strategy || (rawReq.preferences?.maximizeSavings ? 'best-value' : 'balanced');
    const teamSize = Math.min(Math.max(1, Math.round(rawReq.teamSize || 1)), 10000);
    const monthlyBudget = rawReq.monthlyBudget !== undefined && rawReq.monthlyBudget !== null
      ? Math.max(0, rawReq.monthlyBudget)
      : null;

    const normalizedReq: StackBuilderRequest = {
      domain,
      requirements,
      strategy: activeStrategy,
      teamSize,
      monthlyBudget,
      engineeringFocus: [domain],
      primaryWorkflow: domain,
      mustHaveFeatures: requirements,
      preferences: {
        preferOpenSource: Boolean(rawReq.preferences?.preferOpenSource),
        avoidLockIn: Boolean(rawReq.preferences?.avoidLockIn),
        maximizeSavings: Boolean(rawReq.preferences?.maximizeSavings || activeStrategy === 'best-value'),
        preferEstablishedVendors: Boolean(rawReq.preferences?.preferEstablishedVendors),
        requireZeroRetention: Boolean(rawReq.preferences?.requireZeroRetention || activeStrategy === 'enterprise-security')
      },
      constraints: rawReq.constraints || {},
      debug: rawReq.debug === true
    };

    // 2. Score all loaded providers
    const allScored = KnowledgeScoringEngine.scoreAll();

    // Apply constraints
    const excludeVendors = (normalizedReq.constraints?.excludeVendors as string[]) || [];
    const excludeCategories = (normalizedReq.constraints?.excludeCategories as string[]) || [];
    const filteredScored = allScored.filter(p => {
      if (excludeVendors.some(ev => ev.toLowerCase() === p.vendorId.toLowerCase())) return false;
      if (excludeCategories.some(ec => ec.toLowerCase() === p.category.toLowerCase())) return false;
      return true;
    });

    // 3. Build each Category Result using dedicated strategy scoring and multi-role stack construction
    const bestOverallCategory = this.buildCategoryArchitecture('bestOverall', activeStrategy, filteredScored, normalizedReq, weights);
    const bestValueCategory = this.buildCategoryArchitecture('bestValue', 'best-value', filteredScored, normalizedReq, weights);
    const bestPerformanceCategory = this.buildCategoryArchitecture('bestPerformance', 'max-performance', filteredScored, normalizedReq, weights);
    const bestEnterpriseCategory = this.buildCategoryArchitecture('bestEnterprise', 'enterprise-security', filteredScored, normalizedReq, weights);

    // 4. Derive Legacy OptimizedStackSet for backward compatibility
    const bestOverallStack = bestOverallCategory.recommendedStack;
    bestOverallStack.growthSimulation = this.buildGrowthSimulation(bestOverallStack, normalizedReq.teamSize);

    const optimizedStackSet: OptimizedStackSet = {
      bestOverall: bestOverallStack,
      bestBudget: bestValueCategory.recommendedStack,
      bestPerformance: bestPerformanceCategory.recommendedStack,
      bestEnterprise: bestEnterpriseCategory.recommendedStack
    };

    // 5. Generate Detailed Evaluated Provider Notes for Rejected Providers
    const selectedProviderIds = new Set<string>(bestOverallStack.tools.map(t => t.toolId));
    const alternatives: RejectedAlternative[] = [];
    const rejectedTrace: RecommendationTrace['rejectedProviders'] = [];

    for (const p of filteredScored) {
      if (selectedProviderIds.has(p.id)) continue;

      const evalDetail = this.deriveRejectedDetail(p, bestOverallStack, normalizedReq, weights, activeStrategy, filteredScored);
      alternatives.push(evalDetail);

      rejectedTrace.push({
        providerId: p.id,
        providerName: p.name,
        reason: evalDetail.whyNotSelected,
        compositeScore: evalDetail.compositeScore,
        wouldHaveCovered: evalDetail.wouldHaveCovered
      });
    }

    // 6. Build Budget Simulation Matrix
    const budgetSimulation = this.runBudgetSimulation(filteredScored, normalizedReq, weights);

    // 7. Context Summary
    const userContextSummary: UserContextSummary = {
      domain,
      domainLabel: DOMAIN_LABELS[domain] || domain,
      teamSize,
      budgetFormatted: monthlyBudget !== null ? `$${monthlyBudget.toLocaleString()}/mo` : 'No Hard Limit',
      strategy: activeStrategy,
      strategyLabel: STRATEGY_METAS[activeStrategy]?.title || activeStrategy,
      requirementCount: requirements.length
    };

    const totalDurationMs = Date.now() - startTime;
    const knowledgeVersion = KnowledgeLoader.getKnowledgeVersionMetadata();

    // Ranked through the same deterministic ladder as the selection pools (P13), so the
    // trace the user sees is ordered exactly the way the engine actually ranks — a bare
    // score sort leaked the alphabetical catalogue order whenever scores tied.
    const profilesById = new Map(filteredScored.map(p => [p.id, p]));
    const allProviderScores: ProviderScoreTrace[] = filteredScored.map(p => ({
      providerId: p.id,
      providerName: p.name,
      category: p.category,
      compositeScore: this.getCompositeScore(p, normalizedReq, weights, activeStrategy),
      workflowScore: WorkflowEngine.calculateSuitability(p.raw, domain),
      featureCoverageScore: StackCoverageAnalyzer.computeProviderCoverageScore(p, requirements),
      costEfficiencyScore: p.costEfficiencyScore,
      enterpriseScore: p.enterpriseScore,
      vendorStabilityScore: p.vendorStabilityScore,
      budgetFit: this.isProviderFitForIndividualBudget(p, normalizedReq),
      preferenceModifierApplied: this.getPreferenceModifiersNet(p, normalizedReq, weights)
    })).sort((a, b) => {
      const delta = b.compositeScore - a.compositeScore;
      if (Math.abs(delta) > 0.0001) return delta;
      const pa = profilesById.get(a.providerId);
      const pb = profilesById.get(b.providerId);
      if (!pa || !pb) return a.providerId.localeCompare(b.providerId);
      return this.compareForTie(pa, pb, normalizedReq, activeStrategy);
    });

    // Mark providers whose composite score sits inside noise of the leader within their
    // own pool. A 2-point gap on a 0–100 composite built from 0–10 capability vectors is
    // not a real quality difference, and the trace should not imply that it is.
    for (const pool of ['api', 'app'] as const) {
      const members = allProviderScores.filter(s => (pool === 'api') === (s.category === 'api'));
      const leader = members[0];
      if (!leader) continue;
      const tied = members.filter(s => leader.compositeScore - s.compositeScore <= 2);
      // One member inside the band is just the leader standing alone — not a tie.
      if (tied.length < 2) continue;
      for (const s of tied) s.statisticalTie = true;
    }


    const response: StackRecommendation = {
      recommendationId,
      createdAt: new Date().toISOString(),
      userContextSummary,
      knowledgeVersion,
      stacks: optimizedStackSet,
      categories: {
        bestOverall: bestOverallCategory,
        bestValue: bestValueCategory,
        bestPerformance: bestPerformanceCategory,
        bestEnterprise: bestEnterpriseCategory
      },
      alternatives: alternatives.sort((a, b) => {
        // Same deterministic ladder (P13) — rejected providers on equal composite scores
        // must not be ordered by catalogue load order.
        const delta = b.compositeScore - a.compositeScore;
        if (Math.abs(delta) > 0.0001) return delta;
        const pa = profilesById.get(a.toolId);
        const pb = profilesById.get(b.toolId);
        if (!pa || !pb) return a.toolId.localeCompare(b.toolId);
        return this.compareForTie(pa, pb, normalizedReq, activeStrategy);
      }),
      budgetSimulation,
      featureCoverage: bestOverallStack.coverageResult
    };

    if (normalizedReq.debug) {
      const applicationRanking = allProviderScores.filter(p => p.category !== 'api');
      const apiRanking = allProviderScores.filter(p => p.category === 'api');

      // Trace how the working domain was resolved so a fired neutral fallback is auditable.
      const domainExplicitlyProvided = Boolean(
        (rawReq.domain && DOMAIN_LABELS[rawReq.domain]) ||
        (rawReq.primaryWorkflow && DOMAIN_LABELS[rawReq.primaryWorkflow]) ||
        (rawReq.engineeringFocus && rawReq.engineeringFocus[0] && DOMAIN_LABELS[rawReq.engineeringFocus[0]])
      );

      response.trace = {
        requestId: recommendationId,
        timestamp: new Date().toISOString(),
        domainResolution: {
          rawDomain: rawReq.domain ?? null,
          resolvedDomain: domain,
          usedNeutralFallback: !domainExplicitlyProvided
        },
        inputs: {
          domain,
          domainLabel: userContextSummary.domainLabel,
          teamSize,
          monthlyBudget,
          requirements,
          strategy: activeStrategy,
          preferences: normalizedReq.preferences || {}
        },
        strategyUsed: `hierarchical-procurement-v2 (${activeStrategy})`,
        knowledgeSnapshot: knowledgeVersion,
        applicationRanking,
        apiRanking,
        allProviderScores,
        rejectedProviders: rejectedTrace,
        totalDurationMs
      };
    }

    return response;
  }

  // ── Multi-Role Stack Construction & Deduplication ──────────────────────────

  /**
   * Builds a complete CategoryResult containing a prioritized recommended stack (Rank #1)
   * plus 5-8 distinct, deduplicated alternative stacks with explicit purposes.
   */
  private static buildCategoryArchitecture(
    categoryId: CategoryResult['categoryId'],
    strategy: StackStrategy,
    providers: ScoredProviderProfile[],
    req: StackBuilderRequest,
    weights: any
  ): CategoryResult {
    const meta = STRATEGY_METAS[strategy];
    const domain = req.domain || req.primaryWorkflow || 'general-productivity';
    const requirements = req.requirements || req.mustHaveFeatures || [];

    // Separate Workspace Applications from Developer APIs
    const applicationProviders = providers.filter(p => p.category !== 'api');
    const apiProviders = providers.filter(p => p.category === 'api');

    // Rank both pools through the deterministic tie-break ladder so equal composite
    // scores resolve on requirement coverage → domain fit → strategy factor → cost →
    // reliability → stable id, instead of leaking the alphabetical catalogue order.
    const rankedAppProviders = this.rankPool(applicationProviders, req, weights, strategy);
    const rankedApiProviders = this.rankPool(apiProviders, req, weights, strategy);

    // 1. Construct Rank #1: Recommended Stack
    // Mandatory requirement coverage is a GATE, not one weighted factor among many (P6/P10).
    // The primary is drawn from the affordable providers that can lead a stack reaching the
    // maximum attainable FULL coverage; composite score only orders providers inside that
    // eligible set. Without the gate, raising the budget could promote a cheaper but less
    // capable provider — its budget-fit factor improves relative to the leader — and
    // requirement coverage would fall as the ceiling rose (the P10 regression).
    //
    // Requirements a dedicated stack role owns are excluded from the primary gate. The 04
    // API LAYER slot is what satisfies programmatic access, so gating the workspace tool on
    // it made "I also need an API" silently replace the user's editor or chat recommendation
    // with whichever chat product scored highest on the `api` capability.
    const primaryGateRequirements = this.requirementsGatingPrimary(requirements);
    const primaryEligible = this.gateByMandatoryCoverage(rankedAppProviders, req, primaryGateRequirements);
    const primarySeed1 = primaryEligible[0] || rankedAppProviders[0] || providers[0];
    const recommendedStack = this.assembleHierarchicalStack(
      `stack-${categoryId}-rank1`,
      meta.title,
      1,
      '#1 Recommended Architecture',
      primarySeed1,
      rankedAppProviders,
      rankedApiProviders,
      req,
      weights,
      strategy,
      'Optimal baseline architecture balancing domain velocity, reasoning, and seat cost.'
    );

    // 2. Generate 6-10 Distinct Alternative Architectures with Canonical Deduplication
    // 2. Generate 6-10 Distinct Alternative Architectures with Canonical Deduplication
    const seenSignatures = new Set<string>();
    const seenProviderSignatures = new Set<string>();

    // Strictly register the recommended stack's sorted provider set to prevent any reverse duplicate
    const recProviderIdSignature = [...recommendedStack.tools.map(t => t.toolId)].sort().join('|');
    seenSignatures.add(recommendedStack.canonicalSignature);
    seenProviderSignatures.add(recProviderIdSignature);

    const alternativeComparisons: AlternativeStackComparison[] = [];
    const generatedStacks: StructuredStack[] = [recommendedStack];

    // Identify candidate providers from domain rankings & catalog
    const topApps = rankedAppProviders;
    const p1 = topApps[0];

    // ── Archetype objectives, resolved from the ranked pool by role ───────────
    // No provider-id literals: each archetype declares the objective it optimises
    // for and the winner is whichever provider the capability/pricing data picks.
    // Objectives are resolved lazily inside the blueprint loop against the set of
    // primaries already shown, so when two objectives share a winner the second
    // archetype presents the best *remaining* provider for its own objective
    // rather than collapsing into a duplicate of the first.
    const featureFit = (feature: string) => (p: ScoredProviderProfile) => this.featureCapabilityFit(p, feature);
    const byStrategy = (s: StackStrategy) => (p: ScoredProviderProfile) => this.getCompositeScore(p, req, weights, s);

    const governanceObjective = (p: ScoredProviderProfile): number | null => {
      // Unknown governance is not satisfied governance: an enterprise archetype may
      // only be seeded from verified governance data or direct capability evidence.
      const evidence = p.capabilityVector['enterpriseSecurity'] ?? 0;
      if (!p.governanceDataVerified && evidence < 5) return null;
      return this.getCompositeScore(p, req, weights, 'enterprise-security');
    };
    // Broadest baseline coverage across every deduped requirement dimension, i.e. the
    // best generalist rather than the winner of the user's specific requirements.
    const generalistObjective = (p: ScoredProviderProfile): number | null =>
      this.computeRequirementCapabilityScore(p, []);
    const portabilityObjective = (p: ScoredProviderProfile): number | null => this.portabilityScore(p);

    const singleVendorFamily = this.rankVendorFamilies(topApps, req, weights, strategy)[0];

    /**
     * Companion that closes the largest remaining requirement gap for `seed`, falling
     * back to raw strength only when no gap is left — so a pair archetype never pads a
     * complete primary with an arbitrary second tool chosen for its brand.
     */
    const gapCompanionFor = (
      seed: ScoredProviderProfile | undefined,
      subStrategy: StackStrategy
    ): ScoredProviderProfile | undefined => {
      if (!seed) return undefined;
      return this.pickByObjective(topApps, p => {
        const gapsClosed = StackCoverageAnalyzer.newFeaturesCovered(p, [seed], requirements).length;
        const strength = this.getCompositeScore(p, req, weights, subStrategy);
        return gapsClosed > 0 ? 1000 + gapsClosed * 100 + strength : strength;
      }, req, subStrategy, new Set([seed.id]));
    };

    /** Strongest provider from a different vendor than `seed`. */
    const crossVendorCompanionFor = (
      seed: ScoredProviderProfile | undefined,
      subStrategy: StackStrategy
    ): ScoredProviderProfile | undefined => {
      if (!seed) return undefined;
      const seedVendor = seed.vendorProfile?.vendorId || seed.vendorId;
      return this.pickByObjective(topApps, p => {
        const vendor = p.vendorProfile?.vendorId || p.vendorId;
        if (vendor === seedVendor) return null;
        return this.getCompositeScore(p, req, weights, subStrategy);
      }, req, subStrategy, new Set([seed.id]));
    };

    // 12 Strategically Distinct Candidate Blueprints Covering Major Procurement Types
    const candidateBlueprints: Array<{
      purposeLabel: string;
      rankTitle: string;
      architectureType: string;
      /** Objective the archetype optimises for; resolved against already-used primaries. */
      objective?: (p: ScoredProviderProfile) => number | null;
      /** Explicit seed for archetypes whose identity is structural rather than objective-based. */
      seedProvider?: ScoredProviderProfile | undefined;
      secondarySeed?: ScoredProviderProfile | undefined;
      /** How the companion is chosen once the seed is known. */
      companion?: 'gap' | 'crossVendor';
      subStrategy: StackStrategy;
      customReason: string;
      bestFor: string;
      mainAdvantage: string;
      mainTradeoff: string;
      whyChooseInstead: string;
      whyNotRecommended: string;
      forceSingleTool?: boolean;
      /**
       * Whether this archetype answers a question THIS request actually raises.
       * `undefined` = unconditional (a procurement shape every buyer weighs).
       * Capability specialists set it from `archetypeIsRelevant`, so an Enterprise Security
       * architecture no longer appears for a request with no governance requirement in a
       * domain whose workflow weights do not emphasise governance.
       */
      relevantIf?: boolean;
    }> = [
      // 1. CHEAPEST VIABLE (Best Value)
      {
        purposeLabel: 'Best Value Architecture',
        rankTitle: '#2 Best Value Architecture',
        architectureType: 'cost-efficient-pro',
        objective: byStrategy('best-value'),
        companion: 'gap',
        subStrategy: 'best-value',
        customReason: 'Maximizes capability per dollar using the cheapest genuinely purchasable tiers that still satisfy your requirements.',
        bestFor: 'Budget-conscious teams seeking strong core capabilities with minimum seat expense.',
        mainAdvantage: 'Highest measured capability-per-seat-dollar ratio in the evaluated catalogue.',
        mainTradeoff: 'Uses entry-level subscription tiers which may have tighter burst quotas during peak hours.',
        whyChooseInstead: 'Substantially reduces monthly software spend while maintaining daily operational velocity.',
        whyNotRecommended: 'Optimises cost ahead of the requirement coverage and domain fit the #1 stack leads on.'
      },
      // 2. HIGHEST PERFORMANCE
      {
        purposeLabel: 'Maximum Performance Suite',
        rankTitle: '#3 High-Performance Flagship Suite',
        architectureType: 'performance-flagship',
        objective: byStrategy('max-performance'),
        companion: 'gap',
        subStrategy: 'max-performance',
        customReason: 'Leads on published domain-relevant benchmarks and reasoning capability, with cost weighted lowest.',
        bestFor: 'High-leverage teams demanding top-tier mathematical and architectural reasoning.',
        mainAdvantage: 'Strongest available reasoning and benchmark evidence for this domain.',
        mainTradeoff: 'Weights measured capability above price, so the cheapest viable tier is not what this architecture optimises for.',
        whyChooseInstead: 'Unlocks frontier intelligence for complex, ambiguous, or multi-step engineering tasks.',
        whyNotRecommended: 'Optimises capability evidence ahead of the cost and coverage balance the #1 stack leads on.'
      },
      // 3. DEVELOPER PRODUCTIVITY (in-editor generation)
      {
        purposeLabel: 'Developer Productivity Suite',
        rankTitle: '#4 Developer Productivity Architecture',
        architectureType: 'developer-productivity',
        objective: featureFit('editor-code-generation'),
        companion: 'gap',
        subStrategy: 'balanced',
        relevantIf: this.archetypeIsRelevant(
          ['autocomplete', 'coding', 'multiFileEditing', 'ideIntegration'], requirements, domain
        ),
        customReason: 'Led by the highest measured in-editor code generation capability (autocomplete, multi-file editing).',
        bestFor: 'Engineering teams whose day is spent writing and refactoring code inside an editor.',
        mainAdvantage: 'Strongest inline completion and multi-file edit capability scores in the catalogue.',
        mainTradeoff: 'Editor-centric tooling covers non-coding team workflows less broadly.',
        whyChooseInstead: 'Puts the strongest measured coding assistant at the centre of the stack.',
        whyNotRecommended: 'Narrower coverage outside the editor than a general workspace assistant.'
      },
      // 4. AUTONOMOUS AGENTIC DEVELOPMENT
      {
        purposeLabel: 'Autonomous Agentic Suite',
        rankTitle: '#5 Fast Autonomous Agentic Suite',
        architectureType: 'agentic-development',
        objective: featureFit('automated-task-execution'),
        companion: 'gap',
        subStrategy: 'balanced',
        relevantIf: this.archetypeIsRelevant(
          ['aiAgent', 'functionCalling', 'terminalIntegration'], requirements, domain
        ),
        customReason: 'Led by the highest measured autonomous task execution capability (agent, tool calling, terminal).',
        bestFor: 'Fast-moving developers who rely heavily on autonomous multi-file agent execution.',
        mainAdvantage: 'Strongest agentic execution and terminal integration capability evidence in the catalogue.',
        mainTradeoff: 'Autonomous execution needs closer review of generated changes.',
        whyChooseInstead: 'Superior autonomous multi-file refactoring and agentic terminal execution.',
        whyNotRecommended: 'Specialized for autonomous execution rather than general team workflows.'
      },
      // 5. RESEARCH HEAVY (live search grounding)
      {
        purposeLabel: 'Research & Live Intelligence',
        rankTitle: '#6 Research & Web Intelligence Suite',
        architectureType: 'research-enhanced',
        objective: featureFit('live-web-research'),
        companion: 'gap',
        subStrategy: 'balanced',
        relevantIf: this.archetypeIsRelevant(['research'], requirements, domain),
        customReason: 'Led by the highest measured live web research capability with verifiable citations.',
        bestFor: 'Teams requiring daily external market research, legal tracking, or verified source citations.',
        mainAdvantage: 'Strongest real-time research and citation capability evidence in the catalogue.',
        mainTradeoff: 'Research-first tooling is weaker on in-editor code generation.',
        whyChooseInstead: 'Directly grounds daily analysis in real-time internet search and source citations.',
        whyNotRecommended: 'Requires an extra subscription if real-time web citations are only occasionally needed.'
      },
      // 6. LONG-CONTEXT DEEP INGESTION
      {
        purposeLabel: 'Long-Context Analysis Suite',
        rankTitle: '#7 Long-Context Analysis Suite',
        architectureType: 'long-context',
        objective: featureFit('large-document-processing'),
        companion: 'gap',
        subStrategy: 'max-performance',
        relevantIf: this.archetypeIsRelevant(
          ['longContext', 'largeCodebaseUnderstanding'], requirements, domain
        ),
        customReason: 'Led by the highest measured long-context and large-codebase understanding capability.',
        bestFor: 'Teams analyzing massive repositories, entire books, or extensive legal/technical datasets.',
        mainAdvantage: 'Largest usable context window for whole-codebase and full-corpus ingestion.',
        mainTradeoff: 'Specialized deep-context focus requires managing cross-ecosystem workflows.',
        whyChooseInstead: 'Processes complete multi-megabyte documentation and repositories in a single prompt.',
        whyNotRecommended: 'Optimises a single deep-context dimension rather than the balanced objective the #1 stack leads on.'
      },
      // 7. ENTERPRISE GOVERNANCE & ZERO RETENTION
      {
        purposeLabel: 'Enterprise Security & Governance',
        rankTitle: '#8 Enterprise Security Architecture',
        architectureType: 'enterprise-governance',
        objective: governanceObjective,
        companion: 'gap',
        subStrategy: 'enterprise-security',
        // Also relevant when the request itself is a governance request even without a
        // governance requirement ticked: an explicit enterprise-security strategy, or a
        // team large enough that centralised administration is a procurement question.
        relevantIf: this.archetypeIsRelevant(['enterpriseSecurity', 'sso', 'saml'], requirements, domain)
          || strategy === 'enterprise-security'
          || req.teamSize >= this.TEAM_ADMIN_SEAT_THRESHOLD,
        customReason: 'Led by the strongest verified governance posture: SSO, admin controls, and enterprise security evidence.',
        bestFor: 'Enterprises with strict InfoSec requirements, compliance audits, and centralized SSO.',
        mainAdvantage: 'Highest verified identity, admin-control, and enterprise-security evidence in the catalogue.',
        mainTradeoff: 'Governance-grade administration is only offered on team and enterprise tiers, which changes the procurement path.',
        whyChooseInstead: 'Meets rigorous InfoSec mandates and corporate compliance standards without exception.',
        whyNotRecommended: 'Selects for administrative and identity controls ahead of the capability and cost balance the #1 stack leads on.'
      },
      // 8. OPEN / PORTABLE ECOSYSTEM
      {
        purposeLabel: 'Open Ecosystem Architecture',
        rankTitle: '#9 Open Ecosystem Architecture',
        architectureType: 'open-ecosystem',
        objective: portabilityObjective,
        companion: 'crossVendor',
        subStrategy: 'best-value',
        // Portability is a preference, not a capability: this archetype answers a question
        // only a user who asked about lock-in or openness has raised.
        relevantIf: !!req.preferences?.avoidLockIn || !!req.preferences?.preferOpenSource,
        customReason: 'Maximum model portability: broad multi-model support and public API access minimise switching cost.',
        bestFor: 'Teams prioritizing vendor neutrality and the ability to swap underlying models.',
        mainAdvantage: 'Broadest multi-model support with public API access, reducing single-lab dependency.',
        mainTradeoff: 'Fewer built-in enterprise management controls and turnkey integrations.',
        whyChooseInstead: 'Avoids closed-ecosystem pricing lock-in and keeps model choice open.',
        whyNotRecommended: 'Less comprehensive enterprise identity and compliance certifications.'
      },
      // 9. SINGLE VENDOR CONSOLIDATION
      {
        purposeLabel: 'Single-Vendor Consolidation',
        rankTitle: '#10 Single-Vendor Architecture',
        architectureType: 'single-vendor',
        seedProvider: singleVendorFamily?.members[0],
        secondarySeed: singleVendorFamily?.members[1],
        subStrategy: 'balanced',
        customReason: singleVendorFamily
          ? `Consolidates the stack inside the ${singleVendorFamily.members[0].vendor} product family for one contract and one identity domain.`
          : 'Consolidates the stack inside a single vendor product family.',
        bestFor: 'Procurement teams that want one vendor contract, one invoice, and one identity domain.',
        mainAdvantage: 'Single contract, unified billing, and consistent administrative controls across the stack.',
        mainTradeoff: 'Concentrates vendor risk: an outage or price change affects the whole stack at once.',
        whyChooseInstead: 'Removes multi-vendor procurement and identity overhead entirely.',
        whyNotRecommended: 'Highest vendor concentration of all evaluated architectures.'
      },
      // 10. MINIMAL UNIFIED CORE (Single Tool)
      {
        purposeLabel: 'Minimal Single-Tool Core',
        rankTitle: '#11 Minimal Single-Tool Core',
        architectureType: 'minimal-core',
        seedProvider: p1,
        forceSingleTool: true,
        subStrategy: strategy,
        customReason: 'Unified single-subscription workspace eliminating tool sprawl and multiple portal management.',
        bestFor: 'Lean organizations seeking zero management overhead and a single consolidated subscription.',
        mainAdvantage: 'Consolidates all AI assistance under a single subscription portal with zero tool sprawl.',
        mainTradeoff: 'Lacks specialized secondary companion for tasks outside the primary tool\'s core strength.',
        whyChooseInstead: 'Zero tool sprawl, single invoice, and simplest possible team onboarding.',
        whyNotRecommended: 'Leaves specialized capabilities uncovered compared to a dual-tool synergistic stack.'
      },
      // 11. GENERAL TEAM WORKSPACE (broadest baseline coverage)
      {
        purposeLabel: 'General Team AI Workspace',
        rankTitle: '#12 General Team Workspace',
        architectureType: 'general-ai',
        objective: generalistObjective,
        companion: 'gap',
        subStrategy: 'balanced',
        customReason: 'Broadest baseline capability across every requirement dimension, for mixed technical and non-technical teams.',
        bestFor: 'Cross-functional teams needing versatile assistance across writing, research, and analysis.',
        mainAdvantage: 'Highest average capability across all evaluated requirement dimensions.',
        mainTradeoff: 'Generalist coverage rather than a category-leading score in any single dimension.',
        whyChooseInstead: 'Provides a unified assistant that serves non-technical and technical team members alike.',
        whyNotRecommended: 'A specialist tool scores higher on the specific requirements you selected.'
      },
      // 12. CROSS-PLATFORM DIVERSE PAIR
      {
        purposeLabel: 'Cross-Platform Team Stack',
        rankTitle: '#13 Cross-Platform Architecture',
        architectureType: 'cross-platform',
        seedProvider: p1,
        companion: 'crossVendor',
        subStrategy: 'balanced',
        customReason: 'Diversified stack deliberately pairing two different vendors to avoid single-lab dependency.',
        bestFor: 'Organizations looking to diversify foundation model exposure across multiple top AI labs.',
        mainAdvantage: 'Eliminates single-lab dependency by pairing complementary vendors.',
        mainTradeoff: 'Managing multiple provider dashboards and subscription contracts.',
        whyChooseInstead: 'Provides resilience against rate limits and single-provider service degradations.',
        whyNotRecommended: 'Higher administrative overhead managing distinct subscription contracts.'
      }
    ];

    let rankCounter = 2;
    // Primaries already presented to the user. An objective-based archetype resolves to
    // the best provider for its own objective that is not already leading another stack.
    const usedPrimaryIds = new Set<string>([primarySeed1.id]);

    for (const bp of candidateBlueprints) {
      if (bp.relevantIf === false) continue;
      const seedProvider = bp.objective
        ? this.pickByObjective(topApps, bp.objective, req, bp.subStrategy, usedPrimaryIds)
        : bp.seedProvider;
      if (!seedProvider) continue;

      let secondarySeed = bp.secondarySeed;
      if (bp.companion === 'gap') {
        secondarySeed = gapCompanionFor(seedProvider, bp.subStrategy);
      } else if (bp.companion === 'crossVendor') {
        secondarySeed = crossVendorCompanionFor(seedProvider, bp.subStrategy);
      }

      const altStack = this.assembleHierarchicalStack(
        `stack-${categoryId}-alt-${rankCounter}`,
        bp.rankTitle,
        rankCounter,
        bp.rankTitle,
        seedProvider,
        rankedAppProviders,
        rankedApiProviders,
        req,
        weights,
        bp.subStrategy,
        bp.customReason,
        bp.forceSingleTool,
        secondarySeed
      );

      // STRICT DEDUPLICATION: Check both full signature AND sorted provider ID set
      const providerIdSignature = [...altStack.tools.map(t => t.toolId)].sort().join('|');
      if (seenSignatures.has(altStack.canonicalSignature) || seenProviderSignatures.has(providerIdSignature)) {
        continue;
      }

      seenSignatures.add(altStack.canonicalSignature);
      seenProviderSignatures.add(providerIdSignature);
      usedPrimaryIds.add(seedProvider.id);
      altStack.purposeLabel = bp.purposeLabel;
      generatedStacks.push(altStack);

      const costDelta = altStack.estimatedMonthlyCost - recommendedStack.estimatedMonthlyCost;
      const isWithinBudget = req.monthlyBudget !== null ? altStack.estimatedMonthlyCost <= req.monthlyBudget : true;
      // Measured comparison against the stack actually recommended for THIS request. The
      // blueprint strings below are the archetype's claim and are request-independent by
      // construction; without this evidence the comparison prose came out byte-identical
      // for a $200 lean request and a 200-seat governance request.
      const evidence = this.describeAlternativeEvidence(altStack, recommendedStack, req);
      const budgetStatusText = req.monthlyBudget !== null
        ? (isWithinBudget
            ? `${Math.round((altStack.estimatedMonthlyCost / req.monthlyBudget) * 100)}% budget utilization`
            : `+$${(altStack.estimatedMonthlyCost - req.monthlyBudget).toLocaleString()} over ceiling`)
        : 'No hard budget limit';

      alternativeComparisons.push({
        rank: rankCounter,
        rankTitle: bp.rankTitle,
        purposeLabel: bp.purposeLabel,
        architectureType: bp.architectureType,
        stackSummary: altStack.tools.map(t => `${t.toolName} (${t.recommendedPlan})`).join(' + '),
        stack: altStack,
        perSeatCost: altStack.perSeatMonthlyCost,
        monthlyCost: altStack.estimatedMonthlyCost,
        matchScore: altStack.confidenceScore,
        domainFit: altStack.workflowFitScore,
        requirementCoverage: altStack.coverageResult.coverageScore,
        budgetFit: altStack.budgetStatus,
        budgetString: isWithinBudget ? `WITHIN BUDGET (${budgetStatusText})` : `OVER BUDGET (${budgetStatusText})`,
        bestFor: bp.bestFor || altStack.bestFor || 'Teams with specialized workflow requirements.',
        mainAdvantage: `${bp.mainAdvantage || altStack.advantages[0] || bp.customReason} ${evidence.advantage}`,
        mainTradeoff: `${bp.mainTradeoff || altStack.tradeoffs[0] || 'Requires managing alternative subscription portals.'} ${evidence.tradeoff}`,
        whyThisStack: altStack.whyThisStack,
        whyChooseInstead: `${bp.whyChooseInstead || bp.customReason} ${evidence.chooseInstead}`,
        whyNotRecommended: `${bp.whyNotRecommended} ${evidence.notRecommended}`,
        costDeltaVsPrimary: costDelta
      });

      rankCounter++;
      if (alternativeComparisons.length >= 10) break;
    }

    return {
      categoryId,
      title: meta.title,
      badge: meta.badge,
      description: meta.description,
      strategyUsed: strategy,
      recommendedStack,
      alternativeA: generatedStacks[1],
      alternativeB: generatedStacks[2],
      alternativeComparisons,
      // Legacy aliases
      rank1: recommendedStack,
      rank2: generatedStacks[1],
      rank3: generatedStacks[2]
    };
  }

  /**
   * Ranking objective for the 04 API LAYER slot (P11). Combines measured API capability,
   * coverage of the request's other required capabilities, domain-relevant performance
   * evidence, request-aware cost/value, reliability, and — only when the request actually
   * asks for it — governance evidence. Weights shift with the active strategy.
   * Returns null for providers with no usable developer-API capability signal.
   */
  private static apiLayerObjective(
    p: ScoredProviderProfile,
    req: StackBuilderRequest,
    weights: any,
    strategy: StackStrategy,
    requirements: string[]
  ): number | null {
    const apiFit = this.featureCapabilityFit(p, 'developer-api-access');
    if (apiFit === null || apiFit <= 0) return null;

    const domain = req.domain || req.primaryWorkflow || 'general-productivity';
    const requirementFit = this.computeRequirementCapabilityScore(p, requirements);
    const performance = this.domainRelevantBenchmarkScore(p, domain) ?? p.capabilityCompositeScore;
    const costValue = this.computeRequestAwareCostEfficiency(p, req);
    const governanceWanted = !!req.preferences?.requireZeroRetention
      || strategy === 'enterprise-security'
      || domain === 'enterprise-compliance';

    return Math.round(this.weightedScore([
      { value: apiFit, weight: 0.35 },
      { value: requirementFit, weight: 0.20 },
      { value: performance, weight: strategy === 'max-performance' ? 0.25 : 0.15 },
      { value: costValue, weight: strategy === 'best-value' ? 0.25 : 0.15 },
      { value: p.reliabilityScore, weight: 0.10 },
      { value: governanceWanted ? p.securityScore : null, weight: governanceWanted ? 0.20 : 0 }
    ]));
  }

  /**
   * Cheapest plan of `p` that entitles the stated requirements it is capable of — the tier
   * a team would actually have to buy, free tiers included when nothing is gated.
   *
   * Shared by the minimum-full-coverage estimate and its coverage resolver so the quoted
   * price and the coverage it claims to buy are the same decision.
   */
  private static cheapestEntitlingPlan(p: ScoredProviderProfile, requirements: string[]) {
    const usable = (p.plans ?? []).filter(pl => pl.id !== 'enterprise' && pl.monthlyPricePerSeat >= 0);
    if (usable.length === 0) return null;

    const byPrice = [...usable].sort(
      (a, b) => a.monthlyPricePerSeat - b.monthlyPricePerSeat
        || (this.planTierRank(a) - this.planTierRank(b))
    );
    const floors = this.requirementTierFloors(p, requirements);
    if (floors.length === 0) return byPrice[0];

    const gatesSatisfied = (plan: any): number =>
      floors.filter(floor => this.planTierRank(plan) >= floor).length;
    const best = Math.max(...byPrice.map(gatesSatisfied));
    const eligible = best > 0 ? byPrice.filter(pl => gatesSatisfied(pl) === best) : byPrice;
    return eligible[0];
  }

  /**
   * Greedy estimate of the cheapest monthly team cost that covers every required
   * feature: repeatedly buy the provider with the best (new features / price) ratio.
   * Returns null when no combination in the catalogue can cover all requirements.
   *
   * Full coverage at the ENTITLING tier, on both sides of the ratio. Priced from the
   * cheapest plan and credited from the plan-blind capability vector, this figure claimed a
   * $0 minimum for governance requirements that no free tier entitles — it is shown to the
   * user as "the cheapest stack that would meet your must-haves", so it has to be a price
   * that actually buys them.
   */
  private static estimateMinimumFullCoverageCost(
    pool: ScoredProviderProfile[],
    requirements: string[],
    teamSize: number
  ): number | null {
    if (requirements.length === 0) return 0;
    const remaining = new Set(requirements);
    const chosen: ScoredProviderProfile[] = [];
    let total = 0;

    const planCache = new Map<string, any>();
    const planFor = (p: ScoredProviderProfile) => {
      if (!planCache.has(p.id)) planCache.set(p.id, this.cheapestEntitlingPlan(p, requirements));
      return planCache.get(p.id);
    };

    while (remaining.size > 0) {
      let best: { provider: ScoredProviderProfile; cost: number; gained: number } | null = null;
      for (const cand of pool) {
        if (chosen.some(c => c.id === cand.id)) continue;
        const gained = StackCoverageAnalyzer.fullyCoveredBy(cand, chosen, [...remaining], planFor).length;
        if (gained === 0) continue;
        const cost = (planFor(cand)?.monthlyPricePerSeat ?? 0) * teamSize;
        // Prefer the best value per newly covered feature; ties resolve on stable id.
        const better = !best
          || (cost / gained) < (best.cost / best.gained)
          || ((cost / gained) === (best.cost / best.gained) && cand.id.localeCompare(best.provider.id) < 0);
        if (better) best = { provider: cand, cost, gained };
      }
      if (!best) return null;   // nothing left can cover the remaining features
      chosen.push(best.provider);
      total += best.cost;
      for (const f of [...remaining]) {
        if (StackCoverageAnalyzer.fullyCoveredBy(best.provider, [], [f], planFor).length > 0) remaining.delete(f);
      }
    }
    return total;
  }

  /** Builds the explicit budget-constraint state for a stack that cannot reach full coverage. */
  private static buildBudgetConstraint(
    reason: BudgetConstraintState['reason'],
    req: StackBuilderRequest,
    teamSize: number,
    requirements: string[],
    plannedStack: ScoredProviderProfile[],
    pool: ScoredProviderProfile[],
    message: string,
    uncoveredOverride?: string[]
  ): BudgetConstraintState {
    // What the planned stack covers at the tier this budget buys, counting full coverage
    // only. Measured plan-blind and partial-inclusive, this disclosure contradicted the
    // coverage report next to it: the very requirements it existed to declare as unmet were
    // filtered out of `uncoveredFeatures`. `uncoveredOverride` lets a caller that already
    // holds the authoritative coverage result pass it in rather than re-deriving it.
    const covered = new Set<string>();
    if (!uncoveredOverride) {
      for (const p of plannedStack) {
        const planFor = (cand: ScoredProviderProfile) =>
          this.selectOptimalPlan(cand, teamSize, 'best-value', req.monthlyBudget ?? null, requirements);
        for (const f of StackCoverageAnalyzer.fullyCoveredBy(p, [], requirements, planFor)) covered.add(f);
      }
    }
    return {
      constrained: true,
      reason,
      monthlyBudget: req.monthlyBudget ?? 0,
      teamSize,
      requiredFeatures: [...requirements],
      uncoveredFeatures: uncoveredOverride ?? requirements.filter(f => !covered.has(f)),
      minimumMonthlyCostForFullCoverage: this.estimateMinimumFullCoverageCost(pool, requirements, teamSize),
      message
    };
  }

  /**
   * Assembles a multi-role HierarchicalStack:
   * 01 PRIMARY (Driver) + 02 SECONDARY (Companion) + 03 OPTIONAL (Specialized) + 04 API LAYER (Infrastructure)
   */
  private static assembleHierarchicalStack(
    stackId: string,
    label: any,
    rank: number,
    rankTitle: string,
    primarySeed: ScoredProviderProfile,
    allAppProviders: ScoredProviderProfile[],
    allApiProviders: ScoredProviderProfile[],
    req: StackBuilderRequest,
    weights: any,
    strategy: StackStrategy,
    customStrategicReason?: string,
    forceSingleTool: boolean = false,
    forcedSecondarySeed?: ScoredProviderProfile
  ): StructuredStack {
    const domain = req.domain || req.primaryWorkflow || 'general-productivity';
    const requirements = req.requirements || req.mustHaveFeatures || [];
    const teamSize = req.teamSize;

    // ── Plan-aware coverage context ─────────────────────────────────
    // Coverage claims must be answered at the tier the team would actually buy, not at the
    // product's capability vector. `selectedPlans` records the real decision per role as it
    // is made; providers not yet (or never) placed in the stack fall back to the tier this
    // request's budget would buy them at. Candidate screening deliberately keeps using the
    // plan-blind form: a candidate must first be capable, and only the stack it ends up in
    // determines its tier.
    const selectedPlans = new Map<string, any>();
    const estimatedPlanCache = new Map<string, any>();
    const resolvePlanForCoverage = (p: ScoredProviderProfile) => {
      if (selectedPlans.has(p.id)) return selectedPlans.get(p.id);
      if (!estimatedPlanCache.has(p.id)) {
        estimatedPlanCache.set(
          p.id,
          this.selectOptimalPlan(p, teamSize, strategy, req.monthlyBudget ?? null, requirements)
        );
      }
      return estimatedPlanCache.get(p.id);
    };

    // ── 01 PRIMARY AI TOOL ──────────────────────────────────────────
    // Budget substitution is requirement-aware: when the ranked winner is unaffordable we
    // pick the affordable provider that covers the MOST required capabilities (ties resolved
    // by pool rank, which is itself deterministic). Because the affordable pool grows
    // monotonically with the budget, the substituted primary's requirement coverage can
    // never decrease when the budget increases — that is the P10 monotonicity guarantee.
    let effectivePrimarySeed = primarySeed;
    let budgetConstraint: BudgetConstraintState | null = null;

    const cheapestPaidTeamCost = (p: ScoredProviderProfile): number | null => {
      const minPaid = p.plans
        .filter(pl => pl.monthlyPricePerSeat > 0)
        .sort((a, b) => a.monthlyPricePerSeat - b.monthlyPricePerSeat)[0];
      return minPaid ? minPaid.monthlyPricePerSeat * teamSize : null;
    };
    // Full coverage only, and plan-aware: a partially-satisfied must-have is not a
    // satisfied must-have, and a capability the budget cannot buy the entitling tier for is
    // not one this substitution may count. Counting either would let the substitution swap a
    // covering provider for a merely adjacent one.
    const requirementCoverageCount = (p: ScoredProviderProfile): number =>
      StackCoverageAnalyzer.analyze([p], requirements, resolvePlanForCoverage).covered.length;

    if (req.monthlyBudget !== null && req.monthlyBudget > 0 && strategy !== 'max-performance') {
      // "Unaffordable" means NO plan of the ranked winner fits — not merely that its paid
      // tiers are out of reach. A provider with a usable free tier is purchasable at any
      // ceiling, and substituting it away used to demote the requirement-covering winner
      // to companion while a weaker provider took the paid primary slot.
      const cheapestAnyTeamCost = (p: ScoredProviderProfile): number | null => {
        const usable = p.plans.filter(pl => pl.id !== 'enterprise' && pl.monthlyPricePerSeat >= 0);
        if (usable.length === 0) return null;
        return Math.min(...usable.map(pl => pl.monthlyPricePerSeat)) * teamSize;
      };
      const primaryEntryCost = cheapestAnyTeamCost(primarySeed);
      const primaryCost = cheapestPaidTeamCost(primarySeed) ?? 0;
      const primaryCoverage = requirementCoverageCount(primarySeed);

      if (primaryEntryCost === null || primaryEntryCost > req.monthlyBudget) {
        const affordable = allAppProviders.filter(p => {
          const cost = cheapestAnyTeamCost(p);
          return cost !== null && cost <= req.monthlyBudget!;
        });

        let bestAffordable: ScoredProviderProfile | undefined;
        let bestCoverage = -1;
        for (const cand of affordable) {
          const coverage = requirementCoverageCount(cand);
          if (coverage > bestCoverage) {
            bestCoverage = coverage;
            bestAffordable = cand;
          }
        }

        // Never substitute into strictly worse requirement coverage: an over-budget stack
        // that meets the must-haves is reported as over budget, but a stack that silently
        // drops a must-have is simply the wrong answer.
        if (bestAffordable && bestCoverage >= primaryCoverage) {
          effectivePrimarySeed = bestAffordable;
          budgetConstraint = this.buildBudgetConstraint(
            'budget-forced-primary-substitution',
            req, teamSize, requirements, [bestAffordable], allAppProviders,
            `The highest-ranked provider needs $${primaryCost}/mo for ${teamSize} seats, above the $${req.monthlyBudget}/mo ceiling. ` +
            `${bestAffordable.name} is the affordable provider covering the most required capabilities.`
          );
        } else if (!bestAffordable) {
          // No plan of any provider fits within budget — fall back to the highest-ranked
          // provider with a genuinely usable free plan, still preferring requirement coverage.
          const freeCandidates = allAppProviders.filter(p =>
            p.plans.some(pl => pl.monthlyPricePerSeat === 0 && pl.id !== 'enterprise')
          );
          let freeBest: ScoredProviderProfile | undefined;
          let freeBestCoverage = -1;
          for (const cand of freeCandidates) {
            const coverage = requirementCoverageCount(cand);
            if (coverage > freeBestCoverage) {
              freeBestCoverage = coverage;
              freeBest = cand;
            }
          }
          if (freeBest) effectivePrimarySeed = freeBest;
          budgetConstraint = this.buildBudgetConstraint(
            'budget-blocks-any-paid-plan',
            req, teamSize, requirements, freeBest ? [freeBest] : [], allAppProviders,
            `No paid plan in the catalogue fits $${req.monthlyBudget}/mo across ${teamSize} seats. ` +
            `The stack falls back to free tiers, which may not cover every required capability.`
          );
        }
      }
    }

    const primaryPlan = this.selectOptimalPlan(
      effectivePrimarySeed, teamSize, strategy, req.monthlyBudget, requirements
    );
    if (primaryPlan) selectedPlans.set(effectivePrimarySeed.id, primaryPlan);
    const primaryCostPerSeat = primaryPlan?.monthlyPricePerSeat ?? 0;
    const isPrimaryIde = effectivePrimarySeed.category === 'ide';

    const domainLabel = DOMAIN_LABELS[domain] || domain;
    const whyPrimary = `Primary workhorse for ${domainLabel}. Handles core daily execution and workflow velocity.`;

    const primaryTool: StackToolAssignment = {
      toolId: effectivePrimarySeed.id,
      toolName: effectivePrimarySeed.name,
      vendor: effectivePrimarySeed.vendor,
      category: effectivePrimarySeed.category,
      role: 'primary',
      buyingPriority: '01 PRIMARY',
      priorityLabel: 'Recommended First',
      recommendedPlan: primaryPlan?.label || 'Pro',
      monthlyCostPerSeat: primaryCostPerSeat,
      estimatedMonthlyCostPerTeam: Math.round(primaryCostPerSeat * teamSize * 100) / 100,
      workflowFitScore: WorkflowEngine.calculateSuitability(effectivePrimarySeed.raw, domain),
      capabilityHighlights: effectivePrimarySeed.raw.strengths?.slice(0, 3) || [],
      whyRecommended: whyPrimary,
      uniqueValueAdded: `Core ${effectivePrimarySeed.category.toUpperCase()} platform establishing baseline team productivity.`,
      whatItComplements: 'Serves as the foundation; other specialized tools plug into this core platform.',
      mainTradeoff: isPrimaryIde
        ? 'Specialized for in-editor code execution rather than general web chat or broad documentation.'
        : 'Optimized for conversational reasoning; requires an IDE companion for in-editor multi-file coding.',
      procurementFitReasons: {
        domainFit: `Directly matches ${domainLabel} execution patterns with ${WorkflowEngine.calculateSuitability(effectivePrimarySeed.raw, domain)}% suitability.`,
        workflowFit: isPrimaryIde ? 'Embeds inline code generation and AST refactoring directly into the editor.' : 'Delivers multi-turn architectural reasoning and long-form spec generation.',
        teamFit: `Scalable ${primaryPlan?.label || 'Pro'} plan structured for ${teamSize} users.`,
        budgetFit: req.monthlyBudget ? `Consumes $${primaryCostPerSeat * teamSize}/mo of the $${req.monthlyBudget}/mo ceiling.` : 'Predictable monthly per-seat licensing.'
      },
      missingCapabilities: isPrimaryIde ? ['Live web research with citations', 'Broad non-technical writing'] : ['In-editor inline multi-file composer'],
      procurementRisks: ['Annual pricing lock-in if billed yearly', 'User license provisioning overhead'],
      bestFor: `Teams seeking a dedicated daily workhorse for ${domainLabel}.`,
      notIdealFor: 'Teams requiring purely air-gapped, offline-only infrastructure.',
      purchaseDecision: 'BUY_NOW',
      featuresCovered: StackCoverageAnalyzer.fullyCoveredBy(
        effectivePrimarySeed, [], requirements, resolvePlanForCoverage
      )
    };

    const activeStackProfiles: ScoredProviderProfile[] = [effectivePrimarySeed];
    const stackTools: StackToolAssignment[] = [primaryTool];
    let currentStackMonthlyCost = primaryCostPerSeat * teamSize;

    // ── 02 SECONDARY AI COMPANION ───────────────────────────────────
    // Selection is capability-gap driven, and every decision below is made against the
    // FINAL effective primary (post budget substitution), never the originally seeded one.
    if (!forceSingleTool) {
      const isPrimaryChat = effectivePrimarySeed.category === 'chat';

      // Requirements the 04 API LAYER owns are excluded from companion gap analysis.
      // Leaving them in made the engine attach a workspace chat product whose only
      // contribution was a requirement the API slot already covered in the same stack —
      // a second subscription that closed nothing.
      const appRoleRequirements = this.requirementsGatingPrimary(requirements);

      // 1. Which required capabilities does the effective primary FULLY satisfy?
      //    Full coverage is the bar: `newFeaturesCovered` counts a partial hit as covered,
      //    which made a primary that only weakly satisfies a must-have look complete and
      //    suppressed the companion that would have closed it properly.
      const primaryCoverage = StackCoverageAnalyzer.analyze(
        [effectivePrimarySeed], appRoleRequirements, resolvePlanForCoverage
      );
      // 2. Which required capabilities remain open (missing or only partially met)?
      const openRequirements = [
        ...primaryCoverage.missing,
        ...primaryCoverage.partial.map(f => f.featureKey)
      ];
      const primaryCoversEverything = appRoleRequirements.length > 0 && openRequirements.length === 0;

      // 3. A companion is justified when there is a real gap to close, when the caller
      //    explicitly seeded one, or (with no requirements stated) when the domain baseline
      //    leaves an obvious structural gap. A primary at 100% coverage is NOT padded with a
      //    second tool merely because the strategy is max-performance.
      //    A candidate only counts as a gap closer if it FULLY covers an open requirement —
      //    swapping one partial hit for another is not an improvement.
      const gapClosers = openRequirements.length > 0
        ? allAppProviders
            .filter(cand => cand.id !== effectivePrimarySeed.id)
            .map(cand => ({
              cand,
              // Plan-aware on both sides of the subtraction: the baseline must be what the
              // stack's PURCHASED tiers deliver, and the candidate's contribution what the
              // tier this budget would buy it at delivers. Measured plan-blind, a primary
              // whose entitlement is locked behind a tier the team is not buying looked
              // like it already covered the requirement, so `closes` was 0 for every
              // candidate and no companion was ever attached to close the real gap.
              closes: StackCoverageAnalyzer
                .analyze([...activeStackProfiles, cand], openRequirements, resolvePlanForCoverage).covered.length
                - StackCoverageAnalyzer
                  .analyze(activeStackProfiles, openRequirements, resolvePlanForCoverage).covered.length
            }))
            .filter(entry => entry.closes > 0)
        : [];

      const needsCompanion = !!forcedSecondarySeed
        || gapClosers.length > 0
        || (appRoleRequirements.length === 0 && (isPrimaryIde || isPrimaryChat) && strategy !== 'best-value');

      if (needsCompanion && !primaryCoversEverything) {
        // 4. Rank the gap closers: most requirements closed first, then strategy strength.
        //    Falls back to category complementarity only when no requirement gap exists.
        let secondaryCandidate: ScoredProviderProfile | undefined;
        if (forcedSecondarySeed && forcedSecondarySeed.id !== effectivePrimarySeed.id) {
          secondaryCandidate = forcedSecondarySeed;
        } else if (gapClosers.length > 0) {
          secondaryCandidate = gapClosers.sort((a, b) => {
            if (b.closes !== a.closes) return b.closes - a.closes;
            const delta = this.getCompositeScore(b.cand, req, weights, strategy)
              - this.getCompositeScore(a.cand, req, weights, strategy);
            if (Math.abs(delta) > 0.0001) return delta;
            return this.compareForTie(a.cand, b.cand, req, strategy);
          })[0].cand;
        } else {
          secondaryCandidate = allAppProviders.find(cand =>
            cand.id !== effectivePrimarySeed.id
            && this.isComplementaryCategory(effectivePrimarySeed.category, cand.category, domain)
          );
        }

        if (secondaryCandidate) {
          const remainingBudgetForSec = req.monthlyBudget !== null
            ? Math.max(0, req.monthlyBudget - currentStackMonthlyCost)
            : null;

          const secPlan = this.selectOptimalPlan(
            secondaryCandidate, teamSize, strategy, remainingBudgetForSec, requirements
          );
          const secCostPerSeat = secPlan?.monthlyPricePerSeat ?? 0;
          const secTeamCost = Math.round(secCostPerSeat * teamSize * 100) / 100;

          // STRICT BUDGET ENFORCEMENT:
          // Do not force a secondary companion that violates the procurement ceiling unless strategy === 'max-performance'
          const wouldExceedBudget = req.monthlyBudget !== null && req.monthlyBudget > 0 && (currentStackMonthlyCost + secTeamCost > req.monthlyBudget);

          if (!wouldExceedBudget || strategy === 'max-performance') {
            // What the companion actually contributes, measured against the stack it joins.
            // The previous copy was keyed only on the primary's category, so a companion
            // added to close (say) live web research was still described as supplying
            // "deep architectural reasoning" — text unrelated to why it was selected.
            const featureLabelMap = KnowledgeLoader.getFeatureMap().features || {};
            const secClosedFeatures = StackCoverageAnalyzer.fullyCoveredBy(
              secondaryCandidate, activeStackProfiles, appRoleRequirements, resolvePlanForCoverage
            );
            const secClosedLabels = secClosedFeatures.map(f => featureLabelMap[f]?.label || f);
            const secClosedText = secClosedLabels.join(', ');
            const secStillOpen = StackCoverageAnalyzer
              .analyze([...activeStackProfiles, secondaryCandidate], appRoleRequirements, resolvePlanForCoverage)
              .missing.map(f => featureLabelMap[f]?.label || f);

            const secWhy = secClosedFeatures.length > 0
              ? `Closes capability the primary does not fully cover: ${secClosedText}.`
              : isPrimaryIde
                ? 'Adds high-level architectural reasoning, technical documentation, complex refactoring plans, and multi-turn brainstorming outside the editor.'
                : 'Provides native in-editor autocomplete, inline code generation, and multi-file diff editing directly in the IDE.';

            const secondaryTool: StackToolAssignment = {
              toolId: secondaryCandidate.id,
              toolName: secondaryCandidate.name,
              vendor: secondaryCandidate.vendor,
              category: secondaryCandidate.category,
              role: 'secondary',
              buyingPriority: '02 SECONDARY',
              priorityLabel: 'Recommended Companion',
              recommendedPlan: secPlan?.label || 'Pro',
              monthlyCostPerSeat: secCostPerSeat,
              estimatedMonthlyCostPerTeam: secTeamCost,
              workflowFitScore: WorkflowEngine.calculateSuitability(secondaryCandidate.raw, domain),
              capabilityHighlights: secondaryCandidate.raw.strengths?.slice(0, 3) || secClosedLabels,
              whyRecommended: secWhy,
              uniqueValueAdded: secClosedFeatures.length > 0
                ? `Only stack member that fully covers ${secClosedText}.`
                : isPrimaryIde
                  ? 'Deep architectural reasoning and long-form spec companion.'
                  : 'In-editor IDE autocomplete and multi-file code generator.',
              whatItComplements: secClosedFeatures.length > 0
                ? `Complements ${effectivePrimarySeed.name} by covering ${secClosedText}, which the primary leaves open.`
                : `Complements ${effectivePrimarySeed.name} by providing ${isPrimaryIde ? 'deep reasoning, documentation drafting, and complex architectural specs' : 'native in-editor autocomplete and multi-file code editing'}.`,
              mainTradeoff: 'Requires managing a second subscription portal and seat allocation.',
              procurementFitReasons: {
                domainFit: secClosedFeatures.length > 0
                  ? `Highest measured capability for ${secClosedText} among providers outside the stack.`
                  : `Fills the critical ${isPrimaryIde ? 'reasoning and documentation' : 'editor code execution'} gap in ${domainLabel}.`,
                workflowFit: 'Allows team members to switch between high-level architectural planning and direct execution.',
                teamFit: `Complementary companion tier for ${teamSize} seats.`,
                budgetFit: `Adds $${secTeamCost}/mo to overall team spend.`
              },
              missingCapabilities: secStillOpen.length > 0
                ? secStillOpen
                : (isPrimaryIde ? ['In-editor terminal execution'] : ['Long-document 1M+ context recall']),
              procurementRisks: ['Subscription sprawl across multiple vendors'],
              bestFor: `Teams that require both in-editor coding velocity and high-level architectural reasoning.`,
              notIdealFor: 'Teams with a hard mandate for single-vendor consolidation.',
              purchaseDecision: 'STRONGLY_CONSIDER',
              featuresCovered: secClosedFeatures
            };

            activeStackProfiles.push(secondaryCandidate);
            stackTools.push(secondaryTool);
            if (secPlan) selectedPlans.set(secondaryCandidate.id, secPlan);
            currentStackMonthlyCost += secTeamCost;
          }
        }
      }

      // ── 03 SPECIALIZED / OPTIONAL TOOL ────────────────────────────
      // Requirement-driven, not provider-driven: closes whatever required capability the
      // primary + secondary still leave uncovered, whichever feature that happens to be.
      // No provider-id literal, and no reference to a `search` category (which does not
      // exist in the knowledge base — the only categories are ide / chat / api).
      // One open-gap definition for the whole stack: missing OR only partially met, the
      // same set the secondary slot works from (`openRequirements` above). Reading
      // `.missing` alone hid every partially-met requirement from this slot — a capability
      // the stack reaches at 5/10 against a threshold of 7 is not met, but it is not
      // `missing` either, so no specialist was ever offered the chance to close it.
      const afterSecondaryCoverage = StackCoverageAnalyzer.analyze(
        activeStackProfiles, appRoleRequirements, resolvePlanForCoverage
      );
      const openAfterSecondary = [
        ...afterSecondaryCoverage.missing,
        ...afterSecondaryCoverage.partial.map(f => f.featureKey)
      ];

      if (openAfterSecondary.length > 0) {
        const stackIds = new Set(activeStackProfiles.map(p => p.id));
        const optionalRanked = allAppProviders
          .filter(p => !stackIds.has(p.id))
          .map(p => ({
            provider: p,
            // FULL closure only, and plan-aware. `newFeaturesCovered` also returns partial
            // hits, and its result was written straight into the user-facing
            // `featuresCovered` / "Only stack member covering X" copy — so a free tier
            // scoring 6/10 against a threshold of 7 was presented as closing an enterprise
            // governance gap the stack's own coverage report simultaneously listed as
            // unmet. An optional add-on that does not actually close a requirement is not
            // an add-on worth buying.
            closes: StackCoverageAnalyzer.fullyCoveredBy(
              p, activeStackProfiles, openAfterSecondary, resolvePlanForCoverage
            )
          }))
          .filter(entry => entry.closes.length > 0)
          .sort((a, b) => {
            if (b.closes.length !== a.closes.length) return b.closes.length - a.closes.length;
            const delta = this.getCompositeScore(b.provider, req, weights, strategy)
              - this.getCompositeScore(a.provider, req, weights, strategy);
            if (Math.abs(delta) > 0.0001) return delta;
            return this.compareForTie(a.provider, b.provider, req, strategy);
          })[0];

        const specialistCandidate = optionalRanked?.provider;
        const closedFeatures = optionalRanked?.closes ?? [];

        if (specialistCandidate) {
          const featureLabels = KnowledgeLoader.getFeatureMap().features || {};
          const closedLabels = closedFeatures.map(f => featureLabels[f]?.label || f);
          const closedLabelText = closedLabels.join(', ');

          const remainingBudgetForOpt = req.monthlyBudget !== null
            ? Math.max(0, req.monthlyBudget - currentStackMonthlyCost)
            : null;

          const optPlan = this.selectOptimalPlan(
            specialistCandidate, teamSize, strategy, remainingBudgetForOpt, requirements
          );
          const optCost = optPlan?.monthlyPricePerSeat ?? 0;
          const optTeamCost = Math.round(optCost * teamSize * 100) / 100;

          const wouldExceedBudget = req.monthlyBudget !== null && req.monthlyBudget > 0 && (currentStackMonthlyCost + optTeamCost > req.monthlyBudget);

          if (!wouldExceedBudget || strategy === 'max-performance') {
            const optionalTool: StackToolAssignment = {
              toolId: specialistCandidate.id,
              toolName: specialistCandidate.name,
              vendor: specialistCandidate.vendor,
              category: specialistCandidate.category,
              role: 'optional',
              buyingPriority: '03 OPTIONAL',
              priorityLabel: 'Useful If Needed',
              recommendedPlan: optPlan?.label || 'Pro',
              monthlyCostPerSeat: optCost,
              estimatedMonthlyCostPerTeam: optTeamCost,
              workflowFitScore: WorkflowEngine.calculateSuitability(specialistCandidate.raw, domain),
              capabilityHighlights: specialistCandidate.raw.strengths?.slice(0, 3) || closedLabels,
              whyRecommended: `Closes the remaining required capability gap: ${closedLabelText}. Add if that capability is part of your daily workflow.`,
              uniqueValueAdded: `Only stack member that fully covers ${closedLabelText}.`,
              whatItComplements: `Complements ${effectivePrimarySeed.name} by covering ${closedLabelText}, which the rest of the stack does not reach.`,
              mainTradeoff: 'Adds seat cost for a capability used by only part of the team.',
              procurementFitReasons: {
                domainFit: `Highest measured capability for ${closedLabelText} among providers not already in the stack.`,
                workflowFit: `Handles ${closedLabelText} without routing work through a second-best tool.`,
                teamFit: `Optional add-on for the specialists on the ${teamSize}-person team.`,
                budgetFit: `Adds $${optTeamCost}/mo if rolled out team-wide.`
              },
              missingCapabilities: appRoleRequirements.filter(f => !closedFeatures.includes(f))
                .map(f => featureLabels[f]?.label || f),
              procurementRisks: ['Capability may partially overlap tools already in the stack'],
              bestFor: `Teams where ${closedLabelText} is a daily requirement rather than an occasional one.`,
              notIdealFor: `Teams that rarely need ${closedLabelText}.`,
              purchaseDecision: 'OPTIONAL_ADDON',
              featuresCovered: closedFeatures
            };

            activeStackProfiles.push(specialistCandidate);
            stackTools.push(optionalTool);
            if (optPlan) selectedPlans.set(specialistCandidate.id, optPlan);
            currentStackMonthlyCost += optTeamCost;
          }
        }
      }

      // ── 04 DEVELOPER API LAYER ──────────────────────────────────
      // Which requirements route here is declared in feature-map.json
      // (`satisfiedByRole: "api-layer"`) rather than listed as string literals, so the
      // slot and the primary gate can never disagree about what the API layer owns.
      const apiRoleRequirements = requirements.filter(
        key => KnowledgeLoader.getFeatureMap().features[key]?.satisfiedByRole === 'api-layer'
      );
      const wantsApi = apiRoleRequirements.length > 0;

      if (wantsApi) {
        // Ranked API-layer selection (P11): API capability match, required capabilities,
        // performance, cost/value, reliability, governance when the request demands it,
        // and the active strategy. No positional pick off the pool head, no vendor literal.
        const apiCandidate = this.pickByObjective(
          allApiProviders,
          p => this.apiLayerObjective(p, req, weights, strategy, requirements),
          req,
          strategy
        );
        if (apiCandidate) {
          const remainingBudgetForApi = req.monthlyBudget !== null
            ? Math.max(0, req.monthlyBudget - currentStackMonthlyCost)
            : null;

          // Same plan chooser as every other slot. The previous positional `plans[0]`
          // meant the API tier was whichever row happened to be first in the file, and
          // its `?? 20` fallback invented a $20/seat price for any provider without a
          // published plan row — a fabricated number in a field the UI shows as cost.
          const apiPlan = this.selectOptimalPlan(
            apiCandidate, teamSize, strategy, remainingBudgetForApi, requirements
          );
          const apiPlanPrice = apiPlan?.monthlyPricePerSeat;
          // Every API provider in the catalogue publishes usage-based pricing with no
          // per-seat subscription, so the honest per-seat subscription cost is 0 and the
          // variable token cost is disclosed in the copy instead of being guessed at.
          const isUsageBased = apiPlanPrice === undefined || apiPlanPrice === 0;
          let apiCost = apiPlanPrice ?? 0;

          // A published per-seat API tier still has to fit the remaining ceiling.
          if (!isUsageBased && remainingBudgetForApi !== null) {
            const maxApiPerSeat = Math.floor(remainingBudgetForApi / Math.max(1, teamSize));
            if (maxApiPerSeat > 0 && maxApiPerSeat < apiCost) {
              apiCost = maxApiPerSeat;
            }
          }

          const apiTeamCost = Math.round(apiCost * teamSize * 100) / 100;
          const wouldExceedBudget = req.monthlyBudget !== null && req.monthlyBudget > 0 && (currentStackMonthlyCost + apiTeamCost > req.monthlyBudget);

          if (!wouldExceedBudget || strategy === 'max-performance') {
            const apiFeatureLabels = KnowledgeLoader.getFeatureMap().features || {};
            // Measured, not asserted: what this endpoint actually covers of the
            // API-role requirements, given the stack it joins.
            const apiClosedFeatures = StackCoverageAnalyzer.fullyCoveredBy(
              apiCandidate, activeStackProfiles, apiRoleRequirements, resolvePlanForCoverage
            );
            const apiClosedText = apiClosedFeatures
              .map(f => apiFeatureLabels[f]?.label || f)
              .join(', ') || 'programmatic model access';

            const apiTool: StackToolAssignment = {
              toolId: apiCandidate.id,
              toolName: apiCandidate.name,
              vendor: apiCandidate.vendor,
              category: 'api',
              role: 'api',
              buyingPriority: '04 API LAYER',
              priorityLabel: 'Developer Infrastructure',
              recommendedPlan: apiPlan?.label || 'Pay-as-you-go',
              monthlyCostPerSeat: apiCost,
              estimatedMonthlyCostPerTeam: apiTeamCost,
              workflowFitScore: WorkflowEngine.calculateSuitability(apiCandidate.raw, domain),
              capabilityHighlights: apiCandidate.raw.strengths?.slice(0, 3) || ['Direct developer API keys', 'High-throughput function calling'],
              whyRecommended: `Highest-ranked developer endpoint for this request on API capability, required-capability fit, reliability and published pricing. Covers ${apiClosedText}.`,
              uniqueValueAdded: 'Programmatic model inference and embedding pipelines.',
              whatItComplements: `Complements ${effectivePrimarySeed.name} by covering ${apiClosedText} programmatically, which a seat-based workspace subscription does not expose.`,
              mainTradeoff: isUsageBased
                ? 'Billed per token rather than per seat, so monthly spend scales with call volume and is not captured by the seat total above.'
                : 'Requires software engineering integration and token usage monitoring.',
              procurementFitReasons: {
                domainFit: `Developer API endpoints for ${domainLabel} integration and automation.`,
                workflowFit: 'Decoupled programmatic access for backend services and AI agents.',
                teamFit: 'Usage-based token billing shared across the entire team.',
                budgetFit: isUsageBased
                  ? 'No per-seat subscription; token spend is variable and must be capped with billing limits.'
                  : `Allocated $${apiTeamCost}/mo within the total procurement ceiling.`
              },
              missingCapabilities: ['Human conversational desktop UI', 'IDE inline completion extension'],
              procurementRisks: ['Uncapped token cost spikes without billing limits'],
              bestFor: 'Engineering teams building custom internal AI tools, embeddings, and agent pipelines.',
              notIdealFor: 'Teams looking exclusively for human interactive desktop subscriptions.',
              purchaseDecision: 'INFRASTRUCTURE_ONLY',
              featuresCovered: apiClosedFeatures
            };

            activeStackProfiles.push(apiCandidate);
            stackTools.push(apiTool);
            if (apiPlan) selectedPlans.set(apiCandidate.id, apiPlan);
            currentStackMonthlyCost += apiTeamCost;
          }
        }
      }
    }

    // Compute Totals
    // Rounded to cents: plan prices like $4.99 accumulate binary float error once multiplied
    // by a seat count ($4.99 x 10 = 49.900000000000006), and that raw value was being
    // serialised straight into the API response.
    const toCents = (value: number): number => Math.round(value * 100) / 100;
    const totalMonthlyCost = toCents(stackTools.reduce((sum, t) => sum + t.estimatedMonthlyCostPerTeam, 0));
    const totalAnnualCost = toCents(totalMonthlyCost * 12);
    const perSeatMonthlyCost = toCents(stackTools.reduce((sum, t) => sum + t.monthlyCostPerSeat, 0));

    // Plan-aware: this is the coverage figure the dashboard shows, so it is answered at the
    // tiers the team is being told to buy. Every provider here has a recorded plan.
    const coverageResult = StackCoverageAnalyzer.analyze(
      activeStackProfiles, requirements, resolvePlanForCoverage
    );
    const workflowFitScore = Math.round(
      stackTools.reduce((sum, t) => sum + t.workflowFitScore, 0) / stackTools.length
    );
    // `benchmarkScore` is null for providers with no published benchmarks, so the
    // capability metric uses the capability-evidence composite rather than
    // substituting a synthetic benchmark number.
    const capabilityCoverageScore = Math.round(
      activeStackProfiles.reduce((sum, p) => sum + p.capabilityCompositeScore, 0) / activeStackProfiles.length
    );

    // Canonical Deduplication Signature
    const canonicalSignature = stackTools.map(t => `${t.toolId}:${t.recommendedPlan}`).sort().join('|');

    // Budget Status
    let budgetStatus: StructuredStack['budgetStatus'] = 'no-limit';
    let budgetOverrunPercent: number | undefined;
    if (req.monthlyBudget !== null) {
      if (totalMonthlyCost <= req.monthlyBudget) {
        budgetStatus = 'within';
      } else {
        budgetStatus = 'over';
        budgetOverrunPercent = Math.round(((totalMonthlyCost - req.monthlyBudget) / Math.max(1, req.monthlyBudget)) * 100);
      }
    }

    // Explicit budget-constraint state (P10): if a ceiling is set and the assembled stack
    // still fails a required capability, say so rather than silently shipping a stack that
    // does not meet the user's must-haves.
    //
    // A $0 ceiling counts. The previous `monthlyBudget > 0` guard left the one case where
    // the budget is unambiguously the cause — a free-tier-only request — as the only
    // uncovered outcome with no disclosure at all.
    if (
      req.monthlyBudget !== null
      && requirements.length > 0
      && coverageResult.missing.length > 0
    ) {
      const freeTierOnly = totalMonthlyCost === 0 && req.monthlyBudget === 0;
      budgetConstraint = this.buildBudgetConstraint(
        freeTierOnly ? 'budget-blocks-any-paid-plan' : 'budget-blocks-full-coverage',
        req, teamSize, requirements, activeStackProfiles, allAppProviders,
        freeTierOnly
          ? `A $0/mo ceiling limits the stack to free tiers across ${teamSize} seats, leaving ` +
            `${coverageResult.missing.length} required capability(ies) uncovered.`
          : `The $${req.monthlyBudget}/mo ceiling across ${teamSize} seats leaves ` +
            `${coverageResult.missing.length} required capability(ies) uncovered.`,
        // Authoritative: the same plan-aware coverage figure the dashboard displays.
        coverageResult.missing
      );
    }

    // 7-Factor Confidence Score
    const cfWeights = weights.confidenceWeights || {};
    const workflowMatchFactor = workflowFitScore;
    const featureCoverageFactor = coverageResult.coverageScore;

    let budgetFitFactor = 100;
    if (req.monthlyBudget !== null && totalMonthlyCost > req.monthlyBudget) {
      if (req.monthlyBudget === 0) {
        budgetFitFactor = totalMonthlyCost === 0 ? 100 : 15;
      } else {
        const overRatio = totalMonthlyCost / req.monthlyBudget;
        budgetFitFactor = Math.max(0, Math.round(100 - (overRatio - 1) * 150));
      }
    }

    const capabilitySuperiorityFactor = capabilityCoverageScore;
    const securityRequest = requirements.includes('enterprise-governance') || strategy === 'enterprise-security';
    const stackAvgSecurity = Math.round(activeStackProfiles.reduce((sum, p) => sum + p.securityScore, 0) / activeStackProfiles.length);
    const securityMatchFactor = securityRequest ? stackAvgSecurity : 100;
    const vendorStabilityFactor = Math.round(activeStackProfiles.reduce((sum, p) => sum + p.vendorStabilityScore, 0) / activeStackProfiles.length);
    const futureGrowthFactor = Math.round(activeStackProfiles.reduce((sum, p) => sum + p.futureGrowthScore, 0) / activeStackProfiles.length);

    const qualityScore =
      workflowMatchFactor * (cfWeights.workflowMatch || 0.30) +
      featureCoverageFactor * (cfWeights.featureCoverage || 0.25) +
      budgetFitFactor * (cfWeights.budgetFit || 0.15) +
      capabilitySuperiorityFactor * (cfWeights.capabilitySuperiority || 0.10) +
      securityMatchFactor * (cfWeights.securityMatch || 0.10) +
      vendorStabilityFactor * (cfWeights.vendorStability || 0.05) +
      futureGrowthFactor * (cfWeights.futureGrowth || 0.05);

    // ── Certainty terms (P15) ────────────────────────────────────────────────
    // The seven factors above measure how GOOD the stack is; on their own they say
    // nothing about how CERTAIN the choice is, so an 86-vs-86 photo finish used to
    // report the same ~95% as an 86-vs-60 blowout. Four evidence terms scale it:
    //
    //  1. score margin      — the primary's composite lead over the best provider we
    //                         did not pick, under this stack's own strategy.
    //  2. data completeness — provenance-verified governance / financial data in the
    //                         stack (catalogue-wide boilerplate does not count).
    //  3. benchmark availability — real measured benchmarks behind the performance claim.
    //  4. governance certainty  — only applied when governance was actually requested.
    //
    // A budget constraint that blocks required coverage caps confidence outright: we
    // cannot be confident in a stack that provably fails a must-have.
    // The certainty margin measures capability/fit separation only — preference modifiers
    // are excluded. A graded preference penalty applied to rivals for *unverified* data
    // (e.g. requireZeroRetention against providers with no published ZDR provenance) would
    // otherwise widen this margin and raise the confidence score, letting absent evidence
    // manufacture certainty. Selection still uses the modifier-inclusive composite.
    const CERTAINTY_MARGIN_OPTS = { includePreferenceModifiers: false } as const;
    let bestRivalComposite = 0;
    for (const cand of allAppProviders) {
      if (cand.id === effectivePrimarySeed.id) continue;
      bestRivalComposite = Math.max(
        bestRivalComposite,
        this.getCompositeScore(cand, req, weights, strategy, CERTAINTY_MARGIN_OPTS)
      );
    }
    const primaryComposite = this.getCompositeScore(
      effectivePrimarySeed, req, weights, strategy, CERTAINTY_MARGIN_OPTS
    );
    const scoreMargin = Math.max(0, Math.round((primaryComposite - bestRivalComposite) * 10) / 10);
    // A lead inside ±2 composite points is statistical noise given the granularity of
    // the underlying 0–10 capability vectors; treat it as a tie, not as superiority.
    const statisticalTie = bestRivalComposite > 0 && scoreMargin <= 2;
    // 0 points of daylight → 0.86; a decisive 12-point lead → 1.00.
    const marginCertainty = 0.86 + Math.min(scoreMargin, 12) * (0.14 / 12);

    const stackSize = Math.max(1, activeStackProfiles.length);
    const provenanceHits = activeStackProfiles.reduce((sum, p) =>
      sum + (p.governanceDataVerified ? 1 : 0) + (p.raw?.financialDataVerified ? 1 : 0), 0);
    const dataCompleteness = Math.round((provenanceHits / (stackSize * 2)) * 100);
    const benchmarkAvailability = Math.round(
      (activeStackProfiles.filter(p => p.benchmarkDataAvailable).length / stackSize) * 100);
    const dataCertainty = 0.90 + (dataCompleteness / 100) * 0.07 + (benchmarkAvailability / 100) * 0.03;

    const governanceCertainty = securityRequest
      ? 0.88 + (activeStackProfiles.filter(p => p.governanceDataVerified).length / stackSize) * 0.12
      : 1;

    const budgetCertainty = budgetConstraint ? 0.80 : 1;

    const certaintyMultiplier = Math.min(1,
      marginCertainty * dataCertainty * governanceCertainty * budgetCertainty);

    const confidenceScore = Math.min(100, Math.max(0, Math.round(qualityScore * certaintyMultiplier)));

    const advantages = this.deriveAdvantages(primaryTool, stackTools.find(t => t.role === 'secondary'), stackTools.find(t => t.role === 'optional'), stackTools.find(t => t.role === 'api'), strategy);
    const tradeoffs = this.deriveTradeoffs(stackTools, req, strategy);
    let whyThisStack = customStrategicReason || this.deriveWhyThisStack(primaryTool, stackTools.find(t => t.role === 'secondary'), stackTools.find(t => t.role === 'optional'), stackTools.find(t => t.role === 'api'), domain, strategy, teamSize, totalMonthlyCost);

    // A Max Performance ranking built without a single published benchmark is a
    // capability-evidence ranking, not a benchmark ranking. Say so instead of
    // letting the strategy label imply measurement that does not exist.
    if (strategy === 'max-performance' && benchmarkAvailability === 0) {
      whyThisStack += ' Note: no provider in this stack publishes independent benchmark results, '
        + 'so the performance ranking is derived from researched capability evidence for '
        + `${domainLabel.toLowerCase()} rather than from benchmark scores.`;
    }

    return {
      stackId,
      label,
      rank,
      rankTitle,
      canonicalSignature,
      primary: primaryTool,
      secondary: stackTools.find(t => t.role === 'secondary'),
      optional: stackTools.find(t => t.role === 'optional'),
      apiLayer: stackTools.find(t => t.role === 'api'),
      tools: stackTools,
      estimatedMonthlyCost: totalMonthlyCost,
      estimatedAnnualCost: totalAnnualCost,
      perSeatMonthlyCost,
      coverageResult,
      workflowFitScore,
      capabilityCoverageScore,
      confidenceScore,
      confidenceBreakdown: {
        overall: confidenceScore,
        workflowMatch: workflowMatchFactor,
        featureCoverage: featureCoverageFactor,
        budgetFit: budgetFitFactor,
        capabilitySuperiority: capabilitySuperiorityFactor,
        securityMatch: securityMatchFactor,
        vendorStability: vendorStabilityFactor,
        futureGrowth: futureGrowthFactor,
        scoreMargin,
        dataCompleteness,
        benchmarkAvailability,
        certaintyMultiplier: Math.round(certaintyMultiplier * 1000) / 1000,
        statisticalTie
      },
      whyThisStack,
      advantages,
      tradeoffs,
      budgetStatus,
      budgetOverrunPercent,
      ...(budgetConstraint ? { budgetConstraint } : {}),
      bestFor: `Teams seeking a ${strategy === 'best-value' ? 'cost-optimized' : strategy === 'enterprise-security' ? 'security-hardened' : 'high-velocity'} setup for ${domainLabel}.`
    };
  }

  // ── Plan Selection Helper (with Strict Budget Enforcement) ─────────────────

  /**
   * Seat count above which centralized administration (team billing, RBAC, SSO, usage
   * analytics) stops being optional overhead and becomes a procurement requirement.
   * Declared here rather than inlined so the threshold is reviewable in one place.
   */
  private static readonly TEAM_ADMIN_SEAT_THRESHOLD = 20;

  /** Declared plan-feature vocabulary used to detect what a tier actually unlocks. */
  private static readonly PLAN_ADMIN_FEATURE_TERMS = [
    'sso', 'saml', 'oidc', 'scim', 'rbac', 'role-based', 'audit log', 'admin',
    'centralized', 'centralised', 'team billing', 'usage analytics', 'policy', 'compliance'
  ];

  /**
   * Chooses the plan a team should actually buy.
   *
   * The selection is capability-driven and ties break toward the LOWER price. There is
   * deliberately no branch that sorts plans by descending price: the previous
   * `max-performance` branch did exactly that and returned the most expensive tier that
   * fit the ceiling, so a $2,000 budget produced a $2,000/mo recommendation (Cursor Ultra
   * at $200/seat × 10) while the $20/seat Pro tier carried the same capabilities — the two
   * tiers differ in request allowance, and no field in the knowledge base says the team
   * needs 20× allowance. Budget headroom is not evidence of need, so it is not spent.
   *
   * Plan-id string matching (`'pro' | 'plus' | 'individual' | 'moderato'`, `'teams' |
   * 'team' | 'business'`) is also gone. Those literals silently encoded one provider's
   * naming (`moderato` is a Kimi tier) inside supposedly generic logic and skipped any
   * provider using different names. Tier position now comes from the declared `tierRank`
   * and administrative capability from the declared feature lists.
   */
  private static selectOptimalPlan(
    p: ScoredProviderProfile,
    teamSize: number,
    strategy: StackStrategy,
    monthlyBudget: number | null,
    requirements: string[] = []
  ) {
    if (!p.plans || p.plans.length === 0) return null;

    const isFreeBudget = monthlyBudget === 0;
    const paidPlans = p.plans.filter(pl => pl.monthlyPricePerSeat > 0);
    const freePlans = p.plans.filter(pl => pl.monthlyPricePerSeat === 0 && !(pl as any).isEnterprise && pl.id !== 'enterprise');

    // If user explicitly specified a $0 budget, return free plan if available
    if (isFreeBudget && freePlans.length > 0) {
      return freePlans[0];
    }

    // Determine per-seat budget ceiling
    const maxPerSeatCost = (monthlyBudget !== null && monthlyBudget > 0)
      ? Math.floor(monthlyBudget / Math.max(1, teamSize))
      : Infinity;

    // Filter paid plans that strictly fit within the per-seat budget ceiling
    const budgetFittingPaidPlans = paidPlans.filter(pl => pl.monthlyPricePerSeat <= maxPerSeatCost);

    // If no paid plan fits within the per-seat budget allowance (e.g. $50/15seats = $3.33/seat max)
    // fall back to free plans rather than silently returning an over-budget paid plan.
    // This prevents a $50 budget from returning a $225 recommendation.
    let candidatePlans: typeof paidPlans;
    if (budgetFittingPaidPlans.length > 0) {
      candidatePlans = budgetFittingPaidPlans;
    } else if (monthlyBudget !== null && monthlyBudget > 0 && freePlans.length > 0) {
      // Per-seat allowance is too low for any paid plan — use the free tier
      return freePlans[0];
    } else {
      // No budget constraint or no free plan: pick cheapest paid plan available
      candidatePlans = [...paidPlans].sort((a, b) => a.monthlyPricePerSeat - b.monthlyPricePerSeat);
    }

    if (candidatePlans.length === 0) return null;

    // Cheapest-first is the baseline ordering for every strategy. Anything above the
    // cheapest tier has to be justified by a capability the request actually needs.
    const byPrice = [...candidatePlans].sort(
      (a, b) => a.monthlyPricePerSeat - b.monthlyPricePerSeat
        || (this.planTierRank(a) - this.planTierRank(b))
    );

    // A stated requirement whose capability the vendor sells only from a higher tier is a
    // real reason to move up the ladder — and the only one that is not "budget headroom
    // exists". Without this the engine bought Cursor Hobby / Copilot Free for a request
    // that asked for SSO and governance, then reported 100% requirement coverage from the
    // product-level capability vector: the recommendation could not deliver what the
    // dashboard claimed. Entitlement tiers are derived from each vendor's own published
    // plan copy via feature-map `planEvidenceTerms`, so no tier name, provider id, or price
    // threshold is hardcoded, and a ladder that publishes no entitlement copy yields no
    // floor rather than an assumed upgrade.
    //
    // Where no affordable tier entitles every gated requirement (e.g. the entitling tier is
    // contact-sales only), the engine buys the cheapest tier that entitles the MOST of them
    // instead of silently falling back to the entry tier — and the plan-aware coverage
    // analysis still reports whatever remains unentitled rather than claiming it.
    const requirementFloors = this.requirementTierFloors(p, requirements);
    const gatesSatisfied = (plan: any): number =>
      requirementFloors.filter(floor => this.planTierRank(plan) >= floor).length;
    const bestGateCoverage = requirementFloors.length > 0
      ? Math.max(...byPrice.map(gatesSatisfied))
      : 0;
    const eligible = bestGateCoverage > 0
      ? byPrice.filter(pl => gatesSatisfied(pl) === bestGateCoverage)
      : byPrice;

    // best-value takes the entry paid tier outright.
    if (strategy === 'best-value') return eligible[0];

    const needsTeamAdministration = strategy === 'enterprise-security'
      || teamSize >= this.TEAM_ADMIN_SEAT_THRESHOLD;

    if (needsTeamAdministration) {
      // Cheapest tier that actually declares centralized administration — not the
      // highest tier, and not a tier matched by name.
      const adminTier = eligible.find(pl => this.planDeclaresTeamAdministration(pl));
      if (adminTier) return adminTier;
    }

    // Otherwise: the cheapest tier that lifts the entry-level product restrictions
    // (declared premium/extended features). Where several tiers declare the same
    // unlock, the cheapest wins.
    const cheapestUnrestricted = eligible.find(pl => this.planDeclaresPremiumAccess(pl));
    return cheapestUnrestricted ?? eligible[0];
  }

  /**
   * Published tier positions this provider must be bought at to entitle each stated
   * requirement — one entry per requirement that is both gated and within the product's
   * measured capability.
   *
   * Only requirements the provider can satisfy at product level are considered: moving a
   * team up a tier cannot buy a capability the product does not have, so a missing
   * capability must never inflate the recommended plan's price.
   */
  private static requirementTierFloors(
    p: ScoredProviderProfile,
    requirements: string[]
  ): number[] {
    if (!requirements || requirements.length === 0) return [];
    const featureMap = KnowledgeLoader.getFeatureMap();
    const floors: number[] = [];

    for (const key of requirements) {
      const entry = featureMap.features[key];
      if (!entry || !entry.planEvidenceTerms || entry.availability === 'unsupported') continue;
      // Plan-blind check: does the product have the capability at all?
      if (StackCoverageAnalyzer.fullyCoveredBy(p, [], [key]).length === 0) continue;
      const gate = StackCoverageAnalyzer.planGateTierRank(p, entry);
      if (gate === null) continue;
      floors.push(gate);
    }

    return floors;
  }

  /** Declared tier position, falling back to price order when a provider omits it. */
  private static planTierRank(plan: any): number {
    return typeof plan?.tierRank === 'number' ? plan.tierRank : Number.MAX_SAFE_INTEGER;
  }

  private static planFeatureText(plan: any): string {
    return [...(plan?.features ?? []), ...(plan?.premiumFeatures ?? [])]
      .join(' ')
      .toLowerCase();
  }

  /** True when the tier declares centralized administration / identity / audit controls. */
  private static planDeclaresTeamAdministration(plan: any): boolean {
    const text = this.planFeatureText(plan);
    return this.PLAN_ADMIN_FEATURE_TERMS.some(term => text.includes(term));
  }

  /** True when the tier declares it lifts the free tier's product restrictions. */
  private static planDeclaresPremiumAccess(plan: any): boolean {
    return Array.isArray(plan?.premiumFeatures) && plan.premiumFeatures.length > 0;
  }

  /**
   * The only categories that exist in the knowledge base are `ide`, `chat` and `api`.
   * The previous implementation branched on a `search` category that no provider has,
   * so those branches were dead code — and its `chat` branch additionally refused an
   * in-editor companion outside software-engineering / ai-data-ml, which blocked
   * legitimate pairings in every other domain.
   *
   * Complementarity is now simply: the two workspace categories (`ide` and `chat`)
   * complement each other in any domain. The `api` category is assembled in its own
   * 04 API LAYER slot and never serves as the 02 SECONDARY companion.
   *
   * This is only a fallback: when the request states requirements, the companion is
   * chosen by capability-gap analysis and this function is not consulted at all.
   */
  private static isComplementaryCategory(catA: string, catB: string, _domain: string): boolean {
    if (catA === catB) return false;
    const workspaceCategories = new Set(['ide', 'chat']);
    return workspaceCategories.has(catA) && workspaceCategories.has(catB);
  }

  // ── Explanations & Tradeoff Derivation ──────────────────────────────────────

  private static deriveWhyThisStack(
    primary: StackToolAssignment,
    secondary: StackToolAssignment | undefined,
    optional: StackToolAssignment | undefined,
    api: StackToolAssignment | undefined,
    domain: string,
    strategy: StackStrategy,
    teamSize: number,
    totalCost: number
  ): string {
    const domainLabel = DOMAIN_LABELS[domain] || 'your workflow';
    const strategyName = STRATEGY_METAS[strategy]?.title || strategy;

    if (!secondary) {
      return `For your ${domainLabel} team (${teamSize} seats under ${strategyName}), we recommend starting with ${primary.toolName} (${primary.recommendedPlan}) as your primary workhorse. It delivers comprehensive capability coverage in a single unified subscription for $${totalCost.toLocaleString()}/mo total.`;
    }

    let text = `For your ${domainLabel} team (${teamSize} seats under ${strategyName}), we recommend ${primary.toolName} (${primary.recommendedPlan}) as your primary core. Adding ${secondary.toolName} (${secondary.recommendedPlan}) complements your workflow by providing ${secondary.uniqueValueAdded.toLowerCase()}`;

    if (optional) {
      text += ` ${optional.toolName} is included as an optional specialized layer for ${optional.uniqueValueAdded.toLowerCase()}`;
    }
    if (api) {
      text += ` ${api.toolName} provides programmatic backend infrastructure.`;
    }
    text += ` Combined total spend is $${totalCost.toLocaleString()}/mo ($${Math.round(totalCost / teamSize)}/user/mo).`;
    return text;
  }

  private static deriveAdvantages(
    primary: StackToolAssignment,
    secondary: StackToolAssignment | undefined,
    optional: StackToolAssignment | undefined,
    api: StackToolAssignment | undefined,
    strategy: StackStrategy
  ): string[] {
    const list: string[] = [];
    list.push(`Primary core: ${primary.toolName} covers primary daily workflow with ${primary.workflowFitScore}% domain fit.`);
    // Each companion line states the capability that slot actually closed, taken from the
    // measured `featuresCovered` behind its `uniqueValueAdded`. The previous copy asserted
    // fixed benefits — a companion "eliminates reasoning and drafting bottlenecks", an
    // optional add-on "adds real-time search grounding" — regardless of which provider
    // landed in the slot or what capability it was chosen to close, so a governance
    // specialist was advertised as a live-search tool.
    if (secondary) {
      list.push(`Companion coverage: ${secondary.toolName} (${secondary.recommendedPlan}) — ${secondary.uniqueValueAdded}`);
    }
    if (optional) {
      list.push(`Optional specialist: ${optional.toolName} (${optional.recommendedPlan}) — ${optional.uniqueValueAdded}`);
    }
    if (api) {
      list.push(`Developer API: ${api.toolName} provides programmatic backend infrastructure.`);
    }
    if (strategy === 'best-value') {
      list.push('Optimized for minimum seat cost without dropping core execution capabilities.');
    }
    return list;
  }

  private static deriveTradeoffs(
    tools: StackToolAssignment[],
    req: StackBuilderRequest,
    strategy: StackStrategy
  ): string[] {
    const list: string[] = [];
    if (tools.length > 1) {
      list.push(`Requires managing ${tools.length} separate subscription portals and seat allocations.`);
    }
    if (strategy === 'best-value') {
      list.push('Uses entry-level subscription tiers which may have tighter rate limits during peak hours.');
    }
    if (req.monthlyBudget !== null) {
      const total = tools.reduce((s, t) => s + t.estimatedMonthlyCostPerTeam, 0);
      if (total > req.monthlyBudget) {
        list.push(`Exceeds specified budget ceiling by $${(total - req.monthlyBudget).toLocaleString()}/mo.`);
      }
    }
    if (list.length === 0) {
      list.push('Fully balanced capability configuration with no critical trade-offs flagged.');
    }
    return list;
  }

  // ── Evaluated Provider Rejection Reason Classification ────────────────────

  private static deriveRejectedDetail(
    p: ScoredProviderProfile,
    bestStack: StructuredStack,
    req: StackBuilderRequest,
    weights: any,
    strategy: StackStrategy,
    allScored: ScoredProviderProfile[]
  ): RejectedAlternative {
    const domain = req.domain || req.primaryWorkflow || 'general-productivity';
    const requirements = req.requirements || req.mustHaveFeatures || [];
    const domainScore = WorkflowEngine.calculateSuitability(p.raw, domain);
    const primary = bestStack.primary;
    const sameCatTool = bestStack.tools.find(t => t.category === p.category);

    const cheapestPlan = p.plans.length > 0 ? Math.min(...p.plans.map(pl => pl.monthlyPricePerSeat)) : 0;
    const compositeScore = this.getCompositeScore(p, req, weights, strategy);
    const stackProfiles = bestStack.tools
      .map(t => allScored.find(s => s.id === t.toolId)!)
      .filter(Boolean);
    // Plan-aware and full-coverage-only, on the same terms as every other coverage claim
    // the user is shown. Measured plan-blind with partial hits counted, a rejected
    // provider was advertised as covering requirements it only weakly reaches, at tiers
    // this budget would never buy — the strongest argument for a provider the engine had
    // just declined.
    const rejectedPlanResolver = (cand: ScoredProviderProfile) => {
      const inStack = bestStack.tools.find(t => t.toolId === cand.id);
      if (inStack) {
        return (cand.plans ?? []).find(pl => pl.label === inStack.recommendedPlan) ?? null;
      }
      return this.selectOptimalPlan(
        cand, req.teamSize ?? 1, strategy, req.monthlyBudget ?? null, requirements
      );
    };
    const wouldHaveCovered = StackCoverageAnalyzer.fullyCoveredBy(
      p, stackProfiles, requirements, rejectedPlanResolver as any
    );

    // ── Comparable metrics only (P14) ────────────────────────────────────────
    // Every comparison below is like-for-like: requirement coverage vs requirement
    // coverage, domain fit vs domain fit, monthly cost vs monthly cost. The old default
    // compared this provider's composite score against the winning stack's *confidence*
    // score, which are different quantities on different scales.
    const winnerProfile = allScored.find(s => s.id === primary.toolId);
    const winnerComposite = winnerProfile ? this.getCompositeScore(winnerProfile, req, weights, strategy) : compositeScore;
    const winnerRequirementFit = winnerProfile ? this.computeRequirementCapabilityScore(winnerProfile, requirements) : 0;
    const winnerDomainScore = winnerProfile ? WorkflowEngine.calculateSuitability(winnerProfile.raw, domain) : 0;
    const winnerSecurity = winnerProfile ? winnerProfile.securityScore : 0;
    const providerRequirementFit = this.computeRequirementCapabilityScore(p, requirements);
    const governanceMatters = strategy === 'enterprise-security'
      || domain === 'enterprise-compliance'
      || !!req.preferences?.requireZeroRetention;
    const teamCost = cheapestPlan * req.teamSize;
    const winnerTeamCost = primary.estimatedMonthlyCostPerTeam;

    let rejectionCategory: RejectionCategory = 'LOWER_BENCHMARK';
    let rejectionBadge = 'Lower Benchmark Fit';
    let consideredFor = `Considered for ${p.category.toUpperCase()} capabilities in ${DOMAIN_LABELS[domain] || domain}.`;
    let whyNotSelected = `Lower composite suitability (${compositeScore}%) than ${primary.toolName} (${winnerComposite}%) under the ${strategy} objective.`;
    let whereItWins = p.raw.strengths?.[0] || 'Competitive baseline capabilities';
    let whyWinnerWon = `${primary.toolName} scored higher on the same composite objective (${winnerComposite}% vs ${compositeScore}%).`;
    let bestFor = `Alternative workflows prioritizing ${p.category} tasks.`;
    let notIdealFor = `Teams prioritizing the ${DOMAIN_LABELS[domain] || domain} configuration of the recommended stack.`;

    if (p.category === 'api' && !requirements.includes('developer-api-access') && !requirements.includes('api-access')) {
      rejectionCategory = 'API_INFRASTRUCTURE';
      rejectionBadge = 'Developer API Only';
      consideredFor = 'Programmatic API and token-based backend endpoints.';
      whyNotSelected = 'Your requirements specify human desktop/IDE workflows rather than programmatic developer API integration.';
      whereItWins = 'High-throughput raw token endpoints and prompt caching.';
      whyWinnerWon = `${primary.toolName} provides a native interactive application interface.`;
      bestFor = 'Software teams building custom backend applications with direct LLM endpoints.';
      notIdealFor = 'End-user teams seeking desktop/IDE GUI assistants.';
    } else if (req.monthlyBudget !== null && req.monthlyBudget > 0 && teamCost > req.monthlyBudget) {
      // Checked BEFORE redundancy: a hard budget breach is the binding reason, and the
      // old ordering left this branch unreachable because a same-category stack member
      // almost always matched first.
      rejectionCategory = 'BUDGET_OVERRUN';
      rejectionBadge = 'Budget Ceiling Overrun';
      consideredFor = `High-tier capability suite.`;
      whyNotSelected = `Cheapest plan costs $${teamCost}/mo for ${req.teamSize} seats, above your $${req.monthlyBudget}/mo ceiling.`;
      whereItWins = p.raw.strengths?.[0] || 'Advanced capability features.';
      whyWinnerWon = `${primary.toolName} costs $${winnerTeamCost}/mo for the same ${req.teamSize} seats, inside the ceiling.`;
      bestFor = 'Larger budget teams willing to invest in premium tier licenses.';
      notIdealFor = `Teams constrained to a $${req.monthlyBudget}/mo monthly spend limit.`;
    } else if (requirements.length > 0 && providerRequirementFit < winnerRequirementFit - 5) {
      rejectionCategory = 'REQUIREMENT_GAP';
      rejectionBadge = 'Lower Requirement Coverage';
      consideredFor = `Considered against your ${requirements.length} stated requirement(s).`;
      whyNotSelected = `Covers your stated requirements at ${providerRequirementFit}% capability fit versus ${winnerRequirementFit}% for ${primary.toolName}.`;
      whereItWins = p.raw.strengths?.[0] || 'Strengths outside your stated requirements.';
      whyWinnerWon = `${primary.toolName} has measurably stronger capability data on the exact requirements you selected.`;
      bestFor = 'Teams whose requirements differ from the ones selected here.';
      notIdealFor = 'Teams that need the specific capabilities you marked as required.';
    } else if (governanceMatters && p.securityScore < winnerSecurity - 5) {
      rejectionCategory = 'ENTERPRISE_GAP';
      rejectionBadge = 'Governance Mismatch';
      consideredFor = 'Considered for the enterprise governance requirement.';
      whyNotSelected = `Governance posture scores ${p.securityScore}% against ${winnerSecurity}% for ${primary.toolName}${p.governanceDataVerified ? '' : ' (its governance data is unverified, so it is not credited as compliant)'}.`;
      whereItWins = p.raw.strengths?.[0] || 'Capability strengths outside governance.';
      whyWinnerWon = `${primary.toolName} has stronger verifiable governance and admin-control evidence.`;
      bestFor = 'Teams without strict InfoSec or data-retention mandates.';
      notIdealFor = 'Regulated environments requiring verifiable governance controls.';
    } else if (domainScore < winnerDomainScore - 10) {
      rejectionCategory = 'DOMAIN_MISMATCH';
      rejectionBadge = 'Domain Mismatch';
      consideredFor = `General-purpose AI capabilities.`;
      whyNotSelected = `Scores ${domainScore}% suitability for ${DOMAIN_LABELS[domain] || domain} against ${winnerDomainScore}% for ${primary.toolName}.`;
      whereItWins = p.raw.strengths?.[0] || 'General conversational assistance.';
      whyWinnerWon = `${primary.toolName} matches ${DOMAIN_LABELS[domain] || domain} workflow patterns more closely.`;
      bestFor = 'General productivity or alternative domain workflows.';
      notIdealFor = `${DOMAIN_LABELS[domain] || domain} core daily operations.`;
    } else if (sameCatTool) {
      rejectionCategory = 'REDUNDANCY';
      rejectionBadge = 'Redundant with Stack';
      consideredFor = `Considered for the ${sameCatTool.role.toUpperCase()} role in the stack.`;
      whyNotSelected = wouldHaveCovered.length === 0
        ? `Adds no capability the stack does not already have — ${sameCatTool.toolName} already fills the ${sameCatTool.role} role.`
        : `Overlaps ${sameCatTool.toolName} (${sameCatTool.role} role) while scoring lower on the same composite objective (${compositeScore}% vs ${winnerComposite}%).`;
      whereItWins = p.raw.strengths?.[0] || 'Alternative pricing or model selection.';
      whyWinnerWon = `${sameCatTool.toolName} covers the same role with a higher score on identical metrics.`;
      bestFor = `Teams already committed to the ${p.vendor} ecosystem.`;
      notIdealFor = `Teams looking to avoid duplicate ${sameCatTool.category.toUpperCase()} subscriptions.`;
    }

    const tradeoffVsSelected = `$${cheapestPlan}/user/mo versus $${primary.monthlyCostPerSeat}/user/mo for ${primary.toolName}, at ${domainScore}% vs ${winnerDomainScore}% domain fit.`;

    return {
      toolId: p.id,
      toolName: p.name,
      vendor: p.vendor,
      category: p.category,
      compositeScore,
      rejectionCategory,
      rejectionBadge,
      consideredFor,
      whyNotSelected,
      whereItWins,
      whyWinnerWon,
      wouldHaveCovered,
      estimatedMonthlyCostPerSeat: cheapestPlan,
      tradeoffVsSelected,
      bestFor,
      notIdealFor
    };
  }

  // ── Strategy-Specific Scoring Function ─────────────────────────────────────

  // ── Requirement Capability Scoring ─────────────────────────────────────────
  // Requirement fit is derived from the evidence-backed 0–10 capability vector in
  // the knowledge base, resolved through feature-map.json's `capabilityKeys`.
  // There is deliberately no hardcoded provider→requirement table: a provider
  // wins a requirement only because its measured capability data says so.
  //
  // The definition of "how well does this provider meet this requirement" lives in
  // ONE place — `StackCoverageAnalyzer.capabilityFit` — and is shared with the
  // coverage threshold. The FIRST capability key of a feature is its *defining*
  // capability (e.g. `autocomplete` for editor-code-generation, `research` for
  // live-web-research) and carries half the weight; the remaining keys share the
  // other half. Without this, an IDE-native capability would be diluted by generic
  // abilities that every chat assistant also has.

  /** Distinct requirement dimensions, memoized (see baselineFeatureKeys). */
  private static baselineFeatureKeysCache: string[] | null = null;

  /**
   * Capability fit (0–100) of one provider for one feature-map requirement key.
   * Returns null when the requirement is unknown or carries no capability keys,
   * so callers can exclude it instead of scoring it as a miss.
   *
   * Thin scale conversion over the shared 0–10 definition: ranking and coverage must not
   * be able to drift apart, so there is no second formula here.
   */
  private static featureCapabilityFit(p: ScoredProviderProfile, featureKey: string): number | null {
    const entry = KnowledgeLoader.getFeatureMap().features?.[featureKey];
    if (!entry) return null;

    const fit = StackCoverageAnalyzer.capabilityFit(p, entry);
    return fit === null ? null : Math.round(fit * 10);
  }

  /**
   * Requirement dimensions deduplicated by their capability signature. Two feature
   * keys that resolve to the same capability set (e.g. `agent-mode` and part of
   * `automated-task-execution`) describe the same underlying ability, so counting both
   * would double-weight it in the no-requirement baseline. The exact duplicate
   * `image-understanding` (identical to `visual-diagram-understanding`, referenced
   * nowhere in the app) has been removed from the feature map; this guard still stands
   * for the overlapping-but-not-identical cases.
   */
  private static baselineFeatureKeys(): string[] {
    if (this.baselineFeatureKeysCache) return this.baselineFeatureKeysCache;

    const features = KnowledgeLoader.getFeatureMap().features || {};
    const seenSignatures = new Set<string>();
    const keys: string[] = [];

    for (const [featureKey, entry] of Object.entries(features)) {
      const capKeys = entry?.capabilityKeys || [];
      if (capKeys.length === 0) continue;             // derivedFrom-only features carry no vector signal
      const signature = [...capKeys].sort().join('|');
      if (seenSignatures.has(signature)) continue;
      seenSignatures.add(signature);
      keys.push(featureKey);
    }

    this.baselineFeatureKeysCache = keys;
    return keys;
  }

  private static computeRequirementCapabilityScore(p: ScoredProviderProfile, requirements: string[]): number {
    const explicit = (requirements || []).length > 0;

    // With no requirements, average across every DISTINCT requirement dimension so
    // that adding a specific requirement produces a real delta for providers that
    // are genuinely strong at it (rather than a uniform 100 for everyone).
    const featureKeys = explicit
      ? this.requirementsScoredAgainst(p, requirements)
      : this.baselineFeatureKeys();

    let total = 0;
    let counted = 0;
    for (const featureKey of featureKeys) {
      const fit = this.featureCapabilityFit(p, featureKey);
      if (fit === null) continue;
      total += fit;
      counted++;
    }

    if (counted > 0) return Math.round(total / counted);

    // Every supplied key was unrecognised. Fall back to the neutral baseline rather
    // than penalising or crediting providers on the basis of missing knowledge.
    return explicit ? this.computeRequirementCapabilityScore(p, []) : 0;
  }

  /**
   * The requirements a given provider is legitimately judged on.
   *
   * A requirement the feature map delegates to a dedicated stack role is only scored
   * against providers that can hold that role. Without this, asking for programmatic
   * API access rewarded every workspace application in proportion to its `api`
   * capability, so the 01 PRIMARY became whichever chat product scored highest on a
   * requirement the 04 API LAYER was already being added to satisfy — measured in the
   * sweep as the primary flipping to a chat product in every domain, purely on `api: 10`.
   *
   * Excluding the key is not the same as ignoring the requirement: the API-role provider
   * is still scored on it, the assembled stack is still coverage-analysed against it, and
   * it is still reported to the user.
   */
  private static requirementsScoredAgainst(p: ScoredProviderProfile, requirements: string[]): string[] {
    const featureMap = KnowledgeLoader.getFeatureMap();
    return requirements.filter(key => {
      const role = featureMap.features[key]?.satisfiedByRole;
      if (!role) return true;
      return role === 'api-layer' ? p.category === 'api' : true;
    });
  }

  // ── Strategy objective helpers ─────────────────────────────────────────────

  /**
   * Weighted mean over factors where a factor may legitimately have no data.
   * `value === null` means "unavailable": the factor's weight is redistributed
   * proportionally across the factors that DO have data, instead of being scored
   * as a zero or filled with a synthetic stand-in.
   */
  private static weightedScore(factors: Array<{ value: number | null; weight: number }>): number {
    const usable = factors.filter(f => f.value !== null && Number.isFinite(f.value as number) && f.weight > 0);
    const totalWeight = usable.reduce((sum, f) => sum + f.weight, 0);
    if (totalWeight <= 0) return 0;
    return usable.reduce((sum, f) => sum + (f.value as number) * f.weight, 0) / totalWeight;
  }

  /** Benchmark-name tags, matched case-insensitively against benchmark keys. */
  private static readonly BENCHMARK_TAG_PATTERNS: Record<string, string[]> = {
    coding: ['coding', 'code', 'swe', 'humaneval', 'livecodebench'],
    agentic: ['agentic', 'agent', 'tool', 'terminal'],
    reasoning: ['intelligence', 'reasoning', 'math', 'gpqa', 'mmlu', 'aime'],
    research: ['research', 'search', 'citation', 'browse'],
    writing: ['writing', 'creative', 'summar', 'translation'],
    vision: ['vision', 'image', 'visual', 'chart', 'diagram', 'design', 'ui'],
    speed: ['speed', 'latency', 'throughput', 'tokenspersecond']
  };

  /**
   * How much each benchmark family matters per domain. A coding recommendation must
   * not be boosted by writing performance, and a research recommendation must not be
   * boosted by an agentic coding score.
   */
  private static readonly DOMAIN_BENCHMARK_RELEVANCE: Record<string, Record<string, number>> = {
    'software-engineering':   { coding: 1.00, agentic: 0.80, reasoning: 0.50, speed: 0.30, vision: 0.20, research: 0.10, writing: 0.00 },
    'ai-data-ml':             { reasoning: 1.00, agentic: 0.80, coding: 0.60, research: 0.30, speed: 0.30, vision: 0.10, writing: 0.00 },
    'research-knowledge':     { research: 1.00, reasoning: 0.90, writing: 0.40, agentic: 0.30, vision: 0.20, speed: 0.20, coding: 0.10 },
    'product-design':         { vision: 1.00, reasoning: 0.60, coding: 0.40, writing: 0.40, agentic: 0.30, research: 0.20, speed: 0.20 },
    'business-operations':    { agentic: 1.00, reasoning: 0.70, writing: 0.50, research: 0.40, speed: 0.30, coding: 0.20, vision: 0.10 },
    'content-communication':  { writing: 1.00, reasoning: 0.70, research: 0.50, vision: 0.30, agentic: 0.20, speed: 0.20, coding: 0.10 },
    'enterprise-compliance':  { reasoning: 0.80, agentic: 0.50, coding: 0.40, research: 0.40, writing: 0.40, vision: 0.20, speed: 0.20 },
    'general-productivity':   { reasoning: 1.00, writing: 0.70, research: 0.60, agentic: 0.50, coding: 0.40, vision: 0.30, speed: 0.30 }
  };

  private static benchmarkTagOf(benchmarkKey: string): string | null {
    const key = benchmarkKey.toLowerCase();
    for (const [tag, patterns] of Object.entries(this.BENCHMARK_TAG_PATTERNS)) {
      if (patterns.some(pattern => key.includes(pattern))) return tag;
    }
    return null;
  }

  /**
   * Domain-relevant benchmark score (0–100), or null when the provider publishes no
   * usable benchmark for this domain. Null is a first-class outcome: callers must
   * redistribute the benchmark weight rather than substitute a capability proxy.
   */
  private static domainRelevantBenchmarkScore(p: ScoredProviderProfile, domain: string): number | null {
    if (!p.benchmarkDataAvailable) return null;

    const relevance = this.DOMAIN_BENCHMARK_RELEVANCE[this.canonicalBenchmarkDomain(domain)]
      || this.DOMAIN_BENCHMARK_RELEVANCE['general-productivity'];

    let weighted = 0;
    let totalWeight = 0;
    for (const [benchmarkKey, score] of Object.entries(p.benchmarkComponents || {})) {
      const tag = this.benchmarkTagOf(benchmarkKey);
      const weight = tag ? (relevance[tag] ?? 0) : 0.25;   // unrecognised family: low but non-zero
      if (weight <= 0) continue;
      weighted += score * weight;
      totalWeight += weight;
    }

    if (totalWeight <= 0) return null;
    return Math.round(weighted / totalWeight);
  }

  /** Collapses domain aliases onto the eight canonical domains used by the relevance table. */
  private static canonicalBenchmarkDomain(domain: string): string {
    if (this.DOMAIN_BENCHMARK_RELEVANCE[domain]) return domain;
    switch (domain) {
      case 'coding': case 'frontend': case 'backend': case 'fullstack':
        return 'software-engineering';
      case 'ai-engineering': case 'data-science': case 'ai-ml':
        return 'ai-data-ml';
      case 'research': case 'research-and-knowledge':
        return 'research-knowledge';
      case 'product':
        return 'product-design';
      case 'business': case 'security':
        return 'business-operations';
      case 'writing': case 'documentation': case 'content':
        return 'content-communication';
      case 'enterprise-governance':
        return 'enterprise-compliance';
      default:
        return 'general-productivity';
    }
  }

  /**
   * Request-aware cost efficiency (0–100).
   *
   * `p.costEfficiencyScore` is request-independent: KnowledgeScoringEngine is
   * module-memoized and never sees the request, so it can only band the provider's
   * cheapest genuinely purchasable seat price. This adds the two request-dependent
   * halves the audit found missing — what the seat actually costs THIS team against
   * THIS budget, and how much capability each dollar buys.
   *
   * Free and placeholder tiers are already excluded upstream by
   * `meaningfulPaidPlanPrice`, so a $0 trial can no longer make a provider look
   * infinitely cost-efficient.
   *
   * Returns `null` when the provider publishes no purchasable seat price. Unknown
   * cost is not "average cost": the previous behaviour returned the flat baseline
   * band (70), which every request-aware comparison then treated as a real
   * measurement. At team 10 that made unpriced products score 70 while Cursor,
   * Claude and Windsurf scored 35–37 at a $50 budget — an artificial bonus for
   * missing data. `null` instead flows into `weightedScore`, which redistributes
   * the cost weight across the factors that ARE known, the same convention already
   * used for a null `benchmarkScore`.
   */
  private static computeRequestAwareCostEfficiency(
    p: ScoredProviderProfile,
    req: StackBuilderRequest
  ): number | null {
    const seatPrice = p.meaningfulPaidPlanPrice;
    if (!p.costDataAvailable || seatPrice === null || seatPrice <= 0) return null;
    const baseline = p.costEfficiencyScore;

    const teamSize = Math.max(1, req.teamSize || 1);
    const monthlyTeamCost = seatPrice * teamSize;

    // Capability delivered per seat-dollar, normalised against the best ratio in the
    // catalogue so the number is comparative rather than an arbitrary curve.
    const reference = this.bestValuePerDollar();
    const valuePerDollar = p.capabilityCompositeScore / seatPrice;
    const valueScore = reference > 0
      ? Math.max(0, Math.min(100, Math.round((valuePerDollar / reference) * 100)))
      : baseline;

    // Budget pressure: a single tool consuming the whole budget leaves nothing for the
    // rest of the stack, so efficiency degrades as its share of the budget climbs.
    let budgetFactor = 100;
    const budget = req.monthlyBudget;
    if (budget !== null && budget !== undefined && budget > 0) {
      const share = monthlyTeamCost / budget;
      budgetFactor = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, share - 0.35) * 120)));
    }

    return Math.round(baseline * 0.40 + valueScore * 0.35 + budgetFactor * 0.25);
  }

  /** Best capability-per-seat-dollar ratio in the catalogue (0 when nothing is priced). */
  private static bestValuePerDollar(): number {
    let best = 0;
    for (const sp of KnowledgeScoringEngine.scoreAll()) {
      const price = sp.meaningfulPaidPlanPrice;
      if (price === null || price <= 0) continue;
      best = Math.max(best, sp.capabilityCompositeScore / price);
    }
    return best;
  }

  // ── Deterministic tie-breaking ─────────────────────────────────────────────

  /**
   * The factor a strategy is actually optimising for, used as tie-break rung 3.
   *
   * `null` means the factor is unknown for this provider (no published pricing under
   * `best-value`), which callers redistribute rather than substitute.
   *
   * `max-performance` deliberately falls back to the DOMAIN capability score, not the
   * flat `capabilityCompositeScore`. Only one provider in the catalogue publishes
   * usable benchmarks, so the old fallback returned exactly the same number as
   * `balanced`'s rung and the two strategies silently collapsed into one ranking.
   * The domain-weighted blend is still built from researched capability evidence —
   * no benchmark is invented — but it answers "strongest for THIS work", which is
   * what the strategy claims to optimise.
   */
  private static strategyPrimaryFactor(
    p: ScoredProviderProfile,
    req: StackBuilderRequest,
    strategy: StackStrategy
  ): number | null {
    const domain = req.domain || req.primaryWorkflow || 'general-productivity';
    switch (strategy) {
      case 'best-value':
        return this.computeRequestAwareCostEfficiency(p, req);
      case 'max-performance':
        return this.domainRelevantBenchmarkScore(p, domain)
          ?? this.computeDomainCapabilityScore(p, domain);
      case 'enterprise-security':
        return p.securityScore;
      default:
        return p.capabilityCompositeScore;
    }
  }

  /**
   * Explicit tie-break ladder. Negative means `a` ranks ahead of `b`.
   *   1. requirement coverage  2. domain fit  3. strategy-specific factor
   *   4. cost / value          5. reliability 6. stable provider id
   * The final rung guarantees the ordering is total and reproducible, rather than
   * relying on the alphabetical knowledge-base load order that a stable sort leaks.
   *
   * A rung is skipped when the metric is unknown (`null`) for either side, so a
   * provider with no published pricing neither wins nor loses a cost tie-break on
   * the strength of missing data.
   */
  private static compareForTie(
    a: ScoredProviderProfile,
    b: ScoredProviderProfile,
    req: StackBuilderRequest,
    strategy: StackStrategy
  ): number {
    const domain = req.domain || req.primaryWorkflow || 'general-productivity';
    const requirements = req.requirements || req.mustHaveFeatures || [];

    const ladder: Array<(p: ScoredProviderProfile) => number | null> = [
      p => this.computeRequirementCapabilityScore(p, requirements),
      p => WorkflowEngine.calculateSuitability(p.raw, domain),
      p => this.strategyPrimaryFactor(p, req, strategy),
      p => this.computeRequestAwareCostEfficiency(p, req),
      p => p.reliabilityScore
    ];

    for (const metric of ladder) {
      const av = metric(a);
      const bv = metric(b);
      if (av === null || bv === null) continue;   // unknown on either side → not a discriminator
      const delta = bv - av;                      // higher is better
      if (Math.abs(delta) > 0.0001) return delta > 0 ? 1 : -1;
    }
    return a.id.localeCompare(b.id);
  }

  // ── Role-based pool selection (no hardcoded provider IDs) ──────────────────

  /**
   * Ranks `pool` by composite score for `strategy`, with the P13 ladder as the
   * tie-break. Replaces the bare `.sort()` whose stability leaked the alphabetical
   * knowledge-base load order as a hidden tie-breaker.
   */
  private static rankPool(
    pool: ScoredProviderProfile[],
    req: StackBuilderRequest,
    weights: any,
    strategy: StackStrategy
  ): ScoredProviderProfile[] {
    const scores = new Map<string, number>();
    for (const p of pool) scores.set(p.id, this.getCompositeScore(p, req, weights, strategy));
    return [...pool].sort((a, b) => {
      const delta = (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
      if (delta !== 0) return delta;
      return this.compareForTie(a, b, req, strategy);
    });
  }

  /**
   * The subset of stated requirements that the 01 PRIMARY workspace tool is responsible
   * for. Requirements the feature map delegates to a dedicated role (`satisfiedByRole`)
   * are removed: they are fulfilled by that slot, so letting them gate the primary pool
   * lets a secondary concern overwrite the main recommendation.
   *
   * Delegated requirements are still scored, still coverage-analysed on the assembled
   * stack, and still reported — only the primary *eligibility gate* ignores them.
   */
  private static requirementsGatingPrimary(requirements: string[]): string[] {
    const featureMap = KnowledgeLoader.getFeatureMap();
    return requirements.filter(key => !featureMap.features[key]?.satisfiedByRole);
  }

  /**
   * Restricts a ranked pool to the providers that can *lead a stack* reaching the maximum
   * attainable FULL coverage of the stated requirements, among those the budget can buy.
   *
   * Coverage is measured for the candidate plus its best single complement from the same
   * pool, not for the candidate alone. That distinction is the whole point: what ships to
   * the user is a stack with a 02 SECONDARY slot, so demanding that one provider solo-cover
   * every requirement gates on something the product never promised. Measured effect of the
   * solo form: checking the wizard's first requirement (in-editor generation) reduced the
   * eligible primary pool to the four providers with an editor surface and decided the
   * answer before composite scoring ran, and because the primary always solo-covered
   * everything the companion was then suppressed as redundant — no secondary was emitted in
   * any of 1,664 measured scenarios.
   *
   * Mandatory coverage remains a GATE rather than one weighted factor: a required capability
   * no reachable stack provides is not "slightly worse", it is ineligible while a covering
   * alternative exists. The P10 monotonicity guarantee also survives, because the affordable
   * pool only grows as the ceiling rises, so max attainable coverage is still monotonically
   * non-decreasing in the budget.
   *
   * With no requirements stated, or when nothing is affordable, the pool passes through
   * untouched so ordinary composite ranking still applies.
   */
  private static gateByMandatoryCoverage(
    pool: ScoredProviderProfile[],
    req: StackBuilderRequest,
    requirements: string[]
  ): ScoredProviderProfile[] {
    if (requirements.length === 0 || pool.length === 0) return pool;

    const affordable = pool.filter(p => this.isProviderFitForIndividualBudget(p, req));
    const considered = affordable.length > 0 ? affordable : pool;

    const soloCoverage = new Map<string, number>();
    for (const p of considered) {
      soloCoverage.set(p.id, StackCoverageAnalyzer.analyze([p], requirements).covered.length);
    }

    // Best coverage reachable with this provider leading and at most one complement.
    const attainable = new Map<string, number>();
    for (const p of considered) {
      let bestWithCompanion = soloCoverage.get(p.id) ?? 0;
      for (const companion of considered) {
        if (companion.id === p.id) continue;
        const paired = StackCoverageAnalyzer.analyze([p, companion], requirements).covered.length;
        if (paired > bestWithCompanion) bestWithCompanion = paired;
      }
      attainable.set(p.id, bestWithCompanion);
    }

    const best = Math.max(...considered.map(p => attainable.get(p.id) ?? 0));
    const gated = considered.filter(p => (attainable.get(p.id) ?? 0) === best);
    return gated.length > 0 ? gated : considered;
  }

  /**
   * Highest-ranked provider in `pool` under `objective`. Providers the archetype does
   * not apply to return null and are skipped entirely — an archetype with no eligible
   * provider yields undefined and its alternative is simply not generated, rather than
   * being filled with an unsuitable stand-in.
   */
  private static pickByObjective(
    pool: ScoredProviderProfile[],
    objective: (p: ScoredProviderProfile) => number | null,
    req: StackBuilderRequest,
    strategy: StackStrategy,
    exclude: Set<string> = new Set()
  ): ScoredProviderProfile | undefined {
    let best: ScoredProviderProfile | undefined;
    let bestValue = -Infinity;

    for (const p of pool) {
      if (exclude.has(p.id)) continue;
      const value = objective(p);
      if (value === null || !Number.isFinite(value)) continue;

      if (value > bestValue) {
        best = p;
        bestValue = value;
      } else if (value === bestValue && best && this.compareForTie(p, best, req, strategy) < 0) {
        best = p;
      }
    }
    return best;
  }

  /**
   * Portability / vendor-neutrality signal (0–100) from provider-specific catalogue
   * fields: how many distinct models the tool can drive and how strong its researched
   * programmatic-access capability is — the two things that decide whether work built on
   * the tool can be moved elsewhere.
   *
   * The `apiSupport` boolean this previously used is `true` for every product in the
   * catalogue, so it contributed a constant +25 to all 13 providers and carried no
   * information. The researched `api` capability (0–10) is measured per provider
   * (anthropic-api/openai-api/github-models/deepseek 10, kimi 9, codex 5, perplexity 4,
   * cursor/windsurf/chatgpt/claude/gemini 1-2) and actually separates them.
   */
  private static portabilityScore(p: ScoredProviderProfile): number {
    const models = Array.isArray(p.raw.supportedModels) ? p.raw.supportedModels.length : 0;
    const breadth = Math.min(100, models * 20);          // 0–100, saturates at 5 models
    const programmaticAccess = (p.capabilityVector['api'] ?? 0) * 10;  // 0–100
    return Math.max(0, Math.min(100, breadth * 0.6 + programmaticAccess * 0.4));
  }

  /**
   * Vendor-concentration signal (0–100, higher = more concentrated). Adopting one product
   * from a large single-vendor suite concentrates the dependency; `productFamily` is
   * per-provider data (OpenAI 3, Anthropic/Microsoft 2, Anysphere/Google/DeepSeek 1).
   */
  private static vendorConcentrationScore(p: ScoredProviderProfile): number {
    const familySize = p.vendorProfile?.productFamily?.length ?? 1;
    return Math.min(100, Math.max(0, familySize - 1) * 35);
  }

  /**
   * Vendor track-record signal (0–100) from `vendorProfile` fields that differ per
   * provider: the researched stability rating, how long the vendor has existed, whether
   * it is publicly listed, and whether it has a measured enterprise presence.
   */
  private static vendorTrackRecordScore(p: ScoredProviderProfile): number {
    const vp: any = p.vendorProfile ?? {};
    const stability = Math.max(0, Math.min(100, p.vendorStabilityScore));
    const established = vp.establishedYear
      ? Math.min(100, Math.max(0, (new Date().getFullYear() - vp.establishedYear) / 20) * 100)
      : 50;   // unknown age is neither credited nor punished
    const publiclyListed = vp.fundingStage === 'Public' ? 100 : 60;
    const enterprisePresence = vp.enterprisePresence === true ? 100 : 40;
    return Math.round(
      stability * 0.40 + established * 0.25 + publiclyListed * 0.15 + enterprisePresence * 0.20
    );
  }

  /**
   * Is a capability-specialist alternative archetype worth showing for THIS request?
   *
   * Every one of the 12 blueprints used to be attempted on every request, filtered only by
   * provider-set deduplication. That put an Enterprise Security architecture in front of a
   * user who selected no governance requirement and a Coding Specialist architecture in
   * front of a non-engineering domain — entries the request gave no reason to consider.
   *
   * Relevance is decided from data, never from a domain or provider name literal:
   *   1. a requirement the user actually selected declares one of the archetype's
   *      capability keys in feature-map.json, or
   *   2. the selected domain's own row in workflow-weights.json gives those keys material
   *      weight relative to that row's strongest key.
   * Procurement-shape archetypes (value, performance, single-vendor, consolidation,
   * resilience) declare no keys and stay unconditional: those are questions every buyer
   * has regardless of which capabilities they ticked.
   */
  private static readonly ARCHETYPE_DOMAIN_EMPHASIS_RATIO = 0.6;

  private static archetypeIsRelevant(
    keys: string[] | undefined,
    requirements: string[],
    domain: string
  ): boolean {
    if (!keys || keys.length === 0) return true;

    const featureMap = KnowledgeLoader.getFeatureMap();
    for (const requirementKey of requirements) {
      const entry = featureMap.features[requirementKey];
      if (!entry) continue;
      const declared = [...(entry.capabilityKeys ?? [])];
      if (entry.requiresCapability) declared.push(entry.requiresCapability.key);
      if (declared.some(k => keys.includes(k))) return true;
    }

    const domainWeights = KnowledgeLoader.getWorkflowWeights()[domain];
    if (!domainWeights) return false;
    const strongest = Math.max(0, ...Object.values(domainWeights));
    if (strongest <= 0) return false;
    const threshold = strongest * this.ARCHETYPE_DOMAIN_EMPHASIS_RATIO;
    return keys.some(k => (domainWeights[k] ?? 0) >= threshold);
  }

  /**
   * Measured, request-specific evidence for one alternative versus the recommended stack.
   *
   * The blueprint's `mainAdvantage` / `mainTradeoff` / `whyChooseInstead` strings are the
   * archetype's *claim* and are per-archetype constants, so they came out byte-identical no
   * matter what the user asked for. These sentences are the *evidence*, computed from the
   * two stacks actually assembled for this request, and are appended to the claim so the
   * comparison text moves when the numbers move.
   */
  private static describeAlternativeEvidence(
    alt: StructuredStack,
    recommended: StructuredStack,
    req: StackBuilderRequest
  ): { advantage: string; tradeoff: string; chooseInstead: string; notRecommended: string } {
    const costDelta = alt.estimatedMonthlyCost - recommended.estimatedMonthlyCost;
    const seatDelta = alt.perSeatMonthlyCost - recommended.perSeatMonthlyCost;
    const coverageDelta = alt.coverageResult.coverageScore - recommended.coverageResult.coverageScore;
    const fitDelta = Math.round(alt.workflowFitScore - recommended.workflowFitScore);
    const money = (n: number) => `$${Math.abs(Math.round(n)).toLocaleString()}`;
    // Sub-dollar monthly differences come from annualised or per-thousand-seat rounding, not
    // from a real procurement choice, and must not be reported as a saving.
    const MATERIAL_COST_DELTA = 1;

    // What this alternative measurably does BETTER, in the order a buyer cares about.
    const gains: string[] = [];
    if (costDelta <= -MATERIAL_COST_DELTA) gains.push(`saves ${money(costDelta)}/mo (${money(seatDelta)}/seat)`);
    if (coverageDelta > 0) gains.push(`adds ${coverageDelta} points of requirement coverage`);
    if (fitDelta > 0) gains.push(`scores ${fitDelta} points higher on domain fit`);
    const uniqueLabels = alt.coverageResult.covered
      .filter(c => !recommended.coverageResult.covered.some(rc => rc.featureKey === c.featureKey))
      .map(c => c.featureLabel);
    if (uniqueLabels.length > 0) gains.push(`covers ${uniqueLabels.join(', ')}, which the recommended stack does not`);

    // What it measurably gives up.
    const losses: string[] = [];
    if (costDelta >= MATERIAL_COST_DELTA) losses.push(`costs ${money(costDelta)}/mo more (${money(seatDelta)}/seat)`);
    if (coverageDelta < 0) losses.push(`gives up ${Math.abs(coverageDelta)} points of requirement coverage`);
    if (fitDelta < 0) losses.push(`scores ${Math.abs(fitDelta)} points lower on domain fit`);
    const lostLabels = recommended.coverageResult.covered
      .filter(rc => !alt.coverageResult.covered.some(c => c.featureKey === rc.featureKey))
      .map(rc => rc.featureLabel);
    if (lostLabels.length > 0) losses.push(`no longer covers ${lostLabels.join(', ')}`);

    if (req.monthlyBudget !== null && alt.estimatedMonthlyCost > req.monthlyBudget) {
      losses.unshift(`exceeds your ${money(req.monthlyBudget)}/mo ceiling by ${money(alt.estimatedMonthlyCost - req.monthlyBudget)}`);
    }

    // No measured gain is a real finding, not something to paper over: say so plainly so
    // the entry cannot read as an improvement the numbers do not support.
    const advantage = gains.length > 0
      ? `Measured against the recommended stack for this request, it ${gains.join('; ')}.`
      : 'Measured against the recommended stack for this request, it leads on no cost, coverage, or domain-fit dimension — it is shown as a structural alternative only.';

    const tradeoff = losses.length > 0
      ? `In exchange, it ${losses.join('; ')}.`
      : 'It carries no measured cost, coverage, or domain-fit penalty versus the recommended stack for this request.';

    const chooseInstead = gains.length > 0
      ? `Choose this if you value that it ${gains[0]} more than the recommended stack's overall lead.`
      : 'Choose this only if its procurement shape suits you; the measured scores do not favour it.';

    const notRecommended = losses.length > 0
      ? `Ranked below the recommended stack because it ${losses[0]}.`
      : `Ranked below the recommended stack on the weighted ${req.strategy ?? 'balanced'} objective despite no single measured penalty.`;

    return { advantage, tradeoff, chooseInstead, notRecommended };
  }

  /**
   * Vendor families present in the pool with at least two products, ranked by the
   * summed composite score of their two best members. Lets the Single Vendor archetype
   * be populated from real `vendorProfile.vendorId` data instead of a hardcoded pair.
   */
  private static rankVendorFamilies(
    pool: ScoredProviderProfile[],
    req: StackBuilderRequest,
    weights: any,
    strategy: StackStrategy
  ): Array<{ vendorId: string; members: ScoredProviderProfile[] }> {
    const families = new Map<string, ScoredProviderProfile[]>();
    for (const p of pool) {
      const vendorId = p.vendorProfile?.vendorId || p.vendorId || p.vendor.toLowerCase();
      families.set(vendorId, [...(families.get(vendorId) ?? []), p]);
    }

    const ranked = [...families.entries()]
      .filter(([, members]) => members.length >= 2)
      .map(([vendorId, members]) => {
        const ordered = this.rankPool(members, req, weights, strategy);
        const strength = ordered
          .slice(0, 2)
          .reduce((sum, m) => sum + this.getCompositeScore(m, req, weights, strategy), 0);
        return { vendorId, members: ordered, strength };
      })
      .sort((a, b) => b.strength - a.strength || a.vendorId.localeCompare(b.vendorId));

    return ranked.map(({ vendorId, members }) => ({ vendorId, members }));
  }

  /**
   * Composite fit score for a provider under a request.
   *
   * `opts.includePreferenceModifiers = false` returns the capability/fit component only.
   * Selection must include the modifiers (a preference is a real selection input), but the
   * confidence *certainty* margin must not: a preference penalty applied to a rival for
   * missing evidence would otherwise widen the margin and raise confidence, i.e. absent
   * data would manufacture certainty. See the scoreMargin computation for the call sites.
   */
  public static getCompositeScore(
    p: ScoredProviderProfile,
    req: StackBuilderRequest,
    weights: any,
    strategy: StackStrategy = 'balanced',
    opts: { includePreferenceModifiers?: boolean } = {}
  ): number {
    const includePreferenceModifiers = opts.includePreferenceModifiers !== false;
    const domain = req.domain || req.primaryWorkflow || 'general-productivity';
    const requirements = req.requirements || req.mustHaveFeatures || [];

    const domainScore = WorkflowEngine.calculateSuitability(p.raw, domain);
    const reqCapabilityScore = this.computeRequirementCapabilityScore(p, requirements);
    const capabilityScore = this.computeDomainCapabilityScore(p, domain);
    const costEffScore = this.computeRequestAwareCostEfficiency(p, req);
    const stabScore = p.vendorStabilityScore;

    // Null when the provider publishes no benchmark relevant to this domain. The
    // weight is then redistributed across the remaining factors — never replaced by
    // a synthetic stand-in.
    const benchmarkScore = this.domainRelevantBenchmarkScore(p, domain);

    let rawScore = 0;

    // REAL DIVERGENT STRATEGY SCORING OBJECTIVES
    if (strategy === 'best-value') {
      // Best Value: Cost 40%, Requirement Coverage 25%, Domain Fit 15%, Productivity 10%, Performance 10%
      rawScore = this.weightedScore([
        { value: costEffScore, weight: 0.40 },
        { value: reqCapabilityScore, weight: 0.25 },
        { value: domainScore, weight: 0.15 },
        { value: p.futureGrowthScore, weight: 0.10 },
        { value: capabilityScore, weight: 0.10 }
      ]);
    } else if (strategy === 'max-performance') {
      // Max Performance: Benchmarks 35%, Requirement Coverage 25%, Reasoning 20%, Domain Fit 15%, Cost 5%
      rawScore = this.weightedScore([
        { value: benchmarkScore, weight: 0.35 },
        { value: reqCapabilityScore, weight: 0.25 },
        { value: p.reasoningScore, weight: 0.20 },
        { value: domainScore, weight: 0.15 },
        { value: costEffScore, weight: 0.05 }
      ]);
    } else if (strategy === 'enterprise-security') {
      // Enterprise Security: Security / Governance 35%, Requirement Coverage 25%, Vendor Stability 15%, Domain Fit 15%, Cost 10%
      rawScore = this.weightedScore([
        { value: p.securityScore, weight: 0.35 },
        { value: reqCapabilityScore, weight: 0.25 },
        { value: stabScore, weight: 0.15 },
        { value: domainScore, weight: 0.15 },
        { value: costEffScore, weight: 0.10 }
      ]);
    } else {
      // Balanced: Domain Fit 25%, Requirement Coverage 25%, Performance 20%, Productivity 15%, Cost 15%
      rawScore = this.weightedScore([
        { value: domainScore, weight: 0.25 },
        { value: reqCapabilityScore, weight: 0.25 },
        { value: benchmarkScore, weight: 0.20 },
        { value: p.futureGrowthScore, weight: 0.15 },
        { value: costEffScore, weight: 0.15 }
      ]);
    }

    if (includePreferenceModifiers) {
      rawScore += this.getPreferenceModifiersNet(p, req, weights);
    }

    return Math.min(100, Math.max(0, Math.round(rawScore)));
  }

  private static computeDomainCapabilityScore(p: ScoredProviderProfile, domain: string): number {
    switch (domain) {
      case 'software-engineering':
      case 'coding':
      case 'frontend':
      case 'backend':
      case 'fullstack':
        return (p.codingScore * 0.45 + p.reasoningScore * 0.25 + p.reliabilityScore * 0.15 + p.longContextScore * 0.15);

      case 'ai-data-ml':
      case 'ai-engineering':
      case 'data-science':
        return (p.reasoningScore * 0.40 + p.codingScore * 0.25 + p.researchScore * 0.20 + p.longContextScore * 0.15);

      case 'research-knowledge':
      case 'research':
        return (p.researchScore * 0.50 + p.longContextScore * 0.25 + p.reasoningScore * 0.15 + p.writingScore * 0.10);

      case 'product-design':
        return (p.reasoningScore * 0.35 + p.writingScore * 0.25 + p.longContextScore * 0.20 + p.codingScore * 0.20);

      case 'business-operations':
      case 'enterprise-compliance':
      case 'security':
        return (p.reliabilityScore * 0.35 + p.reasoningScore * 0.35 + p.writingScore * 0.15 + p.longContextScore * 0.15);

      case 'content-communication':
      case 'writing':
      case 'documentation':
        return (p.writingScore * 0.45 + p.reasoningScore * 0.30 + p.longContextScore * 0.25);

      default:
        return (p.reasoningScore * 0.30 + p.codingScore * 0.20 + p.writingScore * 0.20 + p.researchScore * 0.15 + p.reliabilityScore * 0.15);
    }
  }

  /**
   * Net score adjustment from the four user preference toggles.
   *
   * Every term here is GRADED against provider-specific measured data rather than fired by
   * a threshold on a catalogue-wide constant. The previous implementation was inert: three
   * of the four toggles could not change the ranking at all.
   *   - `avoidLockIn` tested `financialProfile.vendorLockInRisk === 'High'`, but that block
   *     is byte-identical in all 13 provider files (`"Low"` everywhere), so it never fired.
   *   - `preferEstablishedVendors` tested `vendorStabilityScore < 50`, which only DeepSeek
   *     (45) reaches — every other provider sits at 60–98, so the toggle was a no-op for
   *     12 of 13 providers.
   *   - `requireZeroRetention` applied a flat −25 to every provider, because
   *     `governanceDataVerified` is false catalogue-wide. Subtracting the same constant
   *     from all candidates cannot reorder them, so the toggle changed nothing.
   * Grading keeps the toggles honest (no invented data, no provider named anywhere) while
   * letting them actually move the selection when the data supports a difference.
   */
  private static getPreferenceModifiersNet(p: ScoredProviderProfile, req: StackBuilderRequest, weights: any): number {
    let modifier = 0;
    const pref = weights.preferenceModifiers || {};

    if (req.preferences?.avoidLockIn) {
      // Exit friction = how hard it is to move off this product. Measured from portability
      // (model breadth + researched programmatic access) and from how concentrated the
      // vendor's own suite is. Full penalty at zero portability / maximum concentration.
      const exitFriction = ((100 - this.portabilityScore(p)) * 0.7
        + this.vendorConcentrationScore(p) * 0.3) / 100;
      modifier += (pref.avoidLockIn?.penalty ?? -10) * exitFriction;
    }

    if (req.preferences?.preferOpenSource) {
      // The knowledge base has no openWeights/openSource field, so the honest signal is
      // measured portability: model breadth plus researched programmatic access. Graded,
      // so a product that can be pointed at four model families scores above one locked to
      // a single model instead of both clearing the same flat threshold.
      modifier += (pref.preferOpenSource?.bonus ?? 8) * (this.portabilityScore(p) / 100);
    }

    if (req.preferences?.preferEstablishedVendors) {
      // Graded against the vendor's own researched track record rather than a cliff at
      // stability 50 that only one provider in the catalogue can fall below.
      modifier += (pref.preferEstablishedVendors?.penalty ?? -10)
        * (1 - this.vendorTrackRecordScore(p) / 100);
    }

    if (req.preferences?.requireZeroRetention) {
      // A requirement the provider cannot verify is NOT satisfied, and unknown is never
      // silently credited. Three distinct evidence states, only one of which is free:
      //   verified + flag true  → requirement met, no penalty.
      //   verified + flag false → real negative evidence, full penalty.
      //   unverified            → the ZDR flag itself is catalogue-wide boilerplate and
      //     proves nothing, so the penalty is graded by the provider's researched
      //     enterpriseSecurity capability (0–10), which IS measured per provider. A tool
      //     with a strong measured security posture is a better bet for an unverifiable
      //     retention requirement than one with a weak posture, and the request is still
      //     penalised overall because nothing here confirms zero retention.
      const penalty = pref.requireZeroRetention?.penalty ?? -25;
      const zdrFlag = !!p.raw.enterprise?.security?.zeroDataRetention;
      if (p.governanceDataVerified) {
        if (!zdrFlag) modifier += penalty;
      } else {
        const securityEvidence = (p.capabilityVector['enterpriseSecurity'] ?? 0) / 10;
        modifier += penalty * (1 - securityEvidence);
      }
    }

    return modifier;
  }

  // ── Growth & Budget Simulation ─────────────────────────────────────────────

  private static buildGrowthSimulation(stack: StructuredStack, teamSize: number) {
    const currentCost = stack.estimatedMonthlyCost;

    const project = (multiplier: number) => {
      const targetTeam = teamSize * multiplier;
      const targetMonthly = Math.round((currentCost / teamSize) * targetTeam);
      return {
        teamSize: targetTeam,
        estimatedMonthlyCost: targetMonthly,
        estimatedAnnualCost: targetMonthly * 12,
        recommendedUpgrades: targetTeam >= 50 ? [
          {
            toolId: stack.primary.toolId,
            toolName: stack.primary.toolName,
            currentPlan: stack.primary.recommendedPlan,
            recommendedPlan: 'Enterprise / Team',
            triggerCondition: 'Requires enterprise administrative controls and SAML SSO for teams above 50 seats.',
            costDeltaPerSeat: 15
          }
        ] : []
      };
    };

    return {
      currentTeamSize: teamSize,
      currentMonthlyCost: currentCost,
      projection2x: project(2),
      projection5x: project(5)
    };
  }

  private static runBudgetSimulation(
    providers: ScoredProviderProfile[],
    req: StackBuilderRequest,
    weights: any
  ): BudgetSimulation {
    const perSeatTiers = [20, 40, 80];
    const tiers: BudgetSimulation['tiers'] = [];

    for (const perSeat of perSeatTiers) {
      const budgetLimit = perSeat * req.teamSize;
      const tempReq: StackBuilderRequest = { ...req, monthlyBudget: budgetLimit, strategy: 'best-value' };
      const cat = this.buildCategoryArchitecture('bestValue', 'best-value', providers, tempReq, weights);
      const chosen = cat.recommendedStack;

      tiers.push({
        budgetPerMonth: budgetLimit,
        budgetLabel: `$${perSeat}/seat/mo`,
        estimatedMonthlyCost: chosen.estimatedMonthlyCost,
        coverageScore: chosen.coverageResult.coverageScore,
        confidenceScore: chosen.confidenceScore,
        stackSummary: chosen.tools.map(t => `${t.toolName} (${t.recommendedPlan})`)
      });
    }

    // Unlimited Tier
    const unlimitedReq: StackBuilderRequest = { ...req, monthlyBudget: null, strategy: 'balanced' };
    const unlCat = this.buildCategoryArchitecture('bestOverall', 'balanced', providers, unlimitedReq, weights);
    const unlStack = unlCat.recommendedStack;

    tiers.push({
      budgetPerMonth: null,
      budgetLabel: 'Unlimited Budget',
      estimatedMonthlyCost: unlStack.estimatedMonthlyCost,
      coverageScore: unlStack.coverageResult.coverageScore,
      confidenceScore: unlStack.confidenceScore,
      stackSummary: unlStack.tools.map(t => `${t.toolName} (${t.recommendedPlan})`)
    });

    return { tiers };
  }

  // ── Normalization Helpers ──────────────────────────────────────────────────

  private static normalizeDomain(req: StackBuilderRequest): string {
    if (req.domain && DOMAIN_LABELS[req.domain]) return req.domain;
    if (req.primaryWorkflow && DOMAIN_LABELS[req.primaryWorkflow]) return req.primaryWorkflow;
    if (req.engineeringFocus && req.engineeringFocus.length > 0 && DOMAIN_LABELS[req.engineeringFocus[0]]) {
      return req.engineeringFocus[0];
    }
    return 'general-productivity';
  }

  private static normalizeRequirements(req: StackBuilderRequest): string[] {
    if (Array.isArray(req.requirements) && req.requirements.length > 0) return req.requirements;
    if (Array.isArray(req.mustHaveFeatures) && req.mustHaveFeatures.length > 0) return req.mustHaveFeatures;
    return [];
  }

  private static isProviderFitForIndividualBudget(p: ScoredProviderProfile, req: StackBuilderRequest): boolean {
    if (req.monthlyBudget === null) return true;
    // Only genuinely purchasable rows count. Enterprise "contact sales" placeholders and
    // pay-per-use rows carry a $0 seat price, and including them made every provider look
    // affordable at any ceiling.
    const purchasable = p.plans.filter(pl => !pl.isPayPerUse && pl.id !== 'enterprise');
    if (purchasable.length === 0) return false;
    const minCost = Math.min(...purchasable.map(pl => pl.monthlyPricePerSeat));
    return minCost * req.teamSize <= req.monthlyBudget;
  }
}
