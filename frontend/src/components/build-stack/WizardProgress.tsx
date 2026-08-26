// ============================================================
// WizardProgress — the slim top progress bar (all breakpoints) and
// a compact, clickable stepper shown on mobile/tablet, where the
// full BriefRail is tucked into a disclosure instead of a column.
// ============================================================

import { m } from 'framer-motion';
import type { WizardStep } from './wizardData';

interface WizardProgressProps {
  steps: WizardStep[];
  step: number;
  maxStepReached: number;
  onStepClick: (n: number) => void;
}

export default function WizardProgress({ steps, step, maxStepReached, onStepClick }: WizardProgressProps) {
  const progressPercent = ((step - 1) / (steps.length - 1)) * 100;
  const current = steps[step - 1];

  return (
    <>
      {/* Slim top bar — navy→emerald fill ties into the Brief accent */}
      <div className="w-full h-1 bg-slate-100">
        <m.div
          className="h-full bg-gradient-to-r from-[#1E3A5F] to-emerald-500"
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Compact stepper — mobile / tablet only */}
      <div className="lg:hidden border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-serif-display text-lg leading-none text-[#1E3A5F] font-bold">
              {current.numeral}
            </span>
            <span className="text-xs font-bold text-slate-900 truncate">{current.eyebrow}</span>
            <span className="text-xs font-semibold text-slate-600 shrink-0">· {step} of {steps.length}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {steps.map((s) => {
              const reachable = s.n <= maxStepReached;
              const state = s.n === step ? 'active' : s.n < step ? 'done' : s.n <= maxStepReached ? 'done' : 'upcoming';
              return (
                <button
                  key={s.n}
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && onStepClick(s.n)}
                  aria-label={`Step ${s.n}: ${s.eyebrow}`}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    state === 'active'
                      ? 'w-6 bg-[#1E3A5F]'
                      : state === 'done'
                      ? 'w-3 bg-emerald-500 cursor-pointer'
                      : 'w-1.5 bg-slate-200 cursor-not-allowed'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
