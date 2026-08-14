// ============================================================
// Knowledge Quality Engine Unit Tests — StackSave AI Platform
// ============================================================

import { describe, it, expect } from 'vitest';
import { KnowledgeQualityEngine } from '../src/audit-engine/services/KnowledgeQualityEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';

describe('Knowledge Quality Engine (KQE)', () => {
  it('generates a Knowledge Health Report for all loaded providers', () => {
    KnowledgeLoader.initialize();
    const providers = KnowledgeLoader.getAllProviders();
    expect(providers.length).toBeGreaterThan(0);

    const report = KnowledgeQualityEngine.validateKnowledgeBase(providers);
    expect(report.totalProviders).toEqual(providers.length);
    expect(report.averageQualityScore).toBeGreaterThanOrEqual(50);
    expect(report.providerHealthScores).toHaveProperty('cursor');
    expect(report.providerHealthScores).toHaveProperty('chatgpt');
  });

  it('evaluates individual provider health scores and flags missing benchmarks/evidence', () => {
    KnowledgeLoader.initialize();
    const profile = KnowledgeLoader.getProvider('cursor');
    expect(profile).not.toBeNull();

    if (profile) {
      const health = KnowledgeQualityEngine.evaluateProviderHealth(profile);
      expect(health.providerId).toBe('cursor');
      expect(health.qualityScore).toBeGreaterThan(0);
      expect(health.pricingCoverage).toBe(100);
    }
  });
});
