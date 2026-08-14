// ============================================================
// Financial Intelligence Engine — StackSave AI Platform Intelligence
//
// Conducts deep financial intelligence analysis using StackProfile data.
// Responsible for financialHealthScore, vendor concentration (HHI),
// cost-per-capability efficiency, scaling projections, and lock-in risks.
// ============================================================

import { StackProfile } from './StackProfileBuilder';
import { ProviderProfile } from './KnowledgeLoader';

export interface FinancialIntelligenceReport {
  totalMonthlySpend: number;
  totalAnnualSpend: number;
  vendorConcentrationIndex: number; // HHI index (0 to 10,000)
  concentrationRisk: 'Low' | 'Medium' | 'High';
  costPerCapabilityPoint: number;  // $ spend per unit capability score
  scalingProjection2x: number;     // Projected monthly spend at 2x team size
  scalingProjection5x: number;     // Projected monthly spend at 5x team size
  lockInRisk: 'Low' | 'Medium' | 'High';
  financialHealthScore: number;    // 0-100 score computed exclusively here
  insights: string[];
}

export class FinancialIntelligenceEngine {
  /**
   * Generates a comprehensive financial intelligence report from the active StackProfile.
   */
  public static analyze(profile: StackProfile): FinancialIntelligenceReport {
    const totalSpend = profile.totalMonthlySpend;
    const teamSize = profile.teamSize;

    // 1. Calculate Vendor Concentration (HHI Index: sum of (spend_i / totalSpend * 100)^2)
    let hhi = 0;
    if (totalSpend > 0) {
      for (const t of profile.tools) {
        const share = (t.monthlySpend / totalSpend) * 100;
        hhi += share * share;
      }
    }
    const vendorConcentrationIndex = Math.round(hhi);

    let concentrationRisk: 'Low' | 'Medium' | 'High' = 'Low';
    if (vendorConcentrationIndex > 6000 && profile.tools.length > 1) concentrationRisk = 'High';
    else if (vendorConcentrationIndex > 3500 && profile.tools.length > 1) concentrationRisk = 'Medium';

    // 2. Cost Per Capability Point
    let totalCapScore = 0;
    for (const score of Object.values(profile.capabilityCoverage)) {
      totalCapScore += score;
    }
    const costPerCapabilityPoint = totalCapScore > 0 ? Number((totalSpend / totalCapScore).toFixed(2)) : 0;

    // 3. Scaling Projections
    let scalingFactor = 1.0;
    for (const p of profile.profiles) {
      if (p.financialProfile?.scalingCost) {
        scalingFactor = Math.max(scalingFactor, p.financialProfile.scalingCost);
      }
    }
    const scalingProjection2x = Math.round(totalSpend * 2 * scalingFactor);
    const scalingProjection5x = Math.round(totalSpend * 5 * scalingFactor);

    // 4. Compute Financial Health Score exclusively here
    const totalLicensedSeats = profile.tools.reduce((sum, t) => sum + (t.seats || 1), 0);
    const effectiveSeats = totalLicensedSeats > 0 ? totalLicensedSeats : Math.max(1, teamSize);

    let financialHealth = 85;
    if (vendorConcentrationIndex > 6000 && profile.tools.length > 1) financialHealth -= 15;
    if (profile.capabilityRedundancies.length >= 3) financialHealth -= 20;
    if (totalSpend > effectiveSeats * 150) financialHealth -= 10;
    const financialHealthScore = Math.max(0, Math.min(100, financialHealth));

    // 5. Lock-In Risk
    const lockInRisk = profile.riskProfile.lockInRisk;

    // 6. Financial Insights
    const insights: string[] = [];

    if (concentrationRisk === 'High') {
      insights.push(`High vendor concentration detected (HHI: ${vendorConcentrationIndex}). Over 60% of monthly spend is concentrated in a single vendor.`);
    }

    if (profile.capabilityRedundancies.length >= 2) {
      insights.push(`${profile.capabilityRedundancies.length} redundant capability overlaps are increasing total monthly spend by carrying multiple licenses.`);
    }

    const avgSeatSpend = Math.round(totalSpend / effectiveSeats);
    if (totalSpend > effectiveSeats * 150) {
      insights.push(`Average seat spend ($${avgSeatSpend}/seat/mo across ${effectiveSeats} total licensed seats) is above industry baseline ($60-$100/seat/mo).`);
    } else {
      insights.push(`Spend efficiency is optimal at $${avgSeatSpend}/seat/mo across ${effectiveSeats} total licensed seats.`);
    }

    return {
      totalMonthlySpend: totalSpend,
      totalAnnualSpend: profile.totalAnnualSpend,
      vendorConcentrationIndex,
      concentrationRisk,
      costPerCapabilityPoint,
      scalingProjection2x,
      scalingProjection5x,
      lockInRisk,
      financialHealthScore,
      insights
    };
  }

  /**
   * Calculates financial savings for replacing provider A with provider B.
   */
  public static calculateReplacementSavings(
    profileA: ProviderProfile,
    profileB: ProviderProfile,
    seatsA: number
  ): { monthlySavings: number; annualSavings: number; savingsPercent: number } {
    const costA = (profileA.pricing.pro || profileA.pricing.plus || profileA.pricing.individual || profileA.pricing.business || 20) * seatsA;
    const costB = (profileB.pricing.pro || profileB.pricing.plus || profileB.pricing.individual || profileB.pricing.business || 20) * seatsA;
    const monthlySavings = Math.max(0, costA - costB);
    const annualSavings = monthlySavings * 12;
    const savingsPercent = costA > 0 ? Math.round((monthlySavings / costA) * 100) : 0;

    return { monthlySavings, annualSavings, savingsPercent };
  }
}
