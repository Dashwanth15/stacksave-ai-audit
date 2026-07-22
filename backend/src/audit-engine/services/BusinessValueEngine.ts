// ============================================================
// Business Value Engine — StackSave AI Platform Intelligence
//
// Computes a net procurement business score based on savings, retention,
// productivity impacts, migration costs, learning curves, and risks.
// Enforces strategy-specific prioritization and gates.
// ============================================================

import { KnowledgeLoader } from './KnowledgeLoader';
import { CapabilityDominanceEngine } from './CapabilityDominanceEngine';

export interface BusinessValueReport {
  score: number;
  savingsScore: number;
  retentionScore: number;
  productivityScore: number;
  migrationPenalty: number;
  learningPenalty: number;
  riskPenalty: number;
  isAcceptable: boolean;
}

export class BusinessValueEngine {
  /**
   * Calculates the Business Value Score for replacing provider A with provider B.
   */
  public static calculate(
    idA: string,
    idB: string,
    monthlySavings: number,
    retentionPercent: number, // 0 to 100
    strategy: 'performance' | 'savings',
    useCase?: string
  ): BusinessValueReport {
    const profileA = KnowledgeLoader.getProvider(idA);
    const profileB = KnowledgeLoader.getProvider(idB);

    if (!profileA || !profileB) {
      return {
        score: -999, savingsScore: 0, retentionScore: 0, productivityScore: 0,
        migrationPenalty: 0, learningPenalty: 0, riskPenalty: 0, isAcceptable: false
      };
    }

    // ── NORMALIZE INPUT SCORINGS ──────────────────────────────
    // 1. Cost Savings (absolute monthly cost difference)
    const savingsScore = monthlySavings;

    // 2. Capability Quality (Reasoning + Coding + Planning delta)
    const qualityA = (profileA.capabilities.reasoning.score + profileA.capabilities.coding.score + profileA.capabilities.planning.score) / 3;
    const qualityB = (profileB.capabilities.reasoning.score + profileB.capabilities.coding.score + profileB.capabilities.planning.score) / 3;
    const qualityDelta = (qualityB - qualityA) * 10; // -100 to +100

    // 3. Developer Productivity (DX score delta)
    const prodA = profileA.productivityScores.developerExperience;
    const prodB = profileB.productivityScores.developerExperience;
    const prodDelta = (prodB - prodA) * 10; // -100 to +100

    // 4. Engineering Velocity (Velocity parameter delta)
    const velA = profileA.productivityScores.velocity;
    const velB = profileB.productivityScores.velocity;
    const velDelta = (velB - velA) * 10; // -100 to +100

    // 5. Capability Retention (retained required scores percent)
    const retentionScore = retentionPercent - 100; // -100 to 0

    // 6. Reliability Delta
    const relA = profileA.capabilities.reliability?.score || 8;
    const relB = profileB.capabilities.reliability?.score || 8;
    const relDelta = (relB - relA) * 10;

    // 7. Migration Cost Penalty
    let migrationPenalty = 0;
    const migCost = profileA.productivityScores.migrationCost;
    if (migCost === 'High') migrationPenalty = -40;
    else if (migCost === 'Medium') migrationPenalty = -20;
    else if (migCost === 'Low') migrationPenalty = -5;

    // 8. Learning Curve Penalty
    let learningPenalty = 0;
    const curve = profileB.productivityScores.learningCurve;
    if (curve === 'High') learningPenalty = -20;
    else if (curve === 'Medium') learningPenalty = -10;
    else if (curve === 'Low') learningPenalty = -2;

    // 9. Risk Penalty
    let riskPenalty = 0;
    const risk = profileA.productivityScores.risk;
    if (risk === 'High') riskPenalty = -30;
    else if (risk === 'Medium') riskPenalty = -15;

    // ── VALUE-BASED ROI CALCULATION ─────────────────────────
    const weights = KnowledgeLoader.getWorkflowWeights();
    const useCaseWeights = useCase ? weights[useCase] || weights['general'] : weights['general'];

    let capSumA = 0;
    let capSumB = 0;
    for (const [cap, weight] of Object.entries(useCaseWeights)) {
      capSumA += (profileA.capabilities[cap]?.score || 0) * weight;
      capSumB += (profileB.capabilities[cap]?.score || 0) * weight;
    }

    // Infer nominal pricing
    const pricingA = profileA.pricing;
    const pricingB = profileB.pricing;
    const costA = pricingA.pro || pricingA.plus || pricingA.individual || pricingA.business || 20;
    const costB = pricingB.pro || pricingB.plus || pricingB.individual || pricingB.business || 20;

    const roiA = costA > 0 ? capSumA / costA : capSumA;
    const roiB = costB > 0 ? capSumB / costB : capSumB;
    const roiDelta = (roiB - roiA) * 10;

    // ── CALCULATION OF WEIGHTED SCORE ────────────────────────
    const config = KnowledgeLoader.getStrategyConfig();
    const settings = config[strategy] || config['performance'];
    const w = settings.weights;

    const migrationRiskSum = migrationPenalty + learningPenalty + riskPenalty;

    const score =
      w.workflowCapability * qualityDelta +
      w.monthlyCost * savingsScore +
      w.capabilityRetention * retentionScore +
      w.productivityImpact * prodDelta +
      w.migrationRisk * migrationRiskSum;

    // ── EVALUATE STRATEGIC DECISION GATES ────────────────────
    let isAcceptable = true;

    if (strategy === 'performance') {
      // Performance Optimized MUST protect dominant tools
      const dominance = CapabilityDominanceEngine.compare(idA, idB, useCase);
      if (dominance && dominance.winner === profileA.name) {
        // Reject replacing dominant A with inferior B
        isAcceptable = false;
      }
      if (score < 0 || retentionPercent < settings.minimumRetention) {
        isAcceptable = false;
      }
    } else {
      // Smart Savings strategy constraints
      const productivityLoss = velA - velB; // Velocity drops
      const productivityLossIsMinimal = productivityLoss <= 1.0;
      const migrationCostIsLow = migrationPenalty >= -5;
      const hasBetterRoi = roiB >= roiA;

      if (retentionPercent < settings.minimumRetention || !productivityLossIsMinimal || !migrationCostIsLow || !hasBetterRoi || score <= 0) {
        isAcceptable = false;
      }
    }

    return {
      score: Math.round(score),
      savingsScore,
      retentionScore: Math.round(retentionScore),
      productivityScore: Math.round(prodDelta),
      migrationPenalty,
      learningPenalty,
      riskPenalty,
      isAcceptable
    };
  }
}
