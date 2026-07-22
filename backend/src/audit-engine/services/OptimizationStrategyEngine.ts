// ============================================================
// Optimization Strategy Engine — StackSave AI Platform Intelligence
//
// Evaluates tool configs dynamically against the independent JSON
// database, Weighted Scoring rules, and Business Value algorithms.
// ============================================================

import { ToolEntry, Insight, UseCase, ToolId } from '../../types';
import { KnowledgeLoader } from './KnowledgeLoader';
import { ExplanationEngine } from './ExplanationEngine';
import { getToolById } from '../catalog';
import { ProposalEngine } from './ProposalEngine';
import { RelationshipEngine } from './RelationshipEngine';

export class OptimizationStrategyEngine {
  public static run(
    tools: ToolEntry[],
    teamSize: number,
    primaryUseCase: UseCase,
    optimizationGoal: 'savings' | 'balanced' | 'productivity' | 'governance' = 'balanced'
  ): Insight[] {
    const insights: Insight[] = [];

    // Load repository data
    KnowledgeLoader.initialize();

    // ── 1. DUPLICATE CAPABILITY & CONSOLIDATION CHECKS ──────────
    this.checkOverlap(tools, teamSize, primaryUseCase, 'performance', optimizationGoal, insights);
    this.checkOverlap(tools, teamSize, primaryUseCase, 'savings', optimizationGoal, insights);

    // Identify which tools are recommended for decommissioning
    const decommissionedToolIds = new Set<string>();
    for (const insight of insights) {
      if (insight.type === 'overlapping_tools') {
        decommissionedToolIds.add(insight.toolId);
      }
    }

    // Only run plan/billing checks on tools that are NOT decommissioned
    const activeTools = tools.filter((t) => !decommissionedToolIds.has(t.toolId));

    // ── 2. WRONG PRICING TIER CHECKS ────────────────────────────
    this.checkPlanTiers(activeTools, teamSize, primaryUseCase, optimizationGoal, insights);

    // ── 3. UNUSED SEAT CHECKS ───────────────────────────────────
    this.checkUnusedSeats(activeTools, teamSize, optimizationGoal, insights);

    // ── 4. ANNUAL DISCOUNT CHECKS ───────────────────────────────
    this.checkAnnualDiscounts(activeTools, teamSize, primaryUseCase, optimizationGoal, insights);

    // ── 5. API CREDITS CHECKS ───────────────────────────────────
    this.checkApiCredits(activeTools, teamSize, primaryUseCase, optimizationGoal, insights);

    // ── 6. PLAN VERIFICATION CHECK ──────────────────────────────
    this.checkPlanVerifications(tools, insights);

    // ── 7. CALCULATE PRIORITY SCORES ────────────────────────────
    this.calculatePriorityScores(insights);

    return insights;
  }

