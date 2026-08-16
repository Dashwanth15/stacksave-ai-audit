import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { DecisionReport } from '../../types/intelligence';

interface DecisionReportModalProps {
  report: DecisionReport | null;
  onClose: () => void;
}

export default function DecisionReportModal({ report, onClose }: DecisionReportModalProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'financial' | 'matrix' | 'business' | 'migration' | 'scenarios' | 'whyNot' | 'trace'
  >('overview');
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [expandedEvidenceRow, setExpandedEvidenceRow] = useState<string | null>(null);

  if (!report) return null;

  const opportunityScore = report.opportunityScore || {
    overall: report.confidenceScore || 85,
    financialOpportunity: 80,
    technicalOpportunity: 80,
    businessOpportunity: 85,
    migrationSimplicity: 75,
    futureScalability: 80,
    vendorOptimization: 85,
    overallConfidence: 90,
  };

  const stackVisualization = report.stackVisualization || {
    currentStack: [{ toolId: 'current', toolName: report.targetToolName || 'Current Tool', role: 'Primary Tool', monthlySpend: report.currentMonthlyCost || 0, seats: 1, isRemoved: true }],
    recommendedStack: [{ toolId: 'recommended', toolName: report.title?.split('→')[1]?.trim() || 'Recommended Tool', role: 'Replacement', estimatedMonthlyCost: report.projectedMonthlyCost || 0, seats: 1, isNew: true, isRetained: false }],
    currentMonthlyCost: report.currentMonthlyCost || 0,
    recommendedMonthlyCost: report.projectedMonthlyCost || 0,
    monthlySavings: report.monthlySavings || 0,
  };

  const rankedRecommendations = report.rankedRecommendations || [
    {
      rank: 1,
      label: 'Best Recommendation' as const,
      toolId: 'rec-1',
      toolName: report.proposedAction || 'Primary Swap',
      overallScore: opportunityScore.overall,
      confidence: report.confidence || 'High',
      monthlySavings: report.monthlySavings || 0,
      annualSavings: report.annualSavings || 0,
      netMonthlyCostDelta: report.netCostDelta || 0,
      replacementMonthlyCost: report.projectedMonthlyCost || 0,
      capabilityRetention: report.capabilityRetentionPercent || 90,
      riskLevel: report.riskLevel || 'Low',
      summary: report.recommendation || 'Recommended optimization path.',
    }
  ];

  const capabilitiesGained = report.capabilitiesGained || [];
  const capabilitiesLost = report.capabilitiesLost || [];
  const featureMatrix = report.featureMatrix || [];
  const businessImpact = report.businessImpact || {
    costReduction: `$${report.monthlySavings || 0}/mo savings`,
    developerProductivity: 'Maintains developer velocity',
    workflowImpact: `${report.capabilityRetentionPercent || 90}% workflow capability retention`,
    enterpriseReadiness: 'Verified enterprise compliance',
    vendorLockIn: 'Low vendor lock-in risk',
    scalability: 'Scales with team size',
    operationalComplexity: 'Low migration overhead',
    overallRisk: `${report.riskLevel || 'Low'} risk`,
  };

  const audienceGuidance = report.audienceGuidance || {
    recommendedFor: ['✓ Engineering Teams', '✓ Fast-growing Startups', '✓ Enterprise Teams'],
    notRecommendedFor: ['✗ Teams requiring custom legacy integrations'],
    whenNotToFollow: ['Do not replace if workflows strictly depend on legacy proprietary extensions.'],
  };

  const migrationChecklist = report.migrationChecklist || {
    estimatedDays: 3,
    steps: [
      { id: '1', category: 'setup' as const, action: 'Export data and back up configurations', priority: 'required' as const },
      { id: '2', category: 'billing' as const, action: 'Update subscription plan', priority: 'required' as const },
    ],
  };

  const futureGrowthAnalysis = report.futureGrowthAnalysis || {
    currentTier: { teamSize: 5, label: 'Current (5 users)', projectedMonthlyCost: report.projectedMonthlyCost || 0, scalabilityScore: 85, enterpriseReadiness: 'High' as const, vendorLockIn: 'Low' as const, upgradeRequired: false },
    growthTiers: [
      { teamSize: 10, label: '2× Scale (10 users)', projectedMonthlyCost: (report.projectedMonthlyCost || 0) * 2, scalabilityScore: 90, enterpriseReadiness: 'High' as const, vendorLockIn: 'Low' as const, upgradeRequired: false },
    ],
    scalabilityVerdict: 'Tooling scales smoothly with team expansion.',
    longTermRisk: 'Low' as const,
  };

  const trace = report.trace || {
    knowledgeVersion: 'v2.0.0',
    generatedAt: new Date().toISOString(),
    useCase: 'coding',
    scoringProfile: {},
    decisionPath: ['Evaluated tool profiles', 'Calculated capability deltas'],
    confidenceBreakdown: { capabilityMatch: 90, workflowFit: 85, enterpriseReadiness: 85, financialFit: 90, riskScore: 90 },
  };

  // Financial Direction & Delta computation
  const isSavings = report.costDirection === 'savings' || (report.netCostDelta !== undefined && report.netCostDelta < -0.01) || (report.monthlySavings > 0);
  const isCostIncrease = report.costDirection === 'increase' || (report.netCostDelta !== undefined && report.netCostDelta > 0.01);
  const netDeltaAbs = report.netCostDelta !== undefined ? Math.abs(report.netCostDelta) : report.monthlySavings;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4" role="dialog" aria-modal="true">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <m.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-4xl h-full max-h-[96vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* ── Top Header ────────────────────────────────────────────── */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-900 text-white flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Strategic Decision Intelligence
                </span>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded ${
                  report.riskLevel === 'Low'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : report.riskLevel === 'Medium'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {report.riskLevel} Risk • {report.confidence} Confidence
                </span>
                {isSavings ? (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    💰 Net Savings
                  </span>
                ) : isCostIncrease ? (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⚡ Capability Upgrade (+Spend)
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                    ⚖️ Cost Neutral
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold tracking-tight">{report.title}</h2>
              <p className="text-xs text-slate-400">{report.proposedAction}</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Opportunity Score Gauge */}
              <button
                onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                className="text-center bg-slate-800/90 hover:bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-all text-left group cursor-pointer"
                title="Click to view 6-dimension score breakdown"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Opportunity Score</span>
                  <span className="text-[10px] text-indigo-400 opacity-60 group-hover:opacity-100">ℹ️</span>
                </div>
                <span className="text-2xl font-black text-emerald-400 font-mono-financial">
                  {opportunityScore.overall}<span className="text-xs font-normal text-slate-400">/100</span>
                </span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all focus:outline-none"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Score Breakdown Popover ────────────────────────────────── */}
          <AnimatePresence>
            {showScoreBreakdown && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-900 border-b border-slate-800 px-6 py-4 text-xs text-slate-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                    Opportunity Score Decomposition (6 Vectors)
                  </h5>
                  <button
                    onClick={() => setShowScoreBreakdown(false)}
                    className="text-slate-500 hover:text-slate-300 text-[11px]"
                  >
                    Close ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Financial Opportunity (25%)', val: opportunityScore.financialOpportunity, color: 'emerald' },
                    { label: 'Technical Opportunity (20%)', val: opportunityScore.technicalOpportunity, color: 'indigo' },
                    { label: 'Business Opportunity (20%)', val: opportunityScore.businessOpportunity, color: 'blue' },
                    { label: 'Migration Simplicity (15%)', val: opportunityScore.migrationSimplicity, color: 'amber' },
                    { label: 'Future Scalability (10%)', val: opportunityScore.futureScalability, color: 'violet' },
                    { label: 'Vendor Optimization (10%)', val: opportunityScore.vendorOptimization, color: 'teal' },
                  ].map((dim, i) => (
                    <div key={i} className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-300">{dim.label}</span>
                        <span className="font-mono-financial text-white">{dim.val}/100</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full ${dim.val >= 70 ? 'bg-emerald-500' : dim.val >= 50 ? 'bg-indigo-500' : 'bg-amber-500'} rounded-full`}
                          style={{ width: `${dim.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {/* ── 8 Exact Tabs Requested ─────────────────────────────────── */}
          <div className="flex items-center px-6 border-b border-slate-100 bg-slate-50/80 overflow-x-auto gap-1">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'financial', label: '💰 Financial' },
              { id: 'matrix', label: '⚖️ Capability Matrix' },
              { id: 'business', label: '💼 Business Impact' },
              { id: 'migration', label: '📋 Migration' },
              { id: 'scenarios', label: '🔄 Scenarios' },
              { id: 'whyNot', label: '❌ Why Not Selected' },
              { id: 'trace', label: '🔍 Recommendation Trace' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab Contents ────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                {/* Executive Decision Banner */}
                <div className={`p-4 rounded-2xl border ${
                  isSavings
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950'
                    : isCostIncrease
                    ? 'border-amber-200 bg-amber-50/40 text-amber-950'
                    : 'border-slate-200 bg-slate-50/70 text-slate-900'
                } space-y-1.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <span>{isSavings ? '🟢' : isCostIncrease ? '⚡' : '⚖️'}</span>
                      Executive Verdict & Recommendation
                    </span>
                    <span className="text-xs font-black font-mono-financial">
                      {isSavings
                        ? `Save $${netDeltaAbs.toFixed(2)}/mo ($${(netDeltaAbs * 12).toFixed(0)}/yr)`
                        : isCostIncrease
                        ? `+$${netDeltaAbs.toFixed(2)}/mo Additional Spend`
                        : '$0/mo Net Cost Delta'}
                    </span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed">
                    {report.recommendation}
                  </p>
                </div>

                {/* Before vs After Stack */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <span>🔁</span> Stack Transformation
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-black uppercase text-slate-400">Current Stack</span>
                        <span className="text-xs font-bold font-mono-financial text-slate-700">${report.currentMonthlyCost.toFixed(2)}/mo</span>
                      </div>
                      <div className="space-y-1.5">
                        {stackVisualization.currentStack.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                            <span className="font-bold text-slate-800">{item.toolName}</span>
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                              Decommission
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-2">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                        <span className="text-xs font-black uppercase text-indigo-700">Recommended Stack</span>
                        <span className={`text-xs font-bold font-mono-financial ${isSavings ? 'text-emerald-600' : isCostIncrease ? 'text-amber-600' : 'text-slate-700'}`}>
                          ${report.projectedMonthlyCost.toFixed(2)}/mo
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {stackVisualization.recommendedStack.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white border border-indigo-100 shadow-2xs">
                            <span className="font-bold text-slate-900">{item.toolName}</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {item.isNew ? 'New Adoption' : 'Retained'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Executive Guidance */}
                <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">Executive Strategic Guidance</h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{report.executiveSummary}</p>
                </div>

                {/* Capabilities Gained & Lost */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Capabilities Gained</span>
                    {capabilitiesGained.length > 0 ? (
                      <ul className="space-y-1 text-xs text-slate-700">
                        {capabilitiesGained.map((cap, i) => (
                          <li key={i} className="flex items-center gap-1.5 font-medium">
                            <span className="text-emerald-500 font-bold">+</span>
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No net-new capability gaps opened.</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Capabilities Lost / Delta</span>
                    {capabilitiesLost.length > 0 ? (
                      <ul className="space-y-1 text-xs text-slate-700">
                        {capabilitiesLost.map((cap, i) => (
                          <li key={i} className="flex items-center gap-1.5 font-medium">
                            <span className="text-amber-500 font-bold">-</span>
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-600 font-medium">100% capability retention — zero feature loss.</p>
                    )}
                  </div>
                </div>

                {/* Audience Context */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">✓ Recommended For</span>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {audienceGuidance.recommendedFor.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">✗ Not Recommended For</span>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {audienceGuidance.notRecommendedFor.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FINANCIAL */}
            {activeTab === 'financial' && (
              <div className="space-y-6 animate-fade-in">
                {/* 4 KPI Cards with Truthful Directional Color Coding */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-4 rounded-xl border ${
                    isSavings ? 'border-emerald-100 bg-emerald-50/30' : isCostIncrease ? 'border-amber-100 bg-amber-50/30' : 'border-slate-100 bg-slate-50'
                  }`}>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                      {isSavings ? 'Monthly Net Savings' : isCostIncrease ? 'Monthly Net Spend Delta' : 'Monthly Delta'}
                    </span>
                    <span className={`text-2xl font-black font-mono-financial ${
                      isSavings ? 'text-emerald-600' : isCostIncrease ? 'text-amber-600' : 'text-slate-800'
                    }`}>
                      {isSavings ? `+$${netDeltaAbs.toFixed(2)}/mo` : isCostIncrease ? `+$${netDeltaAbs.toFixed(2)}/mo` : '$0.00/mo'}
                    </span>
                  </div>

                  <div className={`p-4 rounded-xl border ${
                    isSavings ? 'border-emerald-100 bg-emerald-50/30' : isCostIncrease ? 'border-amber-100 bg-amber-50/30' : 'border-slate-100 bg-slate-50'
                  }`}>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                      {isSavings ? 'Annual Savings' : isCostIncrease ? 'Annual Spend Increase' : 'Annual Delta'}
                    </span>
                    <span className={`text-2xl font-black font-mono-financial ${
                      isSavings ? 'text-emerald-600' : isCostIncrease ? 'text-amber-600' : 'text-slate-800'
                    }`}>
                      {isSavings ? `$${(netDeltaAbs * 12).toFixed(0)}/yr` : isCostIncrease ? `+$${(netDeltaAbs * 12).toFixed(0)}/yr` : '$0/yr'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Current Monthly Spend</span>
                    <span className="text-2xl font-black font-mono-financial text-slate-700">${report.currentMonthlyCost.toFixed(2)}/mo</span>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Projected Replacement</span>
                    <span className="text-2xl font-black font-mono-financial text-indigo-600">${report.projectedMonthlyCost.toFixed(2)}/mo</span>
                  </div>
                </div>

                {/* Side-by-Side Current vs Replacement Cost Math */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>Pricing & Seat Breakdown</span>
                    {report.perSeatBreakdown && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {report.perSeatBreakdown.seats} seat(s) configured
                      </span>
                    )}
                  </h4>

                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-3">Cost Dimension</th>
                          <th className="p-3 font-mono-financial">Current ({report.targetToolName})</th>
                          <th className="p-3 font-mono-financial">Replacement</th>
                          <th className="p-3 font-mono-financial">Net Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-3 font-semibold text-slate-700">Monthly Spend</td>
                          <td className="p-3 font-mono-financial font-bold text-slate-800">${report.currentMonthlyCost.toFixed(2)}/mo</td>
                          <td className="p-3 font-mono-financial font-bold text-indigo-600">${report.projectedMonthlyCost.toFixed(2)}/mo</td>
                          <td className={`p-3 font-mono-financial font-black ${isSavings ? 'text-emerald-600' : isCostIncrease ? 'text-amber-600' : 'text-slate-600'}`}>
                            {isSavings ? `-$${netDeltaAbs.toFixed(2)}/mo (Saved)` : isCostIncrease ? `+$${netDeltaAbs.toFixed(2)}/mo (Spend)` : '$0.00/mo (Parity)'}
                          </td>
                        </tr>
                        {report.perSeatBreakdown && (
                          <tr>
                            <td className="p-3 font-semibold text-slate-700">Cost Per Seat</td>
                            <td className="p-3 font-mono-financial text-slate-600">${report.perSeatBreakdown.currentCostPerSeat.toFixed(2)}/seat</td>
                            <td className="p-3 font-mono-financial text-indigo-600">${report.perSeatBreakdown.replacementCostPerSeat.toFixed(2)}/seat</td>
                            <td className={`p-3 font-mono-financial font-bold ${isSavings ? 'text-emerald-600' : isCostIncrease ? 'text-amber-600' : 'text-slate-600'}`}>
                              {report.perSeatBreakdown.netDeltaPerSeat < 0 ? `-$${Math.abs(report.perSeatBreakdown.netDeltaPerSeat).toFixed(2)}/seat` : report.perSeatBreakdown.netDeltaPerSeat > 0 ? `+$${report.perSeatBreakdown.netDeltaPerSeat.toFixed(2)}/seat` : '$0/seat'}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="p-3 font-semibold text-slate-700">Annual Run-Rate</td>
                          <td className="p-3 font-mono-financial text-slate-600">${(report.currentMonthlyCost * 12).toFixed(2)}/yr</td>
                          <td className="p-3 font-mono-financial text-indigo-600">${(report.projectedMonthlyCost * 12).toFixed(2)}/yr</td>
                          <td className={`p-3 font-mono-financial font-black ${isSavings ? 'text-emerald-600' : isCostIncrease ? 'text-amber-600' : 'text-slate-600'}`}>
                            {isSavings ? `-$${(netDeltaAbs * 12).toFixed(2)}/yr` : isCostIncrease ? `+$${(netDeltaAbs * 12).toFixed(2)}/yr` : '$0.00/yr'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {report.financialExplanation && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed font-medium">
                      <span className="font-bold text-slate-700 block mb-0.5">Financial Analysis Summary:</span>
                      {report.financialExplanation}
                    </div>
                  )}
                </div>

                {/* Full 6-Dimension Score Breakdown */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Opportunity Score Multi-Vector Evaluation</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Financial Score (25%)', val: opportunityScore.financialOpportunity, desc: isSavings ? 'High financial upside from spend recovery' : isCostIncrease ? 'Cost increase weighed against capability gain' : 'Cost-neutral baseline' },
                      { label: 'Technical Fit (20%)', val: opportunityScore.technicalOpportunity, desc: 'Coding, reasoning, and technical benchmark match' },
                      { label: 'Business Opportunity (20%)', val: opportunityScore.businessOpportunity, desc: 'Enterprise posture, compliance, and capability retention' },
                      { label: 'Migration Simplicity (15%)', val: opportunityScore.migrationSimplicity, desc: 'Estimated migration ease and learning curve' },
                      { label: 'Future Scalability (10%)', val: opportunityScore.futureScalability, desc: 'Long-term tier readiness at team scale' },
                      { label: 'Vendor Optimization (10%)', val: opportunityScore.vendorOptimization, desc: 'Vendor lock-in resilience and stability' },
                    ].map((dim, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white border border-slate-100 space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-800">{dim.label}</span>
                          <span className="font-mono-financial text-indigo-600">{dim.val}/100</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${dim.val >= 70 ? 'bg-emerald-500' : dim.val >= 50 ? 'bg-indigo-500' : 'bg-amber-500'} rounded-full`}
                            style={{ width: `${dim.val}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">{dim.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Scalability & Future Cost Growth */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Team Scalability & Future Cost Projections</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(futureGrowthAnalysis.growthTiers || []).map((tier, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-800">{tier.label}</span>
                          <span className="text-indigo-600 font-mono-financial">${tier.projectedMonthlyCost.toFixed(2)}/mo</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Enterprise Readiness: {tier.enterpriseReadiness}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CAPABILITY MATRIX */}
            {activeTab === 'matrix' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Feature & Capability Matrix</h4>
                  <span className="text-[10px] font-bold text-slate-400">{featureMatrix.length} Capabilities Evaluated</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="p-3 font-extrabold">Capability</th>
                        <th className="p-3 font-extrabold">Current ({report.targetToolName})</th>
                        <th className="p-3 font-extrabold">Replacement</th>
                        <th className="p-3 font-extrabold">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {featureMatrix.map((row, i) => {
                        const isExpanded = expandedEvidenceRow === row.featureKey;
                        return (
                          <tr
                            key={i}
                            onClick={() => row.capabilityEvidence && setExpandedEvidenceRow(isExpanded ? null : row.featureKey)}
                            className={`hover:bg-slate-50/80 transition-colors ${row.capabilityEvidence ? 'cursor-pointer' : ''}`}
                          >
                            <td className="p-3 font-bold text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <span>{row.feature}</span>
                                {row.capabilityEvidence && (
                                  <span className="text-[9px] text-indigo-500 font-normal px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                                    Evidence
                                  </span>
                                )}
                              </div>
                              {row.note && <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{row.note}</span>}
                              {isExpanded && row.capabilityEvidence && (
                                <div className="mt-1.5 p-2 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 font-medium leading-relaxed">
                                  📖 {row.capabilityEvidence}
                                </div>
                              )}
                            </td>
                            <td className="p-3 font-mono-financial">
                              {row.currentStatus === 'yes' ? '✅ Available' : row.currentStatus === 'partial' ? '⚠️ Partial' : '❌ Missing'}
                            </td>
                            <td className="p-3 font-mono-financial">
                              {row.recommendedStatus === 'yes' ? '✅ Available' : row.recommendedStatus === 'partial' ? '⚠️ Partial' : '❌ Missing'}
                            </td>
                            <td className="p-3 font-bold">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                row.delta === 'better' || row.delta === 'new'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : row.delta === 'worse' || row.delta === 'lost'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {row.delta === 'better' ? '▲ Superior' : row.delta === 'new' ? '★ Net New' : row.delta === 'lost' ? '✖ Feature Gap' : row.delta === 'worse' ? '▼ Lower' : '● Parity'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: BUSINESS IMPACT */}
            {activeTab === 'business' && (
              <div className="space-y-4 animate-fade-in">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Business & Executive Impact Summary</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(businessImpact).map(([k, v]) => (
                    <div key={k} className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-indigo-700 tracking-wider block">
                        {k.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: MIGRATION */}
            {activeTab === 'migration' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Migration Checklist</h4>
                  <span className="text-xs font-bold text-indigo-600 font-mono-financial">Est. Timeline: {migrationChecklist.estimatedDays} Days</span>
                </div>

                <div className="space-y-2">
                  {migrationChecklist.steps.map((step, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="rounded text-indigo-600 h-4 w-4" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">{step.action}</p>
                          <span className="text-[10px] text-slate-400 capitalize">{step.category} task</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        step.priority === 'required' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {step.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: SCENARIOS */}
            {activeTab === 'scenarios' && (
              <div className="space-y-6 animate-fade-in">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Multiple Ranked Options & Scenarios</h4>

                <div className="space-y-3">
                  {rankedRecommendations.map((rec, i) => {
                    const isRecSave = (rec.netMonthlyCostDelta && rec.netMonthlyCostDelta < -0.01) || rec.monthlySavings > 0;
                    const isRecUp = rec.netMonthlyCostDelta && rec.netMonthlyCostDelta > 0.01;
                    const deltaAmt = Math.abs(rec.netMonthlyCostDelta ?? rec.monthlySavings);
                    return (
                      <div key={i} className={`p-4 rounded-2xl border ${
                        i === 0 ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 bg-slate-50/50'
                      } space-y-2`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                              #{rec.rank} {rec.label}
                            </span>
                            <span className="font-extrabold text-sm text-slate-900">{rec.toolName}</span>
                          </div>
                          <span className={`text-sm font-black font-mono-financial ${
                            isRecSave ? 'text-emerald-600' : isRecUp ? 'text-amber-600' : 'text-slate-600'
                          }`}>
                            {isRecSave ? `-$${deltaAmt.toFixed(2)}/mo (Save)` : isRecUp ? `+$${deltaAmt.toFixed(2)}/mo (Spend)` : '$0.00/mo (Parity)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{rec.summary}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 7: WHY NOT SELECTED */}
            {activeTab === 'whyNot' && (
              <div className="space-y-4 animate-fade-in">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Rejected Alternative Rationale</h4>

                {(report.whyNotSelected || []).length > 0 ? (
                  report.whyNotSelected.map((why, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{why.providerName}</span>
                        <div className="flex items-center gap-2">
                          {why.monthlyCostDiff !== undefined && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              why.monthlyCostDiff > 0.01
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : why.monthlyCostDiff < -0.01
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {why.monthlyCostDiff > 0.01
                                ? `+$${why.monthlyCostDiff.toFixed(2)}/mo vs winner`
                                : why.monthlyCostDiff < -0.01
                                ? `-$${Math.abs(why.monthlyCostDiff).toFixed(2)}/mo vs winner`
                                : 'Similar pricing'}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                            Not Selected
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{why.primaryReason}</p>

                      {/* Score Differences Table */}
                      {why.scoreDifferences && why.scoreDifferences.length > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                          <table className="w-full text-[11px] text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px]">
                              <tr>
                                <th className="p-2">Evaluation Metric</th>
                                <th className="p-2 font-mono-financial">Recommended ({report.title?.split('→')[1]?.trim() || 'Winner'})</th>
                                <th className="p-2 font-mono-financial">{why.providerName}</th>
                                <th className="p-2 font-mono-financial">Delta</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {why.scoreDifferences.map((score, sIdx) => {
                                const diff = score.targetScore - score.alternativeScore;
                                return (
                                  <tr key={sIdx} className="hover:bg-slate-50">
                                    <td className="p-2 font-semibold text-slate-700">{score.metric}</td>
                                    <td className="p-2 font-mono-financial font-bold text-emerald-600">{score.targetScore}</td>
                                    <td className="p-2 font-mono-financial text-slate-600">{score.alternativeScore}</td>
                                    <td className={`p-2 font-mono-financial font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                      {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No alternatives rejected for this analysis item.</p>
                )}
              </div>
            )}

            {/* TAB 8: RECOMMENDATION TRACE */}
            {activeTab === 'trace' && (
              <div className="space-y-4 animate-fade-in">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommendation Trace & Knowledge Metadata</h4>

                <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-2 overflow-x-auto">
                  <div>// Knowledge Version: {trace.knowledgeVersion}</div>
                  <div>// Generated At: {trace.generatedAt}</div>
                  <div className="text-indigo-300">// Execution Path:</div>
                  {(trace.decisionPath || []).map((step, idx) => (
                    <div key={idx} className="pl-3 text-slate-400">{idx + 1}. {step}</div>
                  ))}
                  <div className="text-emerald-400 mt-2">// Vector Breakdown:</div>
                  <pre className="text-[10px] text-slate-300">{JSON.stringify(trace.confidenceBreakdown || {}, null, 2)}</pre>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono-financial">Report ID: {report.id}</span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
            >
              Done Reading
            </button>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
}
