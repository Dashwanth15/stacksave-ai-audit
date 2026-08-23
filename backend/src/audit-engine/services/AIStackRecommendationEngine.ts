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
  UserContextSummary
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
    })).sort((a, b) => b.compositeScore - a.compositeScore);

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
      alternatives: alternatives.sort((a, b) => b.compositeScore - a.compositeScore),
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

    // Rank application providers for this strategy
    const rankedAppProviders = [...applicationProviders].sort((a, b) => {
      return this.getCompositeScore(b, req, weights, strategy) - this.getCompositeScore(a, req, weights, strategy);
    });

    const rankedApiProviders = [...apiProviders].sort((a, b) => {
      return this.getCompositeScore(b, req, weights, strategy) - this.getCompositeScore(a, req, weights, strategy);
    });

    // 1. Construct Rank #1: Recommended Stack
    const primarySeed1 = rankedAppProviders[0] || providers[0];
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
    const p2 = topApps[1] || topApps[0];
    const p3 = topApps[2] || topApps[1] || topApps[0];
    const p4 = topApps[3] || topApps[2] || topApps[0];
    const p5 = topApps[4] || topApps[3] || topApps[0];

    const perplexityProfile = providers.find(p => p.id === 'perplexity');
    const geminiProfile = providers.find(p => p.id === 'gemini');
    const claudeProfile = providers.find(p => p.id === 'claude');
    const chatgptProfile = providers.find(p => p.id === 'chatgpt');
    const cursorProfile = providers.find(p => p.id === 'cursor');
    const windsurfProfile = providers.find(p => p.id === 'windsurf');
    const copilotProfile = providers.find(p => p.id === 'github-copilot');
    const deepseekProfile = providers.find(p => p.id === 'deepseek');
    const kimiProfile = providers.find(p => p.id === 'kimi');

    // 12 Strategically Distinct Candidate Blueprints Covering Major Procurement Types
    const candidateBlueprints: Array<{
      purposeLabel: string;
      rankTitle: string;
      architectureType: string;
      seedProvider: ScoredProviderProfile | undefined;
      secondarySeed?: ScoredProviderProfile | undefined;
      subStrategy: StackStrategy;
      customReason: string;
      bestFor: string;
      mainAdvantage: string;
      mainTradeoff: string;
      whyChooseInstead: string;
      whyNotRecommended: string;
      forceSingleTool?: boolean;
    }> = [
      // 1. COST-EFFICIENT PRO (Best Value)
      {
        purposeLabel: 'Best Value Architecture',
        rankTitle: '#2 Best Value Architecture',
        architectureType: 'cost-efficient-pro',
        seedProvider: (windsurfProfile && domain.includes('software')) ? windsurfProfile : (deepseekProfile || p2),
        secondarySeed: (claudeProfile && claudeProfile.id !== (windsurfProfile?.id || p2.id)) ? claudeProfile : (p3.id !== p2.id ? p3 : undefined),
        subStrategy: 'best-value',
        customReason: 'Maximizes capability per dollar using cost-effective commercial pro subscriptions.',
        bestFor: 'Budget-conscious teams seeking strong core capabilities with minimum seat expense.',
        mainAdvantage: 'Delivers 85%+ of flagship capabilities at a significantly lower monthly seat cost.',
        mainTradeoff: 'Uses entry-level subscription tiers which may have tighter burst quotas during peak hours.',
        whyChooseInstead: 'Substantially reduces monthly software spend while maintaining daily operational velocity.',
        whyNotRecommended: 'Lower composite benchmark score than the #1 recommended flagship core.'
      },
      // 2. PERFORMANCE FLAGSHIP (Max Performance)
      {
        purposeLabel: 'Maximum Performance Suite',
        rankTitle: '#3 High-Performance Flagship Suite',
        architectureType: 'performance-flagship',
        seedProvider: (claudeProfile && claudeProfile.id !== p1.id ? claudeProfile : p1),
        secondarySeed: (chatgptProfile && chatgptProfile.id !== p1.id ? chatgptProfile : p2),
        subStrategy: 'max-performance',
        customReason: 'Uncompromised benchmark capabilities with full-context frontier reasoning models.',
        bestFor: 'High-leverage teams demanding top-tier mathematical and architectural reasoning.',
        mainAdvantage: 'Highest available benchmark reasoning precision and zero-compromise model depth.',
        mainTradeoff: 'Higher per-seat license cost across the team.',
        whyChooseInstead: 'Unlocks frontier intelligence for complex, ambiguous, or multi-step engineering tasks.',
        whyNotRecommended: 'Higher total monthly spend than the primary balanced baseline.'
      },
      // 3. GITHUB ECOSYSTEM INTEGRATION
      {
        purposeLabel: 'GitHub Ecosystem Suite',
        rankTitle: '#4 GitHub Ecosystem Architecture',
        architectureType: 'github-ecosystem',
        seedProvider: copilotProfile,
        secondarySeed: claudeProfile || chatgptProfile,
        subStrategy: 'balanced',
        customReason: 'Deep native integration with GitHub repositories, pull requests, and developer workflows.',
        bestFor: 'Teams already heavily invested in GitHub Enterprise and unified developer identity.',
        mainAdvantage: 'Seamless GitHub PR summarization, issue tracking, and repository context integration.',
        mainTradeoff: 'Less unified inline multi-file composer experience compared to dedicated AI-native IDEs.',
        whyChooseInstead: 'Zero friction setup for organizations with strict GitHub-centric enterprise policies.',
        whyNotRecommended: 'Dedicated AI IDEs achieve higher autonomous multi-file generation scores.'
      },
      // 4. AUTONOMOUS AGENTIC DEVELOPMENT
      {
        purposeLabel: 'Autonomous Agentic Suite',
        rankTitle: '#5 Fast Autonomous Agentic Suite',
        architectureType: 'agentic-development',
        seedProvider: windsurfProfile || p3,
        secondarySeed: chatgptProfile || claudeProfile,
        subStrategy: 'balanced',
        customReason: 'Optimized for high-speed multi-file agentic editing and autonomous refactoring.',
        bestFor: 'Fast-moving developers who rely heavily on autonomous multi-file agent execution.',
        mainAdvantage: 'High-velocity cascade agent execution with native Devin cloud session launches.',
        mainTradeoff: 'Smaller ecosystem and plugin community than established editor platforms.',
        whyChooseInstead: 'Superior autonomous multi-file refactoring speed and agentic terminal execution.',
        whyNotRecommended: 'Specialized for autonomous code refactoring rather than general team workflows.'
      },
      // 5. RESEARCH & LIVE SEARCH GROUNDING
      {
        purposeLabel: 'Research & Live Intelligence',
        rankTitle: '#6 Research & Web Intelligence Suite',
        architectureType: 'research-enhanced',
        seedProvider: (claudeProfile || chatgptProfile || p1),
        secondarySeed: perplexityProfile,
        subStrategy: 'balanced',
        customReason: 'Grounds analysis with real-time internet search citations and document synthesis.',
        bestFor: 'Teams requiring daily external market research, legal tracking, or verified source citations.',
        mainAdvantage: 'Real-time search engine grounding with verifiable web source citations.',
        mainTradeoff: 'Adds a secondary search subscription portal to manage.',
        whyChooseInstead: 'Directly grounds daily analysis in real-time internet search and source citations.',
        whyNotRecommended: 'Requires an extra subscription if real-time web citations are only occasionally needed.'
      },
      // 6. LONG-CONTEXT DEEP INGESTION
      {
        purposeLabel: 'Long-Context Analysis Suite',
        rankTitle: '#7 Long-Context Analysis Suite',
        architectureType: 'long-context',
        seedProvider: (geminiProfile && geminiProfile.id !== p1.id ? geminiProfile : (kimiProfile || p4)),
        secondarySeed: p1.id !== (geminiProfile?.id || kimiProfile?.id || p4.id) ? p1 : p2,
        subStrategy: 'max-performance',
        customReason: 'Massive multi-million token context window for large codebase, dataset, and document analysis.',
        bestFor: 'Teams analyzing massive repositories, entire books, or extensive legal/technical datasets.',
        mainAdvantage: 'Unmatched 1M-2M token context window for whole-codebase, large dataset, and documentation ingest.',
        mainTradeoff: 'Specialized deep-context focus requires managing cross-ecosystem workflows.',
        whyChooseInstead: 'Processes complete multi-megabyte documentation and repositories in a single prompt.',
        whyNotRecommended: 'Higher monthly cost on flagship long-context commercial tiers.'
      },
      // 7. ENTERPRISE GOVERNANCE & ZERO RETENTION
      {
        purposeLabel: 'Enterprise Security & Governance',
        rankTitle: '#8 Enterprise Security Architecture',
        architectureType: 'enterprise-governance',
        seedProvider: (copilotProfile || chatgptProfile || p1),
        secondarySeed: (claudeProfile && claudeProfile.id !== (copilotProfile?.id || chatgptProfile?.id || p1.id) ? claudeProfile : p2),
        subStrategy: 'enterprise-security',
        customReason: 'Strict compliance posture with SAML SSO, SOC 2 Type II, and zero data retention guarantees.',
        bestFor: 'Enterprises with strict InfoSec requirements, compliance audits, and centralized SSO.',
        mainAdvantage: 'Guaranteed zero data retention, centralized SSO/SCIM provisioning, and administrative audit logs.',
        mainTradeoff: 'Requires team-wide subscription commitments on higher commercial tiers.',
        whyChooseInstead: 'Meets rigorous InfoSec mandates and corporate compliance standards without exception.',
        whyNotRecommended: 'Team licensing requires minimum seat thresholds and higher annual commitments.'
      },
      // 8. OPEN / COST-DISRUPTIVE ECOSYSTEM
      {
        purposeLabel: 'Open Ecosystem Architecture',
        rankTitle: '#9 Open Ecosystem Architecture',
        architectureType: 'open-ecosystem',
        seedProvider: deepseekProfile || kimiProfile || p3,
        secondarySeed: claudeProfile || p1,
        subStrategy: 'best-value',
        customReason: 'Vendor-neutral architecture with high benchmark capabilities and open model flexibility.',
        bestFor: 'Teams prioritizing open model weights, vendor neutrality, and disruptive per-token pricing.',
        mainAdvantage: 'High benchmark capability with minimal vendor lock-in and disruptive per-token pricing.',
        mainTradeoff: 'Fewer built-in enterprise management controls and third-party integrations.',
        whyChooseInstead: 'Avoids closed-ecosystem pricing lock-in and offers flexible deployment options.',
        whyNotRecommended: 'Less comprehensive enterprise identity and compliance certifications.'
      },
      // 9. GENERAL MULTIMODAL WORKSPACE
      {
        purposeLabel: 'General Team AI Workspace',
        rankTitle: '#10 General Team Workspace',
        architectureType: 'general-ai',
        seedProvider: (chatgptProfile && chatgptProfile.id !== p1.id ? chatgptProfile : p2),
        secondarySeed: (claudeProfile && claudeProfile.id !== (chatgptProfile?.id || p1.id) ? claudeProfile : (geminiProfile || p3)),
        subStrategy: 'balanced',
        customReason: 'Versatile multi-modal reasoning and cross-functional team productivity.',
        bestFor: 'Cross-functional teams needing versatile assistance across writing, research, and analysis.',
        mainAdvantage: 'Maximum flexibility across conversational reasoning, document synthesis, and multimodal tasks.',
        mainTradeoff: 'Requires external plugin or IDE companion for inline editor code editing.',
        whyChooseInstead: 'Provides a unified assistant that serves non-technical and technical team members alike.',
        whyNotRecommended: 'Less specialized for deep in-editor automated code refactoring than dedicated IDE tools.'
      },
      // 10. MINIMAL UNIFIED CORE (Single Tool)
      {
        purposeLabel: 'Minimal Single-Tool Core',
        rankTitle: '#11 Minimal Single-Tool Core',
        architectureType: 'minimal-core',
        seedProvider: p1,
        subStrategy: strategy,
        customReason: 'Unified single-subscription workspace eliminating tool sprawl and multiple portal management.',
        bestFor: 'Lean organizations seeking zero management overhead and a single consolidated subscription.',
        mainAdvantage: 'Consolidates all AI assistance under a single subscription portal with zero tool sprawl.',
        mainTradeoff: 'Lacks specialized secondary companion for tasks outside the primary tool\'s core strength.',
        whyChooseInstead: 'Zero tool sprawl, single invoice, and simplest possible team onboarding.',
        whyNotRecommended: 'Leaves specialized capabilities uncovered compared to a dual-tool synergistic stack.'
      },
      // 11. ALTERNATIVE UNIFIED WORKSPACE (Single Tool Alternative)
      {
        purposeLabel: 'Alternative Unified Workspace',
        rankTitle: '#12 Alternative Single Workspace',
        architectureType: 'alternative-core',
        seedProvider: p2,
        subStrategy: strategy,
        customReason: `Lean single-subscription workspace centered exclusively on ${p2.name}.`,
        bestFor: `Teams preferring a single consolidated contract centered on ${p2.name}.`,
        mainAdvantage: `Provides complete single-subscription access to the ${p2.vendor} ecosystem.`,
        mainTradeoff: 'Single-vendor reliance and narrower feature specialization.',
        whyChooseInstead: `Simpler procurement workflow if your team already uses ${p2.vendor} tools.`,
        whyNotRecommended: `Lower overall suitability score for ${DOMAIN_LABELS[domain] || domain} than ${p1.name}.`
      },
      // 12. CROSS-PLATFORM DIVERSE PAIR
      {
        purposeLabel: 'Cross-Platform Team Stack',
        rankTitle: '#13 Cross-Platform Architecture',
        architectureType: 'cross-platform',
        seedProvider: p4.id !== p1.id ? p4 : p5,
        secondarySeed: p1,
        subStrategy: 'balanced',
        customReason: `Diversified multi-vendor stack blending ${p4.name} with ${p1.name}.`,
        bestFor: 'Organizations looking to diversify foundation model exposure across multiple top AI labs.',
        mainAdvantage: 'Eliminates single-lab dependency by pairing complementary foundation models.',
        mainTradeoff: 'Managing multiple provider dashboards and subscription contracts.',
        whyChooseInstead: 'Provides resilience against rate limits and single-provider service degradations.',
        whyNotRecommended: 'Higher administrative overhead managing distinct subscription contracts.'
      }
    ];

    let rankCounter = 2;
    for (const bp of candidateBlueprints) {
      if (!bp.seedProvider) continue;

      const altStack = this.assembleHierarchicalStack(
        `stack-${categoryId}-alt-${rankCounter}`,
        bp.rankTitle,
        rankCounter,
        bp.rankTitle,
        bp.seedProvider,
        rankedAppProviders,
        rankedApiProviders,
        req,
        weights,
        bp.subStrategy,
        bp.customReason,
        bp.forceSingleTool,
        bp.secondarySeed
      );

      // STRICT DEDUPLICATION: Check both full signature AND sorted provider ID set
      const providerIdSignature = [...altStack.tools.map(t => t.toolId)].sort().join('|');
      if (seenSignatures.has(altStack.canonicalSignature) || seenProviderSignatures.has(providerIdSignature)) {
        continue;
      }

      seenSignatures.add(altStack.canonicalSignature);
      seenProviderSignatures.add(providerIdSignature);
      altStack.purposeLabel = bp.purposeLabel;
      generatedStacks.push(altStack);

      const costDelta = altStack.estimatedMonthlyCost - recommendedStack.estimatedMonthlyCost;
      const isWithinBudget = req.monthlyBudget !== null ? altStack.estimatedMonthlyCost <= req.monthlyBudget : true;
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
        mainAdvantage: bp.mainAdvantage || altStack.advantages[0] || bp.customReason,
        mainTradeoff: bp.mainTradeoff || altStack.tradeoffs[0] || 'Requires managing alternative subscription portals.',
        whyThisStack: altStack.whyThisStack,
        whyChooseInstead: bp.whyChooseInstead || bp.customReason,
        whyNotRecommended: bp.whyNotRecommended || (costDelta > 0 ? `Higher monthly spend (+$${costDelta.toLocaleString()}/mo vs recommended)` : 'Lower overall domain fit score than recommended core.'),
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

    // ── 01 PRIMARY AI TOOL ──────────────────────────────────────────
    let effectivePrimarySeed = primarySeed;
    if (req.monthlyBudget !== null && req.monthlyBudget > 0 && strategy !== 'max-performance') {
      const primaryMinPaidPlan = primarySeed.plans.filter(pl => pl.monthlyPricePerSeat > 0).sort((a, b) => a.monthlyPricePerSeat - b.monthlyPricePerSeat)[0];
      const primaryCost = (primaryMinPaidPlan?.monthlyPricePerSeat ?? 0) * teamSize;
      if (primaryCost > req.monthlyBudget) {
        // First, try to find a provider with a paid plan that fits within the total budget.
        const affordableCandidate = allAppProviders.find(p => {
          const minPaid = p.plans.filter(pl => pl.monthlyPricePerSeat > 0).sort((a, b) => a.monthlyPricePerSeat - b.monthlyPricePerSeat)[0];
          return minPaid && (minPaid.monthlyPricePerSeat * teamSize <= req.monthlyBudget!);
        });
        if (affordableCandidate) {
          effectivePrimarySeed = affordableCandidate;
        } else {
          // No paid plan fits within budget — fall back to the highest-ranked provider
          // that has a free plan (covers $50 budget for 15 seats = $3.33/seat edge case).
          const freePlanCandidate = allAppProviders.find(p => {
            return p.plans.some(pl => pl.monthlyPricePerSeat === 0 && pl.id !== 'enterprise');
          });
          if (freePlanCandidate) {
            effectivePrimarySeed = freePlanCandidate;
          }
          // If no free plan exists either, keep primary seed but selectOptimalPlan will
          // return the free plan or lowest-cost option for the budget context.
        }
      }
    }

    const primaryPlan = this.selectOptimalPlan(effectivePrimarySeed, teamSize, strategy, req.monthlyBudget);
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
      estimatedMonthlyCostPerTeam: primaryCostPerSeat * teamSize,
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
      featuresCovered: StackCoverageAnalyzer.newFeaturesCovered(effectivePrimarySeed, [], requirements)
    };

    const activeStackProfiles: ScoredProviderProfile[] = [effectivePrimarySeed];
    const stackTools: StackToolAssignment[] = [primaryTool];
    let currentStackMonthlyCost = primaryCostPerSeat * teamSize;

    // ── 02 SECONDARY AI COMPANION ───────────────────────────────────
    if (!forceSingleTool) {
      const isPrimaryChat = primarySeed.category === 'chat';
      const wantsCoding = requirements.includes('editor-code-generation') || domain === 'software-engineering';
      const wantsDeepReasoning = requirements.includes('deep-reasoning-analysis') || requirements.includes('large-document-processing');

      const needsCompanion = forcedSecondarySeed || (isPrimaryIde && (wantsDeepReasoning || strategy !== 'best-value')) ||
        (isPrimaryChat && wantsCoding) ||
        (strategy === 'max-performance');

      if (needsCompanion) {
        const secondaryCandidate = (forcedSecondarySeed && forcedSecondarySeed.id !== primarySeed.id)
          ? forcedSecondarySeed
          : allAppProviders.find(cand => {
              if (cand.id === primarySeed.id) return false;
              if (isPrimaryIde) return cand.category === 'chat';
              if (isPrimaryChat && wantsCoding) return cand.category === 'ide';
              return this.isComplementaryCategory(primarySeed.category, cand.category, domain);
            });

        if (secondaryCandidate) {
          const remainingBudgetForSec = req.monthlyBudget !== null
            ? Math.max(0, req.monthlyBudget - currentStackMonthlyCost)
            : null;

          const secPlan = this.selectOptimalPlan(secondaryCandidate, teamSize, strategy, remainingBudgetForSec);
          const secCostPerSeat = secPlan?.monthlyPricePerSeat ?? 0;
          const secTeamCost = secCostPerSeat * teamSize;

          // STRICT BUDGET ENFORCEMENT:
          // Do not force a secondary companion that violates the procurement ceiling unless strategy === 'max-performance'
          const wouldExceedBudget = req.monthlyBudget !== null && req.monthlyBudget > 0 && (currentStackMonthlyCost + secTeamCost > req.monthlyBudget);

          if (!wouldExceedBudget || strategy === 'max-performance') {
            const secWhy = isPrimaryIde
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
              capabilityHighlights: secondaryCandidate.raw.strengths?.slice(0, 3) || [],
              whyRecommended: secWhy,
              uniqueValueAdded: isPrimaryIde
                ? 'Deep architectural reasoning and long-form spec companion.'
                : 'In-editor IDE autocomplete and multi-file code generator.',
              whatItComplements: `Complements ${primarySeed.name} by providing ${isPrimaryIde ? 'deep reasoning, documentation drafting, and complex architectural specs' : 'native in-editor autocomplete and multi-file code editing'}.`,
              mainTradeoff: 'Requires managing a second subscription portal and seat allocation.',
              procurementFitReasons: {
                domainFit: `Fills the critical ${isPrimaryIde ? 'reasoning and documentation' : 'editor code execution'} gap in ${domainLabel}.`,
                workflowFit: 'Allows team members to switch between high-level architectural planning and direct execution.',
                teamFit: `Complementary companion tier for ${teamSize} seats.`,
                budgetFit: `Adds $${secTeamCost}/mo to overall team spend.`
              },
              missingCapabilities: isPrimaryIde ? ['In-editor terminal execution'] : ['Long-document 1M+ context recall'],
              procurementRisks: ['Subscription sprawl across multiple vendors'],
              bestFor: `Teams that require both in-editor coding velocity and high-level architectural reasoning.`,
              notIdealFor: 'Teams with a hard mandate for single-vendor consolidation.',
              purchaseDecision: 'STRONGLY_CONSIDER',
              featuresCovered: StackCoverageAnalyzer.newFeaturesCovered(secondaryCandidate, activeStackProfiles, requirements)
            };

            activeStackProfiles.push(secondaryCandidate);
            stackTools.push(secondaryTool);
            currentStackMonthlyCost += secTeamCost;
          }
        }
      }

      // ── 03 SPECIALIZED / OPTIONAL TOOL ────────────────────────────
      const wantsWebResearch = requirements.includes('live-web-research');
      const hasSearchTool = activeStackProfiles.some(p => p.category === 'search' || p.id === 'perplexity');

      if (wantsWebResearch && !hasSearchTool) {
        const searchCandidate = allAppProviders.find(p => p.id === 'perplexity' || p.category === 'search');
        if (searchCandidate) {
          const remainingBudgetForOpt = req.monthlyBudget !== null
            ? Math.max(0, req.monthlyBudget - currentStackMonthlyCost)
            : null;

          const optPlan = this.selectOptimalPlan(searchCandidate, teamSize, strategy, remainingBudgetForOpt);
          const optCost = optPlan?.monthlyPricePerSeat ?? 0;
          const optTeamCost = optCost * teamSize;

          const wouldExceedBudget = req.monthlyBudget !== null && req.monthlyBudget > 0 && (currentStackMonthlyCost + optTeamCost > req.monthlyBudget);

          if (!wouldExceedBudget || strategy === 'max-performance') {
            const optionalTool: StackToolAssignment = {
              toolId: searchCandidate.id,
              toolName: searchCandidate.name,
              vendor: searchCandidate.vendor,
              category: searchCandidate.category,
              role: 'optional',
              buyingPriority: '03 OPTIONAL',
              priorityLabel: 'Useful If Needed',
              recommendedPlan: optPlan?.label || 'Pro',
              monthlyCostPerSeat: optCost,
              estimatedMonthlyCostPerTeam: optTeamCost,
              workflowFitScore: WorkflowEngine.calculateSuitability(searchCandidate.raw, 'research'),
              capabilityHighlights: searchCandidate.raw.strengths?.slice(0, 3) || ['Real-time search grounding', 'Verified web citations'],
              whyRecommended: 'Dedicated real-time web retrieval with synthetic citations. Add if your workflow requires daily market, documentation, or legal web intelligence.',
              uniqueValueAdded: 'Live internet citation intelligence.',
              whatItComplements: `Complements ${primarySeed.name} with real-time web retrieval and verified source citations.`,
              mainTradeoff: 'Adds seat cost only if daily internet-grounded search is required.',
              procurementFitReasons: {
                domainFit: 'Specialized search grounding for up-to-date documentation and web data.',
                workflowFit: 'Replaces manual search engine queries with synthesized AI summaries.',
                teamFit: `Optional add-on for specialized researchers on the ${teamSize}-person team.`,
                budgetFit: `Adds $${optTeamCost}/mo if rolled out team-wide.`
              },
              missingCapabilities: ['In-editor code refactoring', 'Deep IDE AST integration'],
              procurementRisks: ['Duplicate web search capabilities if already using ChatGPT Search'],
              bestFor: 'Teams doing heavy market intelligence, compliance tracking, or live web documentation queries.',
              notIdealFor: 'Teams with zero need for real-time external internet search grounding.',
              purchaseDecision: 'OPTIONAL_ADDON',
              featuresCovered: ['live-web-research']
            };

            activeStackProfiles.push(searchCandidate);
            stackTools.push(optionalTool);
            currentStackMonthlyCost += optTeamCost;
          }
        }
      }

      // ── 04 DEVELOPER API LAYER ──────────────────────────────────
      const wantsApi = requirements.includes('developer-api-access') || requirements.includes('api-access') || requirements.includes('api-integration');

      if (wantsApi) {
        const apiCandidate = allApiProviders[0];
        if (apiCandidate) {
          const apiPlan = apiCandidate.plans[0];
          let apiCost = apiPlan?.monthlyPricePerSeat ?? 20;

          // Adjust pay-as-you-go token allocation to fit within the remaining procurement ceiling
          if (req.monthlyBudget !== null && req.monthlyBudget > 0) {
            const remainingBudgetForApi = Math.max(0, req.monthlyBudget - currentStackMonthlyCost);
            const maxApiPerSeat = Math.floor(remainingBudgetForApi / Math.max(1, teamSize));
            if (maxApiPerSeat > 0 && maxApiPerSeat < apiCost) {
              apiCost = maxApiPerSeat;
            }
          }

          const apiTeamCost = apiCost * teamSize;
          const wouldExceedBudget = req.monthlyBudget !== null && req.monthlyBudget > 0 && (currentStackMonthlyCost + apiTeamCost > req.monthlyBudget);

          if (!wouldExceedBudget || strategy === 'max-performance') {
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
              workflowFitScore: WorkflowEngine.calculateSuitability(apiCandidate.raw, 'ai-engineering'),
              capabilityHighlights: apiCandidate.raw.strengths?.slice(0, 3) || ['Direct developer API keys', 'High-throughput function calling'],
              whyRecommended: 'Provides programmatic developer API keys and function calling infrastructure for building custom backend pipelines.',
              uniqueValueAdded: 'Programmatic model inference and embedding pipelines.',
              whatItComplements: `Complements ${primarySeed.name} by providing backend API endpoints for autonomous workflows.`,
              mainTradeoff: 'Requires software engineering integration and token usage monitoring.',
              procurementFitReasons: {
                domainFit: 'Developer API endpoints for custom software integration and automation.',
                workflowFit: 'Decoupled programmatic access for backend services and AI agents.',
                teamFit: 'Usage-based token billing shared across the entire team.',
                budgetFit: `Allocated $${apiTeamCost}/mo in token budget within the total procurement ceiling.`
              },
              missingCapabilities: ['Human conversational desktop UI', 'IDE inline completion extension'],
              procurementRisks: ['Uncapped token cost spikes without billing limits'],
              bestFor: 'Engineering teams building custom internal AI tools, embeddings, and agent pipelines.',
              notIdealFor: 'Teams looking exclusively for human interactive desktop subscriptions.',
              purchaseDecision: 'INFRASTRUCTURE_ONLY',
              featuresCovered: ['developer-api-access']
            };

            activeStackProfiles.push(apiCandidate);
            stackTools.push(apiTool);
            currentStackMonthlyCost += apiTeamCost;
          }
        }
      }
    }

    // Compute Totals
    const totalMonthlyCost = stackTools.reduce((sum, t) => sum + t.estimatedMonthlyCostPerTeam, 0);
    const totalAnnualCost = totalMonthlyCost * 12;
    const perSeatMonthlyCost = stackTools.reduce((sum, t) => sum + t.monthlyCostPerSeat, 0);

    const coverageResult = StackCoverageAnalyzer.analyze(activeStackProfiles, requirements);
    const workflowFitScore = Math.round(
      stackTools.reduce((sum, t) => sum + t.workflowFitScore, 0) / stackTools.length
    );
    const capabilityCoverageScore = Math.round(
      activeStackProfiles.reduce((sum, p) => sum + p.benchmarkScore, 0) / activeStackProfiles.length
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

    const confidenceScore = Math.min(100, Math.round(
      workflowMatchFactor * (cfWeights.workflowMatch || 0.30) +
      featureCoverageFactor * (cfWeights.featureCoverage || 0.25) +
      budgetFitFactor * (cfWeights.budgetFit || 0.15) +
      capabilitySuperiorityFactor * (cfWeights.capabilitySuperiority || 0.10) +
      securityMatchFactor * (cfWeights.securityMatch || 0.10) +
      vendorStabilityFactor * (cfWeights.vendorStability || 0.05) +
      futureGrowthFactor * (cfWeights.futureGrowth || 0.05)
    ));

    const advantages = this.deriveAdvantages(primaryTool, stackTools.find(t => t.role === 'secondary'), stackTools.find(t => t.role === 'optional'), stackTools.find(t => t.role === 'api'), strategy);
    const tradeoffs = this.deriveTradeoffs(stackTools, req, strategy);
    const whyThisStack = customStrategicReason || this.deriveWhyThisStack(primaryTool, stackTools.find(t => t.role === 'secondary'), stackTools.find(t => t.role === 'optional'), stackTools.find(t => t.role === 'api'), domain, strategy, teamSize, totalMonthlyCost);

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
        futureGrowth: futureGrowthFactor
      },
      whyThisStack,
      advantages,
      tradeoffs,
      budgetStatus,
      budgetOverrunPercent,
      bestFor: `Teams seeking a ${strategy === 'best-value' ? 'cost-optimized' : strategy === 'enterprise-security' ? 'security-hardened' : 'high-velocity'} setup for ${domainLabel}.`
    };
  }

  // ── Plan Selection Helper (with Strict Budget Enforcement) ─────────────────

  private static selectOptimalPlan(
    p: ScoredProviderProfile,
    teamSize: number,
    strategy: StackStrategy,
    monthlyBudget: number | null
  ) {
    if (!p.plans || p.plans.length === 0) return null;

    const isFreeBudget = monthlyBudget === 0;
    const paidPlans = p.plans.filter(pl => pl.monthlyPricePerSeat > 0);
    const freePlans = p.plans.filter(pl => pl.monthlyPricePerSeat === 0 && pl.id !== 'enterprise');

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

    // 1. Enterprise Security Strategy or Large Teams (>= 20 seats)
    if (strategy === 'enterprise-security' || teamSize >= 20) {
      const teamPlan = candidatePlans.find(pl => (pl.id === 'teams' || pl.id === 'team' || pl.id === 'business') && pl.monthlyPricePerSeat > 0);
      if (teamPlan) return teamPlan;
      const entPlan = candidatePlans.find(pl => pl.id === 'enterprise');
      if (entPlan) return entPlan;
      return candidatePlans[candidatePlans.length - 1];
    }

    // 2. Best Value Strategy: Pick most cost-effective paid commercial tier
    if (strategy === 'best-value') {
      return [...candidatePlans].sort((a, b) => a.monthlyPricePerSeat - b.monthlyPricePerSeat)[0];
    }

    // 3. Max Performance Strategy: Pick the highest tier paid plan that fits within budget
    if (strategy === 'max-performance') {
      return [...candidatePlans].sort((a, b) => b.monthlyPricePerSeat - a.monthlyPricePerSeat)[0];
    }

    // 4. Default Balanced Strategy: Standard professional tier within budget
    const proPlan = candidatePlans.find(pl => pl.id === 'pro' || pl.id === 'plus' || pl.id === 'individual' || pl.id === 'moderato');
    if (proPlan) return proPlan;

    return candidatePlans[0];
  }

  private static isComplementaryCategory(catA: string, catB: string, domain: string): boolean {
    if (catA === catB) return false;

    if (catA === 'ide') {
      return catB === 'chat' || catB === 'search';
    }
    if (catA === 'chat') {
      return (catB === 'ide' && (domain === 'software-engineering' || domain === 'ai-data-ml')) || catB === 'search';
    }
    if (catA === 'search') {
      return catB === 'chat' || catB === 'ide';
    }
    return false;
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
    if (secondary) {
      list.push(`Companion synergy: ${secondary.toolName} eliminates reasoning and drafting bottlenecks.`);
    }
    if (optional) {
      list.push(`Live citations: ${optional.toolName} adds real-time search grounding.`);
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
    const wouldHaveCovered = StackCoverageAnalyzer.newFeaturesCovered(
      p,
      bestStack.tools.map(t => allScored.find(s => s.id === t.toolId)! ).filter(Boolean),
      requirements
    );

    let rejectionCategory: RejectionCategory = 'LOWER_BENCHMARK';
    let rejectionBadge = 'Lower Benchmark Fit';
    let consideredFor = `Considered for ${p.category.toUpperCase()} capabilities in ${DOMAIN_LABELS[domain] || domain}.`;
    let whyNotSelected = `Lower composite suitability (${compositeScore}%) compared to ${primary.toolName} (${bestStack.confidenceScore}%).`;
    let whereItWins = p.raw.strengths?.[0] || 'Competitive baseline capabilities';
    let whyWinnerWon = `${primary.toolName} achieved higher domain velocity and requirement coverage.`;
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
    } else if (sameCatTool) {
      rejectionCategory = 'REDUNDANCY';
      rejectionBadge = 'Redundant with Stack';
      consideredFor = `Considered for the ${sameCatTool.role.toUpperCase()} role in the stack.`;
      whyNotSelected = `Functionally overlaps with ${sameCatTool.toolName} (${sameCatTool.role} role). ${sameCatTool.toolName} achieved higher overall composite suitability for your workflow.`;
      whereItWins = p.raw.strengths?.[0] || 'Alternative pricing or model selection.';
      whyWinnerWon = `${sameCatTool.toolName} scored higher in domain suitability and ecosystem integration.`;
      bestFor = `Teams already committed to the ${p.vendor} ecosystem.`;
      notIdealFor = `Teams looking to avoid duplicate ${sameCatTool.category.toUpperCase()} subscriptions.`;
    } else if (domainScore < 50) {
      rejectionCategory = 'DOMAIN_MISMATCH';
      rejectionBadge = 'Domain Mismatch';
      consideredFor = `General-purpose AI capabilities.`;
      whyNotSelected = `This tool is tailored for other workflows, scoring only ${domainScore}% suitability for ${DOMAIN_LABELS[domain] || domain}.`;
      whereItWins = p.raw.strengths?.[0] || 'General conversational assistance.';
      whyWinnerWon = `${primary.toolName} is specifically designed for ${DOMAIN_LABELS[domain] || domain} execution.`;
      bestFor = 'General productivity or alternative domain workflows.';
      notIdealFor = `${DOMAIN_LABELS[domain] || domain} core daily operations.`;
    } else if (req.monthlyBudget !== null && cheapestPlan * req.teamSize > req.monthlyBudget) {
      rejectionCategory = 'BUDGET_OVERRUN';
      rejectionBadge = 'Budget Ceiling Overrun';
      consideredFor = `High-tier capability suite.`;
      whyNotSelected = `Base plan cost ($${cheapestPlan * req.teamSize}/mo for ${req.teamSize} seats) exceeds your $${req.monthlyBudget}/mo budget ceiling.`;
      whereItWins = 'Advanced capability features.';
      whyWinnerWon = `${primary.toolName} delivers strong coverage within the target spend limit.`;
      bestFor = 'Larger budget teams willing to invest in premium tier licenses.';
      notIdealFor = `Teams constrained to a $${req.monthlyBudget}/mo monthly spend limit.`;
    }

    const tradeoffVsSelected = `Offers alternative ${p.vendor} capabilities ($${cheapestPlan}/user/mo) but has lower domain synergy than ${primary.toolName}.`;

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

  private static readonly REQUIREMENT_CAPABILITIES: Record<string, Record<string, number>> = {
    'editor-code-generation': {
      'cursor': 100,
      'windsurf': 95,
      'github-copilot': 90,
      'codex': 85,
      'claude': 50,
      'chatgpt': 45,
      'deepseek': 45,
      'kimi': 40,
      'gemini': 40,
      'perplexity': 25,
      'anthropic-api': 25,
      'openai-api': 25,
      'github-models': 25
    },
    'deep-reasoning-analysis': {
      'claude': 100,
      'chatgpt': 98,
      'deepseek': 95,
      'kimi': 95,
      'gemini': 88,
      'cursor': 75,
      'windsurf': 72,
      'github-copilot': 65,
      'perplexity': 80,
      'anthropic-api': 95,
      'openai-api': 95,
      'github-models': 88
    },
    'large-document-processing': {
      'gemini': 100,
      'kimi': 100,
      'claude': 95,
      'deepseek': 80,
      'chatgpt': 75,
      'cursor': 55,
      'windsurf': 55,
      'github-copilot': 45,
      'perplexity': 65,
      'anthropic-api': 90,
      'openai-api': 80,
      'github-models': 75
    },
    'live-web-research': {
      'perplexity': 100,
      'chatgpt': 95,
      'gemini': 88,
      'claude': 55,
      'kimi': 60,
      'deepseek': 55,
      'cursor': 40,
      'windsurf': 40,
      'github-copilot': 35,
      'anthropic-api': 20,
      'openai-api': 20,
      'github-models': 20
    },
    'visual-design': {
      'chatgpt': 100,
      'gemini': 98,
      'claude': 95,
      'kimi': 70,
      'deepseek': 55,
      'cursor': 45,
      'windsurf': 45,
      'github-copilot': 40,
      'perplexity': 50,
      'anthropic-api': 60,
      'openai-api': 70,
      'github-models': 50
    },
    'visual-diagram-understanding': {
      'chatgpt': 100,
      'gemini': 98,
      'claude': 95,
      'kimi': 70,
      'deepseek': 55,
      'cursor': 45,
      'windsurf': 45,
      'github-copilot': 40,
      'perplexity': 50,
      'anthropic-api': 60,
      'openai-api': 70,
      'github-models': 50
    },
    'automated-task-execution': {
      'windsurf': 100,
      'cursor': 92,
      'github-copilot': 65,
      'claude': 45,
      'chatgpt': 40,
      'gemini': 35,
      'deepseek': 35,
      'kimi': 35,
      'perplexity': 20,
      'anthropic-api': 30,
      'openai-api': 30,
      'github-models': 25
    },
    'developer-api-access': {
      'anthropic-api': 100,
      'openai-api': 100,
      'github-models': 95,
      'deepseek': 85,
      'claude': 40,
      'chatgpt': 40,
      'gemini': 40,
      'cursor': 25,
      'windsurf': 25,
      'github-copilot': 30,
      'perplexity': 30
    },
    'enterprise-governance': {
      'chatgpt': 98,
      'claude': 98,
      'github-copilot': 95,
      'gemini': 95,
      'perplexity': 90,
      'anthropic-api': 90,
      'openai-api': 90,
      'github-models': 90,
      'deepseek': 65,
      'cursor': 65,
      'windsurf': 60,
      'kimi': 55
    }
  };

  private static computeRequirementCapabilityScore(providerId: string, requirements: string[]): number {
    // When no requirements are specified, compute the provider's average baseline capability
    // across ALL known requirement dimensions (rather than returning a uniform 100 for all).
    // This ensures that ADDING a specific requirement produces a non-zero delta for providers
    // that excel at that requirement — enabling requirement ablation verification.
    if (!requirements || requirements.length === 0) {
      const allMaps = Object.values(this.REQUIREMENT_CAPABILITIES);
      if (allMaps.length === 0) return 75;
      let baseTotal = 0;
      let baseCounted = 0;
      for (const map of allMaps) {
        if (map[providerId] !== undefined) {
          baseTotal += map[providerId];
          baseCounted++;
        }
      }
      return baseCounted > 0 ? Math.round(baseTotal / baseCounted) : 75;
    }

    let total = 0;
    let counted = 0;

    for (const req of requirements) {
      const map = this.REQUIREMENT_CAPABILITIES[req];
      if (map) {
        total += map[providerId] ?? 50;
        counted++;
      }
    }

    return counted > 0 ? Math.round(total / counted) : 75;
  }

  public static getCompositeScore(
    p: ScoredProviderProfile,
    req: StackBuilderRequest,
    weights: any,
    strategy: StackStrategy = 'balanced'
  ): number {
    const domain = req.domain || req.primaryWorkflow || 'general-productivity';
    const requirements = req.requirements || req.mustHaveFeatures || [];

    const domainScore = WorkflowEngine.calculateSuitability(p.raw, domain);
    const reqCapabilityScore = this.computeRequirementCapabilityScore(p.id, requirements);
    const capabilityScore = this.computeDomainCapabilityScore(p, domain);
    const costEffScore = p.costEfficiencyScore;
    const entScore = p.enterpriseScore;
    const stabScore = p.vendorStabilityScore;

    let rawScore = 0;

    // REAL DIVERGENT STRATEGY SCORING OBJECTIVES
    if (strategy === 'best-value') {
      // Best Value: Cost 40%, Requirement Coverage 25%, Domain Fit 15%, Productivity 10%, Performance 10%
      rawScore =
        costEffScore * 0.40 +
        reqCapabilityScore * 0.25 +
        domainScore * 0.15 +
        p.futureGrowthScore * 0.10 +
        capabilityScore * 0.10;
    } else if (strategy === 'max-performance') {
      // Max Performance: Capability / Benchmarks 35%, Requirement Coverage 25%, Reasoning 20%, Domain Fit 15%, Cost 5%
      rawScore =
        p.benchmarkScore * 0.35 +
        reqCapabilityScore * 0.25 +
        p.reasoningScore * 0.20 +
        domainScore * 0.15 +
        costEffScore * 0.05;
    } else if (strategy === 'enterprise-security') {
      // Enterprise Security: Security / Governance 35%, Requirement Coverage 25%, Vendor Stability 15%, Domain Fit 15%, Cost 10%
      rawScore =
        p.securityScore * 0.35 +
        reqCapabilityScore * 0.25 +
        stabScore * 0.15 +
        domainScore * 0.15 +
        costEffScore * 0.10;
    } else {
      // Balanced: Domain Fit 25%, Requirement Coverage 25%, Performance 20%, Productivity 15%, Cost 15%
      rawScore =
        domainScore * 0.25 +
        reqCapabilityScore * 0.25 +
        p.benchmarkScore * 0.20 +
        p.futureGrowthScore * 0.15 +
        costEffScore * 0.15;
    }

    rawScore += this.getPreferenceModifiersNet(p, req, weights);

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

  private static getPreferenceModifiersNet(p: ScoredProviderProfile, req: StackBuilderRequest, weights: any): number {
    let modifier = 0;
    const pref = weights.preferenceModifiers || {};

    if (req.preferences?.avoidLockIn) {
      if (p.raw.financialProfile?.vendorLockInRisk === 'High') {
        modifier += pref.avoidLockIn?.penalty ?? -10;
      }
    }

    if (req.preferences?.preferOpenSource) {
      if (p.raw.apiSupport) {
        modifier += pref.preferOpenSource?.bonus ?? 8;
      }
    }

    if (req.preferences?.preferEstablishedVendors) {
      if (p.vendorStabilityScore < 50) {
        modifier += pref.preferEstablishedVendors?.penalty ?? -10;
      }
    }

    if (req.preferences?.requireZeroRetention) {
      const hasZDR = p.raw.enterprise?.security?.zeroDataRetention;
      if (!hasZDR) {
        modifier += pref.requireZeroRetention?.penalty ?? -25;
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
    const minCost = p.plans.length > 0 ? Math.min(...p.plans.map(pl => pl.monthlyPricePerSeat)) : 0;
    return minCost * req.teamSize <= req.monthlyBudget;
  }
}