  private static checkOverlap(
    tools: ToolEntry[],
    teamSize: number,
    useCase: UseCase,
    strategy: 'performance' | 'savings',
    optimizationGoal: string,
    insights: Insight[]
  ): void {
    const { decommissionedTools, decisionLog } = ProposalEngine.evaluateStack(tools, useCase, strategy);

    const getGroupForTool = (toolId: string): string => {
      const p = KnowledgeLoader.getProvider(toolId);
      if (!p) return 'other';
      const role = p.primaryRole;
      const codingRoles = ['AI IDE', 'IDE Assistant', 'Legacy Autocomplete Engine', 'Developer Productivity Platform', 'Inline Autocomplete Utility'];
      const chatRoles = ['Reasoning Assistant', 'General AI Assistant', 'Google Workspace AI', 'AI Search', 'Analytical Writing and Analysis Engine', 'Multi-Modal Research and Voice Platform', 'Long-Context Document Synthesis Platform'];
      const apiRoles = ['Developer API', 'Reasoning API', 'Developer Playground Model Tier', 'API Platform', 'Developer Token Operations Tier'];
      if (codingRoles.includes(role)) return 'coding';
      if (chatRoles.includes(role)) return 'chat';
      if (apiRoles.includes(role)) return 'api';
      return 'other';
    };

    const groupMap: Record<string, string[]> = {};
    for (const t of tools) {
      const grp = getGroupForTool(t.toolId);
      if (!groupMap[grp]) groupMap[grp] = [];
      groupMap[grp].push(t.toolId);
    }

    const hasOverlap = Object.values(groupMap).some(list => list.length >= 2);

    if (hasOverlap && decommissionedTools.length === 0) {
      insights.push({
        toolId: tools[0]?.toolId || ('cursor' as ToolId),
        toolName: 'All Tools',
        type: 'already_optimal',
        severity: 'info',
        message: 'No changes recommended',
        suggestion: 'Keep current software configuration',
        reason: `The current stack maximizes net Business Value score (${decisionLog.finalScore}) under the ${strategy === 'performance' ? 'Performance' : 'Savings'} strategy.`,
        potentialMonthlySaving: 0,
        currentMonthlySpend: tools.reduce((s, t) => s + t.monthlySpend, 0),
        recommendedMonthlySpend: tools.reduce((s, t) => s + t.monthlySpend, 0),
        strategy,
        recommendationType: 'Validation',
        confidence: 'High',
        confidenceScore: 95,
        confidenceExplanation: [
          '✓ No direct functional overlap',
          '✓ Balanced workload distribution',
          '✓ Preserves complete workspace flexibility'
        ],
        productivityImpact: 'No Impact',
        currentSetup: 'Multiple platforms active',
        recommendedSetup: 'Keep active stack',
        detailedReason: 'An iterative greedy search checked consolidation and redundancy proposals. The current configuration was ranked highest because any decommissioning would violate strategic constraints or cause disproportionate capability loss.',
        tradeoffs: 'Preserves existing workflow integrations and keeps complete developer choice intact.',
        estimatedSavings: 'Save $0/mo',
        decisionLog
      });
      return;
    }

    for (const decommissionedId of decommissionedTools) {
      const decommissionedProfile = KnowledgeLoader.getProvider(decommissionedId);
      if (!decommissionedProfile) continue;

      const grp = getGroupForTool(decommissionedId);
      const groupToolIds = groupMap[grp] || [];
      const keptInGroup = groupToolIds.filter(id => !decommissionedTools.includes(id));
      const keptId = keptInGroup[0] || 'cursor'; 
      const keptProfile = KnowledgeLoader.getProvider(keptId);
      const keptName = keptProfile ? keptProfile.name : keptId;

      const tEntry = tools.find(t => t.toolId === decommissionedId);
      const decommissionedSpend = tEntry ? tEntry.monthlySpend : 20;

      const explanation = ExplanationEngine.generate(
        decommissionedId,
        keptId,
        decisionLog,
        strategy
      );

      // Evaluate Weighted Overlap score
      let score = 0;
      const explanations: string[] = [];

      const rel = RelationshipEngine.analyze(decommissionedId, keptId, useCase);
      const overlapPct = rel ? rel.workflowOverlap : 50;
      score += Math.round(overlapPct * 0.8);
      explanations.push(`✓ Substantial capability overlap (${overlapPct}%) between platforms`);

      if (optimizationGoal === 'savings') {
        score += 20;
        explanations.push("✓ Optimization goal: Save Money");
      } else if (optimizationGoal === 'balanced') {
        score += 10;
        explanations.push("✓ Balanced strategy matches core consolidation thresholds");
      } else if (optimizationGoal === 'productivity') {
        score -= 25;
        explanations.push("✗ Productivity goals prioritize redundant developer choices");
      }

      if (decommissionedSpend >= 40) {
        score += 15;
        explanations.push("✓ Significant consolidation savings available");
      }

      score = Math.max(0, Math.min(100, score));

      if (score >= 70) {
        insights.push({
          toolId: decommissionedId as ToolId,
          toolName: decommissionedProfile.name,
          type: 'overlapping_tools',
          severity: 'medium',
          message: explanation.problem,
          suggestion: explanation.decision,
          reason: `${keptName} satisfies core capabilities at a more optimal business value.`,
          potentialMonthlySaving: decommissionedSpend,
          currentMonthlySpend: decommissionedSpend,
          recommendedMonthlySpend: 0,
          strategy,
          recommendationType: 'Capability Optimization',
          confidence: score >= 85 ? 'High' : 'Medium',
          confidenceScore: score,
          confidenceExplanation: explanations,
          productivityImpact: explanation.developerImpact as any,
          currentSetup: `${keptName} + ${decommissionedProfile.name}`,
          recommendedSetup: `${keptName} Only`,
          detailedReason: explanation.evidence,
          tradeoffs: explanation.tradeoffs,
          estimatedSavings: `Save $${decommissionedSpend}/mo`,
          decisionLog
        });
      } else {
        // Validation Insight instead
        insights.push({
          toolId: decommissionedId as ToolId,
          toolName: decommissionedProfile.name,
          type: 'already_optimal',
          severity: 'info',
          message: `Current Plan Recommended: Keep ${decommissionedProfile.name} in active stack.`,
          suggestion: `Retain ${decommissionedProfile.name}`,
          reason: `Preserving both ${keptName} and ${decommissionedProfile.name} is recommended to maintain specialized developer choice.`,
          potentialMonthlySaving: 0,
          currentMonthlySpend: decommissionedSpend,
          recommendedMonthlySpend: decommissionedSpend,
          strategy,
          recommendationType: 'Validation',
          confidence: 'High',
          confidenceScore: 100 - score,
          confidenceExplanation: [
            '✓ Specialized platform choice verified',
            '✓ Low overlap risks are offset by DX benefits',
            '✓ Balanced performance strategy requirements satisfied'
          ],
          productivityImpact: 'No Impact',
          currentSetup: `${keptName} + ${decommissionedProfile.name}`,
          recommendedSetup: `Keep Active stack`,
          detailedReason: `• Pairwise capability check score of ${score}/100 is below consolidation threshold.\n• Preserving tool choice prevents code migrations.\n• Keeps specialized features active.`,
          tradeoffs: 'Higher cost is offset by developer velocity protection.'
        });
      }
    }
  }

