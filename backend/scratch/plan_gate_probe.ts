import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';

const TERM_SETS: Record<string, string[]> = {
  'enterprise-sso': ['sso', 'saml', 'oidc', 'scim', 'single sign-on'],
  'enterprise-governance': ['audit log', 'policy', 'policies', 'rbac', 'role-based', 'admin', 'compliance', 'governance', 'privacy mode', 'content exclusion'],
};

const profiles = KnowledgeScoringEngine.scoreAll();
for (const p of profiles) {
  console.log(`\n### ${p.id} (${p.category})  plans=${p.plans.length}`);
  for (const pl of p.plans as any[]) {
    const text = [...(pl.features ?? []), ...(pl.premiumFeatures ?? [])].join(' | ').toLowerCase();
    const hits = Object.entries(TERM_SETS)
      .map(([k, terms]) => [k, terms.filter(t => text.includes(t))] as const)
      .filter(([, h]) => h.length > 0)
      .map(([k, h]) => `${k}:[${h.join(',')}]`);
    console.log(
      `  rank=${pl.tierRank ?? '?'} $${pl.monthlyPricePerSeat} ${String(pl.label).padEnd(12)} ` +
      `ent=${pl.isEnterprise === true} ${hits.length ? '→ ' + hits.join(' ') : ''}`
    );
  }
  console.log(`  capVector: enterpriseSecurity=${p.capabilityVector['enterpriseSecurity'] ?? '-'} sso=${p.capabilityVector['sso'] ?? '-'} saml=${p.capabilityVector['saml'] ?? '-'} adminControls=${p.capabilityVector['adminControls'] ?? '-'}`);
}
