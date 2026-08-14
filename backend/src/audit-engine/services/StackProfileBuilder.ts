// ============================================================
// Stack Profile Builder — StackSave AI Platform Intelligence
//
// Pure aggregation layer. Converts selected tools into one normalized
// Stack Profile. Does NOT calculate workflow, financial, or business
// intelligence scores (delegated strictly to dedicated engines).
// ============================================================

import { ToolEntry, UseCase } from '../../types';
import { KnowledgeLoader, ProviderProfile } from './KnowledgeLoader';

export interface StackProfile {
  tools: ToolEntry[];
  profiles: ProviderProfile[];
  teamSize: number;
  useCase: UseCase;
  optimizationGoal: 'savings' | 'balanced' | 'productivity' | 'governance';
  billingCycle: 'monthly' | 'annual'; // user's selected billing period

  // Raw Financial Summaries (pure aggregations)
  totalMonthlySpend: number;
  totalAnnualSpend: number;

  // Raw Capability & Redundancy Aggregations
  capabilityCoverage: Record<string, number>; // max score per capability across active tools
  capabilityRedundancies: Array<{ capability: string; providers: string[] }>;
  missingCapabilities: string[];             // core capabilities scoring < 5 across active stack

  // Raw Risk Indicators
  riskProfile: {
    migrationRisk: 'Low' | 'Medium' | 'High';
    lockInRisk: 'Low' | 'Medium' | 'High';
  };
}

export class StackProfileBuilder {
  /**
   * Constructs the normalized Stack Profile via pure aggregation.
   */
  public static build(
    tools: ToolEntry[],
    teamSize: number,
    useCase: UseCase,
    optimizationGoal: 'savings' | 'balanced' | 'productivity' | 'governance' = 'balanced',
    billingCycle: 'monthly' | 'annual' = 'monthly'
  ): StackProfile {
    KnowledgeLoader.initialize();

    const profiles: ProviderProfile[] = [];
    for (const entry of tools) {
      const p = KnowledgeLoader.getProvider(entry.toolId, entry.modelId, entry.plan);
      if (p) profiles.push(p);
    }

    // 1. Raw Spend Aggregations
    const totalMonthlySpend = tools.reduce((sum, t) => sum + t.monthlySpend, 0);
    const totalAnnualSpend = totalMonthlySpend * 12;

    // 2. Raw Capability Coverage & Redundancies Aggregations
    const capabilityCoverage: Record<string, number> = {};
    const capProviderMap: Record<string, string[]> = {};

    for (const p of profiles) {
      for (const [cap, entry] of Object.entries(p.capabilities)) {
        const score = entry?.score || 0;
        capabilityCoverage[cap] = Math.max(capabilityCoverage[cap] || 0, score);

        if (score >= 7) {
          if (!capProviderMap[cap]) capProviderMap[cap] = [];
          capProviderMap[cap].push(p.name);
        }
      }
    }

    const capabilityRedundancies: Array<{ capability: string; providers: string[] }> = [];
    for (const [cap, providerList] of Object.entries(capProviderMap)) {
      if (providerList.length >= 2) {
        capabilityRedundancies.push({ capability: cap, providers: providerList });
      }
    }

    const coreCapabilities = ['coding', 'reasoning', 'planning', 'autocomplete', 'aiAgent', 'multiFileEditing', 'research'];
    const missingCapabilities = coreCapabilities.filter(c => (capabilityCoverage[c] || 0) < 5);

    // 3. Raw Risk Counts
    let migHighCount = 0;
    let lockInHighCount = 0;

    for (const p of profiles) {
      if (p.developerExperience?.migrationCost === 'High') migHighCount++;
      if (p.financialProfile?.vendorLockInRisk === 'High') lockInHighCount++;
    }

    const migrationRisk: 'Low' | 'Medium' | 'High' = migHighCount >= 2 ? 'High' : migHighCount === 1 ? 'Medium' : 'Low';
    const lockInRisk: 'Low' | 'Medium' | 'High' = lockInHighCount >= 2 ? 'High' : lockInHighCount === 1 ? 'Medium' : 'Low';

    return {
      tools,
      profiles,
      teamSize,
      useCase,
      optimizationGoal,
      billingCycle,
      totalMonthlySpend,
      totalAnnualSpend,
      capabilityCoverage,
      capabilityRedundancies,
      missingCapabilities,
      riskProfile: {
        migrationRisk,
        lockInRisk
      }
    };
  }
}