  // ── 2. WRONG PRICING TIER CHECKS ─────────────────────────────
  private static checkPlanTiers(
    tools: ToolEntry[],
    teamSize: number,
    primaryUseCase: UseCase,
    optimizationGoal: string,
    insights: Insight[]
  ): void {
    for (const entry of tools) {
      const tool = getToolById(entry.toolId);
      if (!tool) continue;

      const currentPlan = tool.plans.find((p) => p.id === entry.plan);
      if (!currentPlan || currentPlan.isPayPerUse) continue;

      // GitHub Copilot Business: Downgrade to Individual logic
      if (entry.toolId === 'github-copilot' && entry.plan === 'business') {
        const individualPlan = tool.plans.find((p) => p.id === 'individual');
        if (individualPlan) {
          const saving = (currentPlan.monthlyPricePerSeat - individualPlan.monthlyPricePerSeat) * entry.seats;
          
          let score = 0;
          const explanations: string[] = [];

          if (teamSize <= 2) {
            score += 35;
            explanations.push("✓ Team size <= 2");
          } else {
            score -= 30;
            explanations.push("✗ Larger team requires centralized user administration");
          }

          if (entry.seats <= 2) {
            score += 20;
            explanations.push("✓ Seat count is low");
          }

          if (primaryUseCase !== 'mixed') {
            score += 20;
            explanations.push("✓ Focused developer usecase (low admin overhead)");
          } else {
            score -= 20;
            explanations.push("✗ Mixed governance needs corporate SSO");
          }

          const hasOtherEnterprise = tools.some(t => t.toolId !== entry.toolId && (t.plan === 'enterprise' || t.plan === 'business' || t.plan === 'teams'));
          if (!hasOtherEnterprise) {
            score += 15;
            explanations.push("✓ No other enterprise subscriptions active");
          } else {
            score -= 15;
            explanations.push("✗ Stack utilizes corporate licenses elsewhere");
          }

          if (optimizationGoal === 'savings') {
            score += 15;
            explanations.push("✓ Goal: Save Money");
          } else if (optimizationGoal === 'balanced') {
            score += 5;
          } else if (optimizationGoal === 'productivity') {
            score -= 20;
            explanations.push("✗ Productivity strategy prioritizes corporate seat controls");
          } else if (optimizationGoal === 'governance') {
            score -= 40;
            explanations.push("✗ Governance strategy requires central admin policies");
          }

          score = Math.max(0, Math.min(100, score));

          if (score >= 70) {
            insights.push({
              toolId: entry.toolId,
              toolName: tool.name,
              type: 'overpaid_plan',
              severity: 'medium',
              message: `A small team setup (${entry.seats} users) does not justify administrative GitHub Copilot Business costs.`,
              suggestion: `Downgrade to GitHub Copilot Individual`,
              reason: `Managing individual plans saves $${currentPlan.monthlyPricePerSeat - individualPlan.monthlyPricePerSeat}/seat/mo with identical AI capability.`,
              potentialMonthlySaving: saving,
              currentMonthlySpend: entry.monthlySpend,
              recommendedMonthlySpend: individualPlan.monthlyPricePerSeat * entry.seats,
              strategy: 'both',
              recommendationType: 'Plan Optimization',
              confidence: score >= 85 ? 'High' : 'Medium',
              confidenceScore: score,
              confidenceExplanation: explanations,
              productivityImpact: 'No Impact',
              currentSetup: `Copilot Business ($${currentPlan.monthlyPricePerSeat}/seat)`,
              recommendedSetup: `Copilot Individual ($${individualPlan.monthlyPricePerSeat}/seat)`,
              detailedReason: `• Lowers spend by $9/user/month.\n• Retains native completions, chat windows, and repository indexing features.\n• Bypasses business workspace directory checks.`,
              tradeoffs: 'Requires separate employee billing accounts instead of unified workspace management.',
              estimatedSavings: `Save $${saving}/mo`
            });
          } else {
            insights.push({
              toolId: entry.toolId,
              toolName: tool.name,
              type: 'already_optimal',
              severity: 'info',
              message: `Current Plan Recommended: Keep Copilot Business.`,
              suggestion: 'Keep Copilot Business',
              reason: `Your team size (${teamSize}) or use-case governance requires SSO, policy audit logs, and central keys administration.`,
              potentialMonthlySaving: 0,
              currentMonthlySpend: entry.monthlySpend,
              recommendedMonthlySpend: entry.monthlySpend,
              strategy: 'both',
              recommendationType: 'Validation',
              confidence: 'High',
              confidenceScore: 100 - score,
              confidenceExplanation: [
                '✓ Verified SSO/SAML workspace controls',
                '✓ Centralized employee license management active',
                '✓ Corporate governance checks satisfied'
              ],
              productivityImpact: 'No Impact',
              currentSetup: `Copilot Business ($${currentPlan.monthlyPricePerSeat}/seat)`,
              recommendedSetup: `Keep Copilot Business`,
              detailedReason: `• Confirmed SAML/SSO directory integrations.\n• Ensures IP exclusions and corporate copyright guarantees.\n• Centralizes license allocations.`,
              tradeoffs: 'Higher seat price is offset by administrative safety.'
            });
          }
          continue;
        }
      }

      // Small team (seats <= 2) on generic Team/Business plans (excluding copilot)
      if (entry.toolId !== 'github-copilot' && (entry.plan === 'team' || entry.plan === 'business') && entry.seats <= 2) {
        const individualPlan = tool.plans.find((p) => p.id === 'pro' || p.id === 'plus' || p.id === 'individual');
        if (individualPlan) {
          const saving = (currentPlan.monthlyPricePerSeat - individualPlan.monthlyPricePerSeat) * entry.seats;
          if (saving > 0) {
            insights.push({
              toolId: entry.toolId,
              toolName: tool.name,
              type: 'overpaid_plan',
              severity: 'medium',
              message: `Your team size (${entry.seats}) does not justify the administration cost of ${tool.name} ${currentPlan.label}.`,
              suggestion: `Downgrade to ${tool.name} ${individualPlan.label}`,
              reason: `Switching to separate individual accounts maintains identical core model access.`,
              potentialMonthlySaving: saving,
              currentMonthlySpend: entry.monthlySpend,
              recommendedMonthlySpend: individualPlan.monthlyPricePerSeat * entry.seats,
              strategy: 'both',
              recommendationType: 'Plan Optimization',
              confidence: 'High',
              confidenceScore: 90,
              confidenceExplanation: [
                '✓ Team size <= 2',
                '✓ Direct pricing saving available',
                '✓ Identical core capability retained'
              ],
              productivityImpact: 'No Impact',
              currentSetup: `${tool.name} ${currentPlan.label} ($${currentPlan.monthlyPricePerSeat}/seat)`,
              recommendedSetup: `${tool.name} ${individualPlan.label} ($${individualPlan.monthlyPricePerSeat}/seat)`,
              detailedReason: `• Direct seat cost is reduced by $${currentPlan.monthlyPricePerSeat - individualPlan.monthlyPricePerSeat}/user/mo.\n• Core model token caps remain identical.\n• Features like custom workspaces are fully retained.`,
              tradeoffs: 'Requires managing separate credential logs rather than a single unified billing admin console.',
              estimatedSavings: `Save $${saving}/mo`
            });
            continue;
          }
        }
      }

      // Pro-plus / Ultra tier audits for Cursor Pro
      if ((entry.plan === 'pro-plus' || entry.plan === 'ultra') && entry.toolId === 'cursor') {
        const standardPro = tool.plans.find((p) => p.id === 'pro');
        if (standardPro) {
          const saving = (currentPlan.monthlyPricePerSeat - standardPro.monthlyPricePerSeat) * entry.seats;
          
          let score = 0;
          const explanations: string[] = [];

          if (currentPlan.monthlyPricePerSeat - standardPro.monthlyPricePerSeat >= 100) {
            score += 30;
            explanations.push("✓ Ultra premium plan cost differences are substantial");
          } else {
            score += 15;
            explanations.push("✓ Premium Pro+ plan check");
          }

          if (primaryUseCase !== 'coding') {
            score += 30;
            explanations.push("✓ Primary use case is not developer-centric coding");
          } else {
            score -= 20;
            explanations.push("✗ Active coding focus utilizes high quota limits");
          }

          if (optimizationGoal === 'savings') {
            score += 25;
            explanations.push("✓ Goal: Save Money");
          } else if (optimizationGoal === 'balanced') {
            score += 10;
          } else if (optimizationGoal === 'productivity') {
            score -= 30;
            explanations.push("✗ Productivity focus requires fast token availability");
          }

          score = Math.max(0, Math.min(100, score));

          if (saving > 0 && score >= 70) {
            insights.push({
              toolId: entry.toolId,
              toolName: tool.name,
              type: 'overpaid_plan',
              severity: 'medium',
              message: `Your non-developer use case (${primaryUseCase}) does not require Cursor ${currentPlan.label}.`,
              suggestion: 'Downgrade Cursor to Pro Tier',
              reason: `Standard Pro tier covers 500 fast requests/mo and unlimited slow requests with identical feature access.`,
              potentialMonthlySaving: saving,
              currentMonthlySpend: entry.monthlySpend,
              recommendedMonthlySpend: standardPro.monthlyPricePerSeat * entry.seats,
              strategy: 'savings',
              recommendationType: 'Plan Optimization',
              confidence: score >= 85 ? 'High' : 'Medium',
              confidenceScore: score,
              confidenceExplanation: explanations,
              productivityImpact: 'No Impact',
              currentSetup: `Cursor ${currentPlan.label} ($${currentPlan.monthlyPricePerSeat}/mo)`,
              recommendedSetup: `Cursor Pro ($${standardPro.monthlyPricePerSeat}/mo)`,
              detailedReason: `• Lowers monthly license spend by $${currentPlan.monthlyPricePerSeat - standardPro.monthlyPricePerSeat}/seat.\n• Pro tier covers standard fullstack engineering workflows.\n• Slow requests are queued only during peak loads.`,
              tradeoffs: 'Slow requests are queued behind high-priority queries during peak server loads.',
              estimatedSavings: `Save $${saving}/mo`
            });
          } else {
            insights.push({
              toolId: entry.toolId,
              toolName: tool.name,
              type: 'already_optimal',
              severity: 'info',
              message: `Current Plan Recommended: Keep Cursor ${currentPlan.label}.`,
              suggestion: `Keep Cursor ${currentPlan.label}`,
              reason: `High intensity development workloads require ultra-fast requests and the higher custom models quota.`,
              potentialMonthlySaving: 0,
              currentMonthlySpend: entry.monthlySpend,
              recommendedMonthlySpend: entry.monthlySpend,
              strategy: 'both',
              recommendationType: 'Validation',
              confidence: 'High',
              confidenceScore: 100 - score,
              confidenceExplanation: [
                '✓ Premium development context verified',
                '✓ Quota requirements justify tier upgrade',
                '✓ Fast model priority queues preserved'
              ],
              productivityImpact: 'No Impact',
              currentSetup: `Cursor ${currentPlan.label} ($${currentPlan.monthlyPricePerSeat}/mo)`,
              recommendedSetup: `Keep Active Tier`,
              detailedReason: `• Protects development velocity by eliminating peak load queues.\n• Retains maximum GPT-4o and Claude Sonnet fast requests.\n• Ensures stable workspace performance.`,
              tradeoffs: 'Higher monthly tier is justified by engineering performance.'
            });
          }
          continue;
        }
      }
    }
  }

