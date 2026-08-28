/**
 * Audited Configuration Display
 * 
 * Shows the actual user-submitted inputs from the StackBuilderRequest,
 * sourced from the backend trace.inputs to prove real backend-driven recommendations.
 */

import { m } from 'framer-motion';
import { DOMAIN_OPTIONS, OPTIMIZATION_GOAL_OPTIONS } from './wizardData';

interface AuditedConfigurationProps {
  trace?: unknown;
}

export default function AuditedConfiguration({
  trace
}: AuditedConfigurationProps) {
  const inputs = (trace as any)?.inputs;
  if (!inputs) return null;

  // Find friendly labels
  const domainLabel = inputs.domainLabel || DOMAIN_OPTIONS.find((d: any) => d.id === inputs.domain)?.title || inputs.domain;
  const optimizationLabel = OPTIMIZATION_GOAL_OPTIONS.find(
    (opt: any) => opt.id === inputs.optimizationGoal
  )?.title || inputs.optimizationGoal || 'Balanced Approach';

  const budgetDisplay = inputs.monthlyBudget 
    ? `$${inputs.monthlyBudget.toLocaleString()}/month`
    : 'No Hard Limit';

  const items = [
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
      label: 'Engineering Focus',
      value: domainLabel,
      key: 'focus'
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      label: 'Optimization Goal',
      value: optimizationLabel,
      key: 'goal'
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      label: 'Team Size',
      value: `${inputs.teamSize} ${inputs.teamSize === 1 ? 'seat' : 'seats'}`,
      key: 'team'
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      ),
      label: 'Monthly Budget',
      value: budgetDisplay,
      key: 'budget'
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
      label: 'Selected Requirements',
      value: `${inputs.requirements.length} ${inputs.requirements.length === 1 ? 'requirement' : 'requirements'}`,
      key: 'reqs'
    }
  ];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-6 py-5 sm:py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-950">
            Audited Configuration
          </h2>
          <span className="ml-auto text-[10px] font-mono text-slate-400">From Request</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Your actual selections submitted to StackSave — these real values drive the backend recommendation engine.
        </p>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {items.map((item, idx) => (
            <m.div
              key={item.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: idx * 0.05,
                ease: [0.22, 1, 0.36, 1]
              }}
              className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-200/60 shadow-xs hover:border-slate-300 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200/60">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 leading-none">
                  {item.label}
                </p>
                <p className="text-sm font-bold text-slate-950 mt-1.5 break-words">
                  {item.value}
                </p>
              </div>
            </m.div>
          ))}
        </div>

        {/* Requirements Details */}
        {inputs.requirements.length > 0 && (
          <div className="mt-2 pt-3 border-t border-slate-200/60 space-y-2">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              Selected Requirements:
            </p>
            <div className="flex flex-wrap gap-2">
              {inputs.requirements.map((req: any, idx: number) => (
                <m.span
                  key={req}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.3 + idx * 0.03 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/60 text-[11px] font-semibold text-emerald-900"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  <span>{req.replace(/-/g, ' ')}</span>
                </m.span>
              ))}
            </div>
          </div>
        )}

        {/* Trust Indicator */}
        <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-2 text-[10.5px] text-slate-600">
          <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>
            <strong>These values</strong> are sourced directly from your submission and drive the backend recommendation algorithm.
          </span>
        </div>
      </div>
    </div>
  );
}
