// ============================================================
// Knowledge Quality Engine (KQE) — StackSave AI Platform
//
// Knowledge Management Layer Service. Validates, audits, and grades
// provider knowledge BEFORE it is cached for audit execution.
//
// NEVER runs during individual audit request lifecycles.
// Runs during server startup, CI/CD validation, and manual verifications.
// ============================================================

import { ProviderProfile } from './KnowledgeLoader';

export interface ValidationIssue {
  type: 'schema' | 'completeness' | 'consistency' | 'evidence' | 'freshness';
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface ProviderHealthScore {
  providerId: string;
  providerName: string;
  qualityScore: number;           // Overall Quality Score (0-100%)
  completenessScore: number;       // 0-100%
  evidenceCoverage: number;        // 0-100%
  benchmarkCoverage: number;       // 0-100%
  enterpriseCoverage: number;      // 0-100%
  pricingCoverage: number;         // 0-100%
  freshnessScore: number;          // 0-100%
  issues: ValidationIssue[];
}

export interface KnowledgeHealthReport {
  timestamp: string;
  totalProviders: number;
  averageQualityScore: number;
  healthyProvidersCount: number;  // Score >= 85%
  warningProvidersCount: number;  // Score 60-84%
  criticalProvidersCount: number; // Score < 60%
  providerHealthScores: Record<string, ProviderHealthScore>;
  summaryErrors: number;
  summaryWarnings: number;
}

export class KnowledgeQualityEngine {
  /**
   * Validates the entire provider knowledge base and generates a Knowledge Health Report.
   * Belongs to server initialization & developer tooling (not the audit pipeline).
   */
  public static validateKnowledgeBase(profiles: ProviderProfile[]): KnowledgeHealthReport {
    const providerHealthScores: Record<string, ProviderHealthScore> = {};
    let totalQualitySum = 0;
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const profile of profiles) {
      const health = this.evaluateProviderHealth(profile);
      providerHealthScores[profile.id] = health;
      totalQualitySum += health.qualityScore;

      if (health.qualityScore >= 85) healthyCount++;
      else if (health.qualityScore >= 60) warningCount++;
      else criticalCount++;

      for (const issue of health.issues) {
        if (issue.severity === 'error') totalErrors++;
        if (issue.severity === 'warning') totalWarnings++;
      }
    }

    const totalProviders = Math.max(1, profiles.length);
    const averageQualityScore = Math.round(totalQualitySum / totalProviders);

    return {
      timestamp: new Date().toISOString(),
      totalProviders: profiles.length,
      averageQualityScore,
      healthyProvidersCount: healthyCount,
      warningProvidersCount: warningCount,
      criticalProvidersCount: criticalCount,
      providerHealthScores,
      summaryErrors: totalErrors,
      summaryWarnings: totalWarnings
    };
  }