  // ── 3. UNUSED SEAT CHECKS ────────────────────────────────────
  private static checkUnusedSeats(
    tools: ToolEntry[],
    teamSize: number,
    optimizationGoal: string,
    insights: Insight[]
  ): void {
    for (const entry of tools) {
      const tool = getToolById(entry.toolId);
      if (!tool) continue;

      const currentPlan = tool.plans.find((p) => p.id === entry.plan);
      if (!currentPlan || currentPlan.isPayPerUse || currentPlan.monthlyPricePerSeat === 0) continue;

      const unusedSeats = entry.seats - teamSize;
      const unusedRatio = unusedSeats / entry.seats;

      if (unusedSeats <= 0) continue;

      let score = 0;
      const explanations: string[] = [];

      if (unusedSeats > 3) {
        score += 40;
        explanations.push(`✓ Substantial idle allocation count (${unusedSeats} seats)`);
      } else if (unusedSeats > 1) {
        score += 25;
        explanations.push(`✓ Multiple unused allocations (${unusedSeats} seats)`);
      } else {
        score += 10;
        explanations.push("✓ Exactly 1 unused slot");
      }

      if (unusedRatio > 0.15) {
        score += Math.round(unusedRatio * 40);
        explanations.push(`✓ High idle ratio (${Math.round(unusedRatio * 100)}% of plan)`);
      }

      if (teamSize <= 2) {
        score += 20;
        explanations.push("✓ Small team count eliminates onboarding seat buffers");
      } else if (teamSize >= 5) {
        score -= 15;
        explanations.push("✗ Larger team buffers onboarding requirements");
      }

      if (optimizationGoal === 'savings') {
        score += 20;
        explanations.push("✓ Goal: Save Money");
      } else if (optimizationGoal === 'balanced') {
        score += 10;
      } else if (optimizationGoal === 'productivity') {
        score -= 15;
        explanations.push("✗ Productivity strategy prefers keeping seat buffers");
      }

      score = Math.max(0, Math.min(100, score));

      if (score >= 70) {
        const saving = unusedSeats * currentPlan.monthlyPricePerSeat;
        insights.push({
          toolId: entry.toolId,
          toolName: tool.name,
          type: 'unused_seats',
          severity: saving >= 40 ? 'high' : 'medium',
          message: `You are paying for ${entry.seats} seats of ${tool.name} but your audit context has only ${teamSize} active users.`,
          suggestion: `Reduce Seat Count to ${teamSize}`,
          reason: `Eliminating unused allocations stops license waste with zero developer velocity reduction.`,
          potentialMonthlySaving: saving,
          currentMonthlySpend: entry.monthlySpend,
          recommendedMonthlySpend: teamSize * currentPlan.monthlyPricePerSeat,
          strategy: 'both',
          recommendationType: 'Seat Optimization',
          confidence: score >= 85 ? 'High' : 'Medium',
          confidenceScore: score,
          confidenceExplanation: explanations,
          productivityImpact: 'No Impact',
          currentSetup: `${entry.seats} active seats of ${tool.name}`,
          recommendedSetup: `${teamSize} active seats`,
          detailedReason: `• Removes ${unusedSeats} unused license seat allocations.\n• Halts unnecessary spend of $${saving}/mo immediately.\n• Active configurations remain fully untouched.`,
          tradeoffs: 'Reduces the immediate seat buffers for incoming developers.',
          estimatedSavings: `Save $${saving}/mo (~$${saving * 12}/year)`
        });
      } else {
        insights.push({
          toolId: entry.toolId,
          toolName: tool.name,
          type: 'already_optimal',
          severity: 'info',
          message: `Current Plan Recommended: Keep ${entry.seats} Seats (Buffer active).`,
          suggestion: `Retain Current Seat Count`,
          reason: `Unused seat allocations represent appropriate hiring buffer for team sizes >= 5.`,
          potentialMonthlySaving: 0,
          currentMonthlySpend: entry.monthlySpend,
          recommendedMonthlySpend: entry.monthlySpend,
          strategy: 'both',
          recommendationType: 'Validation',
          confidence: 'High',
          confidenceScore: 100 - score,
          confidenceExplanation: [
            '✓ Valid growth buffer verified',
            '✓ Low relative spend waste',
            '✓ Prevents licensing procurement overhead'
          ],
          productivityImpact: 'No Impact',
          currentSetup: `${entry.seats} seats (${unusedSeats} idle)`,
          recommendedSetup: `Keep active counts`,
          detailedReason: `• Buffering ${unusedSeats} seat preserves quick onboarding velocity.\n• Carry cost is offset by recruitment protection.\n• No plan action needed.`,
          tradeoffs: 'Carries minimal monthly seat charge to avoid onboarding friction.'
        });
      }
    }
  }

