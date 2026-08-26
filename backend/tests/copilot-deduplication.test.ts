// ============================================================
// GitHub Copilot De-duplication Regression Tests
//
// Guards the fix for the accidental 'copilot' lookup-alias leak into
// the enumerated profile cache (KnowledgeLoader.cache), which caused
// github-copilot to be returned twice by getAllProviders() and therefore
// duplicated through scoring, ranking, alternatives, and rejectedProviders.
//
// The alias MUST remain in knowledgeCache (so getProvider('copilot')
// resolves) but MUST NOT appear in the enumerated cache.
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const countById = <T>(rows: T[], key: keyof T, id: string): number =>
  rows.filter(r => (r[key] as unknown as string) === id).length;

describe('GitHub Copilot de-duplication', () => {
  beforeAll(() => {
    KnowledgeLoader.initialize();
  });

  it('getAllProviders() returns github-copilot exactly once (and no duplicate ids at all)', () => {
    const providers = KnowledgeLoader.getAllProviders();
    const copilotCount = providers.filter(p => p.id.toLowerCase() === 'github-copilot').length;
    expect(copilotCount).toBe(1);

    // Stronger invariant: enumeration is duplicate-free across every provider.
    const ids = providers.map(p => p.id.toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);

    // The bare 'copilot' alias must never surface as an enumerated provider id.
    expect(ids).not.toContain('copilot');
  });

  it("getProvider('copilot') still resolves to the github-copilot profile", () => {
    const profile = KnowledgeLoader.getProvider('copilot');
    expect(profile).not.toBeNull();
    expect(profile!.id.toLowerCase()).toBe('github-copilot');
  });

  it("getProvider('github-copilot') still resolves", () => {
    const profile = KnowledgeLoader.getProvider('github-copilot');
    expect(profile).not.toBeNull();
    expect(profile!.id.toLowerCase()).toBe('github-copilot');
  });

  it('all 4 GitHub Copilot plans remain available', () => {
    const profile = KnowledgeLoader.getProvider('github-copilot');
    expect(profile).not.toBeNull();

    const planIds = profile!.plans.map(p => p.id.toLowerCase());
    expect(planIds).toHaveLength(4);
    expect(planIds).toEqual(
      expect.arrayContaining(['free', 'individual', 'business', 'enterprise'])
    );

    // loadPlans() (used elsewhere) must agree.
    expect(KnowledgeLoader.loadPlans('github-copilot')).toHaveLength(4);
  });

  it('a full recommendation run lists github-copilot exactly once across ranking / alternatives / rejected', () => {
    // Scenario pinned from the live probe where github-copilot is a
    // rejected (non-selected) alternative — it must appear exactly once.
    const req: StackBuilderRequest = {
      domain: 'ai-data-ml',
      teamSize: 15,
      monthlyBudget: 400,
      requirements: ['deep-reasoning-analysis'],
      strategy: 'balanced',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: false,
        preferEstablishedVendors: false,
        requireZeroRetention: false
      },
      debug: true
    };

    const result = AIStackRecommendationEngine.run(req);
    const trace = result.trace!;
    expect(trace).toBeDefined();

    // 1) Full ranking: exactly one github-copilot row, and no duplicate ids overall.
    expect(countById(trace.allProviderScores, 'providerId', 'github-copilot')).toBe(1);
    const rankIds = trace.allProviderScores.map(r => r.providerId);
    expect(new Set(rankIds).size).toBe(rankIds.length);

    // 2) Authoritative rejected list (github-copilot is not selected in this scenario).
    expect(countById(trace.rejectedProviders, 'providerId', 'github-copilot')).toBe(1);

    // 3) Curated alternatives list must never contain a duplicate copilot entry.
    expect(countById(result.alternatives, 'toolId', 'github-copilot')).toBeLessThanOrEqual(1);
  });
});
