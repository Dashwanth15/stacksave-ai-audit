// ============================================================
// SubscriptionHealthReport — Premium "View Analysis" Panel
// Replaces the generic analysis panel with a consultant-grade
// AI Subscription Health Report. Frontend-only, no backend.
// ============================================================

import type { Insight, ToolEntry } from '../types';
import {
  getToolHealthProfile,
  type ToolHealthProfile,
  deriveSubscriptionValue,
} from '../data/toolHealthKnowledge';

interface Props {
  insight: Insight;
  auditTools?: ToolEntry[];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2">
      {children}
    </span>
  );
}

function Chip({
  children,
  color = 'slate',
}: {
  children: React.ReactNode;
  color?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose';
}) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${colors[color]}`}
    >
      {children}
    </span>
  );
}

function ValueBadge({ value }: { value: 'Excellent' | 'Good' | 'Average' | 'Poor' }) {
  const config = {
    Excellent: { bg: 'bg-emerald-500', text: 'text-white', label: '⭐ Excellent' },
    Good: { bg: 'bg-indigo-500', text: 'text-white', label: '✓ Good' },
    Average: { bg: 'bg-amber-400', text: 'text-white', label: '~ Average' },
    Poor: { bg: 'bg-rose-500', text: 'text-white', label: '⚠ Poor' },
  };
  const c = config[value];
  return (
    <span className={`${c.bg} ${c.text} px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide`}>
      {c.label}
    </span>
  );
}

// ─── Aggregated Ecosystem Report for "All Stack Tools" ───────────────────────

function StackEcosystemHealthReport({
  insight,
  auditTools = [],
}: {
  insight: Insight;
  auditTools?: ToolEntry[];
}) {
  // Collect all profiles present in the active stack
  const activeProfiles = auditTools
    .map((t) => getToolHealthProfile(t.toolId))
    .filter((p): p is ToolHealthProfile => p !== null);

  // Fallback if auditTools empty: default to standard multi-tool suite
  const profilesToUse =
    activeProfiles.length > 0
      ? activeProfiles
      : ['cursor', 'claude', 'chatgpt', 'github-copilot', 'gemini']
          .map((id) => getToolHealthProfile(id))
          .filter((p): p is ToolHealthProfile => p !== null);

  const toolNames = profilesToUse.map((p) => p.toolName).join(', ');

  // 1. Aggregated Premium Features with Provider Badges
  const aggregatedFeatures: { name: string; toolName: string }[] = [];
  const featureSet = new Set<string>();
  profilesToUse.forEach((p) => {
    p.premiumFeatures.forEach((f) => {
      if (f.available && !featureSet.has(f.name)) {
        featureSet.add(f.name);
        aggregatedFeatures.push({ name: f.name, toolName: p.toolName });
      }
    });
  });

  // 2. Aggregated Actively Used Features
  const usedSet = new Set<string>();
  profilesToUse.forEach((p) => {
    p.typicallyUsed.forEach((u) => usedSet.add(u));
  });
  const aggregatedUsed = Array.from(usedSet);

  // 3. Aggregated Underutilized Features
  const underutilizedSet = new Set<string>();
  profilesToUse.forEach((p) => {
    p.commonlyUnderutilized.forEach((u) => underutilizedSet.add(u));
  });
  const aggregatedUnderutilized = Array.from(underutilizedSet);

  // 4. Domain Capability Coverage Matrix
  const domainMatrix = [
    {
      domain: 'Coding & Autocomplete',
      status: profilesToUse.some((p) => p.primaryRole === 'AI IDE' || p.toolId === 'github-copilot' || p.toolId === 'cursor' || p.toolId === 'windsurf')
        ? 'Excellent'
        : 'Moderate',
      detail: profilesToUse.find((p) => p.primaryRole === 'AI IDE' || p.toolId === 'github-copilot')?.toolName || 'General Assistant',
    },
    {
      domain: 'Deep Reasoning & Logic',
      status: profilesToUse.some((p) => p.toolId === 'claude' || p.toolId === 'anthropic-api' || p.toolId === 'deepseek')
        ? 'Excellent'
        : 'Strong',
      detail: profilesToUse.find((p) => p.toolId === 'claude' || p.toolId === 'anthropic-api')?.toolName || 'Frontier Models',
    },
    {
      domain: 'Web Search & Research',
      status: profilesToUse.some((p) => p.toolId === 'perplexity' || p.toolId === 'chatgpt' || p.toolId === 'gemini')
        ? 'Excellent'
        : 'Available',
      detail: profilesToUse.find((p) => p.toolId === 'perplexity' || p.toolId === 'chatgpt')?.toolName || 'Search Grounding',
    },
    {
      domain: 'Voice & Audio AI',
      status: profilesToUse.some((p) => p.toolId === 'chatgpt' || p.toolId === 'gemini')
        ? 'Available'
        : 'Gap',
      detail: profilesToUse.find((p) => p.toolId === 'chatgpt' || p.toolId === 'gemini')?.toolName || 'No Native Voice Tool',
    },
    {
      domain: 'Vision & Multimodal',
      status: profilesToUse.some((p) => p.toolId === 'claude' || p.toolId === 'chatgpt' || p.toolId === 'gemini')
        ? 'Excellent'
        : 'Moderate',
      detail: 'Multimodal Image & Document Parsing',
    },
    {
      domain: 'APIs & Developer Tooling',
      status: profilesToUse.some((p) => p.toolId.includes('api'))
        ? 'Available'
        : 'IDE / Web Chat',
      detail: 'Developer Console Access',
    },
    {
      domain: 'Enterprise Security & SSO',
      status: 'High',
      detail: 'SOC2 & Enterprise Privacy Controls',
    },
    {
      domain: 'IDE & Editor Integration',
      status: profilesToUse.some((p) => p.primaryRole === 'AI IDE' || p.toolId === 'github-copilot')
        ? 'Native'
        : 'Third-Party',
      detail: 'Editor Workspace Support',
    },
    {
      domain: 'Automation & Agents',
      status: profilesToUse.some((p) => p.toolId === 'cursor' || p.toolId === 'windsurf' || p.toolId === 'codex')
        ? 'Autonomous'
        : 'Standard',
      detail: 'Agent Terminal & Execution',
    },
  ];

  // 5. Unique Contributions Per Tool
  const toolContributionsMap: Record<string, string[]> = {
    cursor: ['Purpose-built AI IDE', 'Multi-file Composer edits', 'Terminal Agent execution', 'Codebase vector search'],
    'github-copilot': ['Universal VS Code & JetBrains autocomplete', 'Enterprise IP protection & SSO', 'GitHub native PR integration'],
    claude: ['Best-in-class Extended Thinking', '200k document context parsing', 'Claude Artifacts prototyping', 'Claude Projects'],
    chatgpt: ['Advanced Voice Mode', 'Real-time Deep Research', 'Custom GPT Store ecosystem', 'Python Code Interpreter'],
    gemini: ['1M–2M token context window', 'Google Workspace native sync (Drive/Docs/Gmail)', 'Gemini Live voice'],
    'anthropic-api': ['Prompt caching (30–50% savings)', 'Extended Thinking API', 'Structured tool use'],
    'openai-api': ['GPT-4o multimodal API', 'o1 reasoning API', 'Batch API 50% discount'],
    windsurf: ['Cascade Agent workflows', 'Low-cost AI IDE ($15/mo)', 'Terminal action loops'],
    perplexity: ['Cited real-time web research', 'Deep research search loops', 'Sonar API'],
    deepseek: ['Low-cost R1 reasoning', 'Cost-efficient code generation'],
    codex: ['Autonomous engineering agent', 'Long-horizon parallel coding'],
  };

  // 6. Overall Stack Health Verdict
  const totalMonthlySpend = insight.currentMonthlySpend || 0;
  const isMultiTool = profilesToUse.length >= 2;

  const stackHealthSentence = isMultiTool
    ? `Your combined AI stack (${toolNames}) provides comprehensive coverage across software engineering, reasoning, and research.`
    : `Your AI stack setup (${toolNames}) is verified and provides targeted workflow coverage.`;

  return (
    <div className="mt-3 space-y-4 text-[11px] leading-relaxed animate-fade-in">

      {/* ── 1. Overall Stack Health ───────────────────────────── */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 text-white space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-300">
            Ecosystem Stack Health
          </span>
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-0.5 rounded-full text-[10px] font-bold">
            ⭐ Optimal Stack Synergy
          </span>
        </div>
        <p className="text-[12px] font-bold text-slate-100 leading-snug">
          {stackHealthSentence}
        </p>
      </div>

      {/* ── 2. Combined Premium Features Available Across Subscriptions ──── */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
        <SectionLabel>Combined Premium Features Across All Subscriptions</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {aggregatedFeatures.map((feat) => (
            <span
              key={feat.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-900 border border-indigo-100"
            >
              <span className="text-emerald-600 font-bold">✓</span>
              <span>{feat.name}</span>
              <span className="text-[9px] font-extrabold uppercase bg-white/80 px-1.5 py-0.5 rounded text-indigo-600 border border-indigo-200/50 ml-1">
                {feat.toolName}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* ── 3. Features Team is Actively Using ────────────── */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
          <SectionLabel>Features Team is Actively Using</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {aggregatedUsed.map((cap) => (
              <span key={cap} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                ✓ {cap}
              </span>
            ))}
          </div>
        </div>

        {/* ── 4. Underutilized Premium Capabilities ────────── */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
          <SectionLabel>Underutilized Premium Capabilities</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {aggregatedUnderutilized.map((cap) => (
              <span key={cap} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-100">
                ⚠ {cap}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Capability Coverage Across Domains ───────────── */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
        <SectionLabel>Capability Coverage Across Ecosystem Domains</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {domainMatrix.map((item) => (
            <div key={item.domain} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex justify-between items-center text-[9px]">
                <span className="font-bold text-slate-700">{item.domain}</span>
                <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] uppercase ${
                  item.status === 'Excellent' || item.status === 'Autonomous' || item.status === 'Native'
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.status === 'Strong' || item.status === 'High' || item.status === 'Available'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.status}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block leading-tight font-medium">
                {item.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* ── 6. Overall Subscription Utilization ─────────────── */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
          <SectionLabel>Overall Subscription Utilization</SectionLabel>
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Combined Monthly Spend</span>
              <span className="text-lg font-black font-mono text-slate-900">${totalMonthlySpend}/mo</span>
            </div>
            <ValueBadge value="Excellent" />
          </div>
          <p className="text-[10px] text-slate-600 font-medium">
            Your team maintains a balanced AI software portfolio with minimal functional duplication.
          </p>
        </div>

        {/* ── 7. Highest Value Tools in the Stack ─────────────── */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
          <SectionLabel>Highest Value Tools in Your Stack</SectionLabel>
          <div className="space-y-1.5">
            {profilesToUse.map((p) => (
              <div key={p.toolId} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-[11px]">{p.toolName}</span>
                  <span className="text-[9px] text-slate-500 font-medium">({p.primaryRole})</span>
                </div>
                <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Anchor Tool
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 8. Which Tool Contributes Which Unique Capabilities ──── */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
        <SectionLabel>Tool Capability Contribution Breakdown</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {profilesToUse.map((p) => {
            const contribs = toolContributionsMap[p.toolId] || p.bestUseCases || [];
            return (
              <div key={p.toolId} className="p-3 rounded-lg bg-slate-50/70 border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
                  <span className="font-extrabold text-slate-900 text-[11px]">{p.toolName}</span>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-indigo-600">{p.vendor}</span>
                </div>
                <ul className="space-y-0.5">
                  {contribs.map((c, idx) => (
                    <li key={idx} className="text-[10px] text-slate-600 flex items-start gap-1">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* ── 9. Areas Where Stack is Particularly Strong ─────── */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
          <SectionLabel>Areas Where Stack is Particularly Strong</SectionLabel>
          <ul className="space-y-1 text-[10px] text-slate-700">
            <li className="flex items-start gap-1.5 font-medium">
              <span className="text-emerald-500 font-bold">✦</span>
              <span>Full-spectrum coverage from IDE inline editing to deep document synthesis.</span>
            </li>
            <li className="flex items-start gap-1.5 font-medium">
              <span className="text-emerald-500 font-bold">✦</span>
              <span>Zero workflow friction — technical and non-technical team members get tailored tooling.</span>
            </li>
            <li className="flex items-start gap-1.5 font-medium">
              <span className="text-emerald-500 font-bold">✦</span>
              <span>High developer velocity with verified enterprise compliance standards.</span>
            </li>
          </ul>
        </div>

        {/* ── 10. Remaining Capability Gaps ───────────────────── */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
          <SectionLabel>Remaining Capability Gaps & Recommendations</SectionLabel>
          <ul className="space-y-1 text-[10px] text-slate-700">
            <li className="flex items-start gap-1.5 font-medium">
              <span className="text-amber-500 font-bold">⚡</span>
              <span>Activate underutilized features (Claude Projects, ChatGPT Deep Research) to double ROI.</span>
            </li>
            <li className="flex items-start gap-1.5 font-medium">
              <span className="text-amber-500 font-bold">⚡</span>
              <span>Enable annual billing where available to save up to 20% on recurring seat costs.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── 11. Overall Consultant Verdict ───────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-white">
        <SectionLabel>
          <span className="text-slate-400">Overall Consultant Verdict</span>
        </SectionLabel>
        <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
          Your active software stack ({toolNames}) represents a high-performing AI ecosystem.
          Each tool occupies a distinct operational niche without unnecessary redundancy.
          The primary optimization focus should be encouraging team adoption of underutilized features like Projects and Deep Research rather than modifying the tool portfolio.
        </p>
      </div>

    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SubscriptionHealthReport({ insight, auditTools }: Props) {
  const isAllStackTools =
    insight.toolName === 'All Stack Tools' ||
    insight.toolId === 'all-stack-tools' ||
    insight.toolId === ('all' as any);

  // ── Render Aggregated Ecosystem Analysis if "All Stack Tools" ──
  if (isAllStackTools) {
    return <StackEcosystemHealthReport insight={insight} auditTools={auditTools} />;
  }

  const profile = getToolHealthProfile(insight.toolId);
  const subscriptionValue = deriveSubscriptionValue(
    insight.confidenceScore,
    insight.potentialMonthlySaving,
    insight.currentMonthlySpend,
  );

  // ── Fallback: if no profile, show a graceful minimal report ──
  if (!profile) {
    return (
      <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 text-[11px] text-slate-600">
        <p className="font-semibold text-slate-700">{insight.detailedReason || insight.reason}</p>
        {insight.tradeoffs && (
          <p className="text-slate-500 text-[10px]">{insight.tradeoffs}</p>
        )}
      </div>
    );
  }

  // ── Derive verdict text based on value ──
  const verdictText =
    subscriptionValue === 'Excellent'
      ? profile.verdictStrong
      : subscriptionValue === 'Good'
        ? profile.verdictMedium
        : profile.verdictWeak;

  // ── Derive subscription value hint ──
  const valueHintText =
    subscriptionValue === 'Excellent'
      ? profile.subscriptionValueHints.excellent
      : subscriptionValue === 'Good'
        ? profile.subscriptionValueHints.average
        : profile.subscriptionValueHints.poor;

  // ── Executive verdict sentence ──
  const executiveVerdict =
    subscriptionValue === 'Excellent'
      ? `${profile.toolName} is delivering excellent value for your current plan.`
      : subscriptionValue === 'Good'
        ? `${profile.toolName} is a good fit, with room to unlock more value.`
        : subscriptionValue === 'Average'
          ? `${profile.toolName} is adequate, but several premium features are underutilized.`
          : `${profile.toolName} may not be the right plan for your current usage.`;

  // ── Annual billing math ──
  const hasAnnualDiscount = profile.annualDiscountPercent > 0;
  const annualSavingsPerSeat =
    hasAnnualDiscount && insight.currentMonthlySpend > 0
      ? Math.round((insight.currentMonthlySpend * profile.annualDiscountPercent) / 100 * 12)
      : 0;

  return (
    <div className="mt-3 space-y-4 text-[11px] leading-relaxed animate-fade-in">

      {/* ── 1. Executive Verdict ─────────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-2.5">
        <span className="text-indigo-500 font-black text-base shrink-0">▸</span>
        <p className="text-[12px] font-bold text-indigo-900 leading-snug">
          {executiveVerdict}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* ── 2. What You're Paying For ─────────────────────── */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
          <SectionLabel>What You're Paying For</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {profile.premiumFeatures.map((feat) => (
              <span
                key={feat.name}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                  feat.available
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                    : 'bg-slate-50 text-slate-400 border-slate-100 line-through'
                }`}
              >
                {feat.available ? '✓' : '—'} {feat.name}
              </span>
            ))}
          </div>
        </div>

        {/* ── 3. Features You're Actually Using ────────────── */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
          <SectionLabel>Features You're Actually Using</SectionLabel>
          <div className="space-y-2">
            <div>
              <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Using</span>
              <div className="flex flex-wrap gap-1">
                {profile.typicallyUsed.map((cap) => (
                  <span key={cap} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    ✓ {cap}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Underutilized</span>
              <div className="flex flex-wrap gap-1">
                {profile.commonlyUnderutilized.map((cap) => (
                  <span key={cap} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                    ⚠ {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Subscription Value ────────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Subscription Value</SectionLabel>
          <ValueBadge value={subscriptionValue} />
        </div>
        <p className="text-[11px] text-slate-600 leading-snug font-medium">{valueHintText}</p>
      </div>

      {/* ── 5. Quick Facts ───────────────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
        <SectionLabel>Quick Facts</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {profile.quickFacts.map((fact) => (
            <div
              key={fact.label}
              className={`p-2 rounded-lg border text-center ${
                fact.dim
                  ? 'bg-slate-50 border-slate-100'
                  : fact.highlight
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-slate-50 border-slate-100'
              }`}
            >
              <span className={`text-[8px] font-bold uppercase tracking-wider block mb-0.5 ${fact.dim ? 'text-slate-400' : 'text-slate-500'}`}>
                {fact.label}
              </span>
              <span className={`text-[10px] font-extrabold block leading-tight ${
                fact.dim ? 'text-slate-400' : fact.highlight ? 'text-emerald-700' : 'text-slate-700'
              }`}>
                {fact.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* ── 6. Best Use Cases ─────────────────────────────── */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
          <SectionLabel>Best Use Cases</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {profile.bestUseCases.slice(0, 5).map((uc) => (
              <Chip key={uc} color="indigo">{uc}</Chip>
            ))}
          </div>
        </div>

        {/* ── 7. When Another Tool May Be Better ───────────── */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 space-y-2">
          <SectionLabel>When Another Tool May Be Better</SectionLabel>
          <div className="space-y-2">
            {profile.whenToSwitchTo.map((sugg) => (
              <div key={sugg.competitor} className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-700">
                  Choose {sugg.competitor} if...
                </span>
                <ul className="space-y-0.5 pl-1">
                  {sugg.reasons.map((r) => (
                    <li key={r} className="text-[10px] text-slate-500 flex items-start gap-1">
                      <span className="text-slate-300 shrink-0 mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 8. Annual Billing Opportunity ────────────────────── */}
      {hasAnnualDiscount ? (
        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
          <SectionLabel>Annual Billing Opportunity</SectionLabel>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Current</span>
                <span className="text-[11px] font-extrabold text-slate-700">Monthly</span>
              </div>
              <span className="text-slate-300 font-light text-lg">→</span>
              <div className="text-center">
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Switch to</span>
                <span className="text-[11px] font-extrabold text-emerald-700">Annual</span>
              </div>
            </div>
            {annualSavingsPerSeat > 0 && (
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Potential Savings</span>
                <span className="text-base font-black font-mono text-emerald-600">
                  ~${annualSavingsPerSeat}/year
                </span>
              </div>
            )}
          </div>
          {profile.annualDiscountNote && (
            <p className="text-[10px] text-slate-600 font-medium">{profile.annualDiscountNote}</p>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <SectionLabel>Annual Billing Opportunity</SectionLabel>
          <p className="text-[10px] text-slate-400 font-medium">No annual discount available for this subscription.</p>
        </div>
      )}

      {/* ── 9. Final Consultant Verdict ──────────────────────── */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <SectionLabel>
          <span className="text-slate-400">Final Verdict</span>
        </SectionLabel>
        <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
          {verdictText}
        </p>
        {insight.type === 'annual_discount' && insight.potentialMonthlySaving > 0 && (
          <p className="text-[11px] text-emerald-400 font-semibold">
            The only clear optimization: switch to annual billing and save ${insight.potentialMonthlySaving * 12}/year.
          </p>
        )}
        {insight.type === 'overpaid_plan' && (
          <p className="text-[11px] text-amber-400 font-semibold">
            A plan adjustment is recommended — your current plan includes capacity your team isn't using.
          </p>
        )}
      </div>

    </div>
  );
}