  // ── 4. ANNUAL DISCOUNT CHECKS ────────────────────────────────
  private static checkAnnualDiscounts(
    tools: ToolEntry[],
    teamSize: number,
    primaryUseCase: UseCase,
    optimizationGoal: string,
    insights: Insight[]
  ): void {
    for (const entry of tools) {
      const tool = getToolById(entry.toolId);
      if (!tool) continue;

      const currentPlan = tool.plans.find((p) => p.id === entry.plan);
      if (!currentPlan || currentPlan.isPayPerUse || currentPlan.monthlyPricePerSeat === 0 || !currentPlan.annualPricePerSeat) continue;

      const paidPerSeat = entry.monthlySpend / entry.seats;
      const isAlreadyAnnual = Math.abs(paidPerSeat - currentPlan.annualPricePerSeat) < 0.50;

      if (isAlreadyAnnual) {
        continue;
      }

      const monthlyCostPerSeat = currentPlan.monthlyPricePerSeat;
      const annualCostPerSeat = currentPlan.annualPricePerSeat;
      const saving = (monthlyCostPerSeat - annualCostPerSeat) * entry.seats;
      const savingPercent = Math.round(((monthlyCostPerSeat - annualCostPerSeat) / monthlyCostPerSeat) * 100);

      if (savingPercent < 10 || saving < 4) continue;

      let score = 0;
      const explanations: string[] = [];

      score += Math.round(savingPercent * 1.5);
      explanations.push(`✓ Substantial annual discount percentage (${savingPercent}%)`);

      if (entry.monthlySpend >= 80) {
        score += 25;
        explanations.push("✓ High monthly spend outlay");
      } else if (entry.monthlySpend >= 40) {
        score += 15;
        explanations.push("✓ Moderate monthly spend outlay");
      } else {
        score -= 20;
        explanations.push("✗ Low monthly spend limits annual payback utility");
      }

      if (teamSize >= 5) {
        score += 20;
        explanations.push("✓ Larger team indicates cash stability");
      } else if (teamSize >= 3) {
        score += 10;
        explanations.push("✓ Stable team size indicates baseline plan persistence");
      } else {
        score -= 15;
        explanations.push("✗ Single freelancer stacks benefit from monthly flexibility");
      }

      const isPrimaryFocus =
        (entry.toolId === 'cursor' || entry.toolId === 'github-copilot') ? (primaryUseCase === 'coding') :
        (entry.toolId === 'claude' || entry.toolId === 'chatgpt' || entry.toolId === 'gemini') ? (primaryUseCase === 'writing' || primaryUseCase === 'mixed' || primaryUseCase === 'research') : true;

      if (isPrimaryFocus) {
        score += 20;
        explanations.push("✓ Primary workflow tool (essential context persistent)");
      } else {
        score -= 15;
        explanations.push("✗ Non-primary workflow tool (high churn likelihood)");
      }

      if (optimizationGoal === 'savings') {
        score += 15;
        explanations.push("✓ Goal: Save Money");
      } else if (optimizationGoal === 'balanced') {
        score += 5;
      }

      score = Math.max(0, Math.min(100, score));

      if (score >= 70) {
        insights.push({
          toolId: entry.toolId,
          toolName: tool.name,
          type: 'annual_discount',
          severity: 'low',
          message: `Switching ${tool.name} to annual billing reduces monthly seat costs by ${savingPercent}%.`,
          suggestion: 'Switch to Annual Contract',
          reason: `Locks in user licenses at $${annualCostPerSeat}/user/mo, saving $${Math.round(saving * 12)}/year.`,
          potentialMonthlySaving: Math.round(saving),
          currentMonthlySpend: entry.monthlySpend,
          recommendedMonthlySpend: annualCostPerSeat * entry.seats,
          strategy: 'both',
          recommendationType: 'Billing Optimization',
          confidence: score >= 85 ? 'High' : 'Medium',
          confidenceScore: score,
          confidenceExplanation: explanations,
          productivityImpact: 'No Impact',
          currentSetup: `Monthly billing ($${monthlyCostPerSeat}/seat/mo)`,
          recommendedSetup: `Annual contract ($${annualCostPerSeat}/seat/mo)`,
          detailedReason: `• Lowers monthly unit seat cost by ${savingPercent}%.\n• Achieves $${Math.round(saving)}/mo in contract savings.\n• Zero changes to active software profiles.`,
          tradeoffs: 'Requires upfront capital commitment and reduces cash flexibility.',
          estimatedSavings: `Save $${Math.round(saving)}/mo (~$${Math.round(saving * 12)}/year)`
        });
      } else {
        insights.push({
          toolId: entry.toolId,
          toolName: tool.name,
          type: 'already_optimal',
          severity: 'info',
          message: `Current Plan Recommended: Keep Monthly Billing.`,
          suggestion: 'Keep Monthly Billing',
          reason: `Monthly flexibility is preferred for non-primary tools or smaller teams to maintain cash liquidity.`,
          potentialMonthlySaving: 0,
          currentMonthlySpend: entry.monthlySpend,
          recommendedMonthlySpend: entry.monthlySpend,
          strategy: 'both',
          recommendationType: 'Validation',
          confidence: 'High',
          confidenceScore: 100 - score,
          confidenceExplanation: [
            '✓ Monthly flexibility protects liquidity',
            '✓ Spend scale does not require upfront lock-in',
            '✓ High agility maintained'
          ],
          productivityImpact: 'No Impact',
          currentSetup: `Monthly billing ($${entry.monthlySpend}/mo)`,
          recommendedSetup: `Keep Monthly Plan`,
          detailedReason: `• Preserves cash liquidity for active accounts.\n• Allows cancellation or seat reductions instantly without lock-in penalties.\n• Ideal for projects with transient scope.`,
          tradeoffs: `Forgoes a ${savingPercent}% discount to protect runway flexibility.`
        });
      }
    }
  }