  /**
   * Evaluates the health and quality of a single provider profile.
   */
  public static evaluateProviderHealth(profile: ProviderProfile): ProviderHealthScore {
    const issues: ValidationIssue[] = [];

    // 1. Schema & Range Validation
    let schemaErrors = 0;
    if (!profile.id || typeof profile.id !== 'string') {
      issues.push({ type: 'schema', severity: 'error', message: 'Missing or invalid provider ID', field: 'id' });
      schemaErrors++;
    }
    if (!profile.name || typeof profile.name !== 'string') {
      issues.push({ type: 'schema', severity: 'error', message: 'Missing or invalid provider Name', field: 'name' });
      schemaErrors++;
    }

    // 2. Capability Validation & Evidence Coverage
    const capKeys = Object.keys(profile.capabilities || {});
    let capWithEvidence = 0;
    let capValidRange = 0;

    for (const [key, cap] of Object.entries(profile.capabilities || {})) {
      if (typeof cap.score !== 'number' || cap.score < 0 || cap.score > 10) {
        issues.push({ type: 'schema', severity: 'error', message: `Capability '${key}' score ${cap.score} is out of bounds (0-10)`, field: `capabilities.${key}.score` });
        schemaErrors++;
      } else {
        capValidRange++;
      }

      if (cap.evidence && cap.evidence.length >= 10) {
        capWithEvidence++;
      } else {
        issues.push({ type: 'evidence', severity: 'warning', message: `Capability '${key}' lacks detailed evidence text`, field: `capabilities.${key}.evidence` });
      }
    }

    const evidenceCoverage = capKeys.length > 0 ? Math.round((capWithEvidence / capKeys.length) * 100) : 0;

    // 3. Pricing Coverage
    let pricingScore = 100;
    if (!profile.plans || profile.plans.length === 0) {
      issues.push({ type: 'completeness', severity: 'error', message: 'Provider has no pricing plans defined', field: 'plans' });
      pricingScore = 0;
    } else {
      for (const p of profile.plans) {
        if (p.monthlyPricePerSeat < 0) {
          issues.push({ type: 'schema', severity: 'error', message: `Plan '${p.id}' price cannot be negative`, field: `plans.${p.id}.monthlyPricePerSeat` });
          pricingScore -= 25;
        }
      }
      pricingScore = Math.max(0, pricingScore);
    }

    // 4. Benchmark Coverage
    const benchmarkKeys = Object.keys(profile.benchmarks || {});
    const benchmarkCoverage = benchmarkKeys.length >= 2 ? 100 : benchmarkKeys.length === 1 ? 50 : 0;
    if (benchmarkCoverage === 0) {
      issues.push({ type: 'completeness', severity: 'info', message: 'No benchmark entries recorded for provider', field: 'benchmarks' });
    }

    // 5. Enterprise Coverage
    let entCount = 0;
    const ent = profile.enterprise;
    if (ent) {
      if (ent.compliance?.soc2 !== undefined) entCount++;
      if (ent.compliance?.gdpr !== undefined) entCount++;
      if (ent.identity?.sso !== undefined) entCount++;
      if (ent.security?.encryption !== undefined) entCount++;
      if (ent.administration?.rbac !== undefined) entCount++;
    }
    const enterpriseCoverage = Math.min(100, Math.round((entCount / 5) * 100));

    // 6. Freshness Check (warn if lastVerified > 180 days ago)
    let freshnessScore = 100;
    if (profile.lastVerified) {
      const verifiedDate = new Date(profile.lastVerified).getTime();
      const now = new Date().getTime();
      const ageInDays = (now - verifiedDate) / (1000 * 60 * 60 * 24);
      if (ageInDays > 180) {
        freshnessScore = 50;
        issues.push({ type: 'freshness', severity: 'warning', message: `Knowledge last verified ${Math.round(ageInDays)} days ago (over 6 months old)`, field: 'lastVerified' });
      }
    } else {
      freshnessScore = 50;
      issues.push({ type: 'freshness', severity: 'info', message: 'Missing lastVerified date timestamp', field: 'lastVerified' });
    }

    // 7. Overall Completeness Score
    let completenessCount = 0;
    if (profile.strengths?.length > 0) completenessCount += 25;
    if (profile.weaknesses?.length > 0) completenessCount += 25;
    if (profile.supportedModels?.length > 0) completenessCount += 25;
    if (profile.sources?.length > 0) completenessCount += 25;
    const completenessScore = completenessCount;

    // 8. Overall Weighted Quality Score
    const qualityScore = Math.round(
      completenessScore * 0.20 +
      evidenceCoverage * 0.25 +
      benchmarkCoverage * 0.15 +
      enterpriseCoverage * 0.15 +
      pricingScore * 0.15 +
      freshnessScore * 0.10
    );

    return {
      providerId: profile.id,
      providerName: profile.name,
      qualityScore,
      completenessScore,
      evidenceCoverage,
      benchmarkCoverage,
      enterpriseCoverage,
      pricingCoverage: pricingScore,
      freshnessScore,
      issues
    };
  }
}