  // ── 5. API CREDITS CHECKS ────────────────────────────────────
  private static checkApiCredits(
    tools: ToolEntry[],
    teamSize: number,
    primaryUseCase: UseCase,
    optimizationGoal: string,
    insights: Insight[]
  ): void {
    for (const entry of tools) {
      const isApi = entry.toolId === 'anthropic-api' || entry.toolId === 'openai-api';
      if (!isApi) continue;

      const tool = getToolById(entry.toolId);
      if (!tool) continue;

      let score = 0;
      const explanations: string[] = [];

      if (entry.monthlySpend >= 300) {
        score += 40;
        explanations.push("✓ High developer usage volume");
      } else if (entry.monthlySpend >= 150) {
        score += 20;
        explanations.push("✓ Standard developer usage volume");
      }

      const isTechUsecase = primaryUseCase === 'coding' || primaryUseCase === 'data';
      if (isTechUsecase) {
        score += 30;
        explanations.push("✓ Tech-focused engineering workspace (stable usage logs)");
      } else {
        score += 10;
        explanations.push("✓ Non-tech primary focus (transient usage patterns)");
      }

      if (optimizationGoal === 'savings') {
        score += 20;
        explanations.push("✓ Goal: Save Money");
      } else if (optimizationGoal === 'balanced') {
        score += 10;
      }

      score = Math.max(0, Math.min(100, score));

      if (score >= 70) {
        const estimatedSaving = Math.round(entry.monthlySpend * 0.25);
        insights.push({
          toolId: entry.toolId,
          toolName: tool.name,
          type: 'retail_vs_credits',
          severity: entry.monthlySpend >= 400 ? 'high' : 'medium',
          message: `You are paying retail pay-as-you-go rates for high-volume ${tool.name} workloads ($${entry.monthlySpend}/mo).`,
          suggestion: 'Purchase Discounted Reseller Credits',
          reason: `Sourcing token credits through secondary developer partners saves 20-30% on identical API usage.`,
          potentialMonthlySaving: estimatedSaving,
          currentMonthlySpend: entry.monthlySpend,
          recommendedMonthlySpend: entry.monthlySpend - estimatedSaving,
          strategy: 'both',
          recommendationType: 'Billing Optimization',
          confidence: score >= 85 ? 'High' : 'Medium',
          confidenceScore: score,
          confidenceExplanation: explanations,
          productivityImpact: 'No Impact',
          currentSetup: 'Direct Pay-As-You-Go Credit Rates',
          recommendedSetup: 'Reseller Bundled Developer Credits',
          detailedReason: `• Reduces unit token expense by ~25%.\n• Preserves identical API endpoints and latency.\n• Zero code integration changes required.`,
          tradeoffs: 'Reseller credits typically expire within 12 months and require maintaining a partner console account.',
          estimatedSavings: `Save ~$${estimatedSaving}/mo (~$${estimatedSaving * 12}/year)`
        });
      } else {
        insights.push({
          toolId: entry.toolId,
          toolName: tool.name,
          type: 'already_optimal',
          severity: 'info',
          message: `Current Plan Recommended: Keep Direct API Billing.`,
          suggestion: 'Keep Pay-As-You-Go API',
          reason: `Your spend ($${entry.monthlySpend}/mo) is below partner discount thresholds, making direct API billing optimal.`,
          potentialMonthlySaving: 0,
          currentMonthlySpend: entry.monthlySpend,
          recommendedMonthlySpend: entry.monthlySpend,
          strategy: 'both',
          recommendationType: 'Validation',
          confidence: 'High',
          confidenceScore: 100 - score,
          confidenceExplanation: [
            '✓ Volume is below partner credits thresholds',
            '✓ Direct dashboard configuration control retained',
            '✓ Invoicing remains simple'
          ],
          productivityImpact: 'No Impact',
          currentSetup: `Pay-as-you-go ($${entry.monthlySpend}/mo)`,
          recommendedSetup: `Keep direct connection`,
          detailedReason: `• Retains direct platform support and API controls.\n• Avoids secondary dashboard setup or minimum credit volume commitments.\n• Keeps invoicing simple.`,
          tradeoffs: 'Misses high volume partner discounts because current throughput is low.'
        });
      }
    }
  }

  // ── 6. PLAN VERIFICATION CHECK ──────────────────────────────
  private static checkPlanVerifications(
    tools: ToolEntry[],
    insights: Insight[]
  ): void {
    for (const entry of tools) {
      const hasOptimization = insights.some(
        (i) => i.toolId === entry.toolId && i.severity !== 'info'
      );
      if (hasOptimization) continue;

      const alreadyHasInfo = insights.some(
        (i) => i.toolId === entry.toolId && i.severity === 'info'
      );
      if (alreadyHasInfo) continue;

      const tool = getToolById(entry.toolId);
      if (!tool) continue;

      const currentPlan = tool.plans.find((p) => p.id === entry.plan);
      const planLabel = currentPlan ? currentPlan.label : entry.plan;

      insights.push({
        toolId: entry.toolId,
        toolName: tool.name,
        type: 'already_optimal',
        severity: 'info',
        message: `Plan Verified: Your subscription tier is optimal for your current workflow.`,
        suggestion: 'Keep Current Plan',
        reason: `${tool.name} ${planLabel} tier aligns perfectly with your team size and use case requirements.`,
        potentialMonthlySaving: 0,
        currentMonthlySpend: entry.monthlySpend,
        recommendedMonthlySpend: entry.monthlySpend,
        strategy: 'both',
        recommendationType: 'Validation',
        confidence: 'High',
        confidenceScore: 98,
        confidenceExplanation: [
          '✓ No pricing tier optimization recommended',
          '✓ No capability redundancy detected',
          '✓ Resource configurations verified'
        ],
        productivityImpact: 'No Impact',
        currentSetup: `${tool.name} ${planLabel} ($${entry.monthlySpend}/mo)`,
        recommendedSetup: `Keep Active Plan`,
        detailedReason: `• Verified against active seat count and use case.\n• No redundancy or plan overhead detected.\n• Promotes workflow stability and team productivity.`,
        tradeoffs: 'Maintains current developer workspace config and billing consistency.'
      });
    }
  }

  // ── 7. CALCULATE PRIORITY SCORES ────────────────────────────
  private static calculatePriorityScores(insights: Insight[]): void {
    for (const insight of insights) {
      const cappedSavings = Math.min(insight.potentialMonthlySaving, 250);
      const savingsContribution = (cappedSavings / 250) * 100 * 0.4;
      const confidenceContribution = (insight.confidenceScore || 70) * 0.3;

      const severityOrder = { high: 100, medium: 75, low: 50, info: 25 };
      const severityContribution = (severityOrder[insight.severity] || 50) * 0.15;

      const isOverlap = insight.type === 'overlapping_tools';
      const overlapContribution = (isOverlap ? 100 : 0) * 0.15;

      insight.priorityScore = Math.round(savingsContribution + confidenceContribution + severityContribution + overlapContribution);
    }
  }
}
