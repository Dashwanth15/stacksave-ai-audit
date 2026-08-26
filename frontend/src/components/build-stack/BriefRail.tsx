// ============================================================
// BriefRail — The executive "Your Stack Brief" panel.
// Clean, institutional stepper summary that displays decisions
// as the user configures, with click-to-edit capability.
// Read-only view of wizard state with dark, bold, high-contrast text.
// ============================================================

import { domainTitle, strategyTitle, STEPS } from './wizardData';
import type { StackStrategy } from '../../types';

interface BriefRailProps {
  step: number;
  maxStepReached: number;
  onStepClick: (n: number) => void;
  domain: string;
  teamSize: number;
  noBudget: boolean;
  budget: number;
  requirements: string[];
  strategy: StackStrategy;
}

type RowStatus = 'done' | 'active' | 'upcoming';

function StatusDot({ status }: { status: RowStatus }) {
  if (status === 'done') {
    return (
      <span className="flex items-center justify-center w-5.5 h-5.5 rounded-full bg-emerald-600 shadow-xs">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="flex items-center justify-center w-5.5 h-5.5 rounded-full border-2 border-[#1E3A5F] bg-[#1E3A5F]/15 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-[#1E3A5F]" />
      </span>
    );
  }
  return <span className="flex w-5.5 h-5.5 rounded-full border-2 border-slate-400 bg-slate-100" />;
}

export default function BriefRail({
  step,
  maxStepReached,
  onStepClick,
  domain,
  teamSize,
  noBudget,
  budget,
  requirements,
  strategy,
}: BriefRailProps) {
  const valueFor = (key: string): { text: string; set: boolean } => {
    switch (key) {
      case 'domain':
        return domain
          ? { text: domainTitle(domain), set: true }
          : { text: 'Not selected', set: false };
      case 'scale':
        return {
          text: `${teamSize.toLocaleString()} ${teamSize === 1 ? 'person' : 'people'} · ${
            noBudget ? 'No ceiling' : `$${budget.toLocaleString()}/mo`
          }`,
          set: true,
        };
      case 'capabilities':
        return requirements.length > 0
          ? {
              text: `${requirements.length} ${requirements.length === 1 ? 'capability' : 'capabilities'} selected`,
              set: true,
            }
          : { text: 'None selected', set: false };
      case 'strategy':
        return { text: strategyTitle(strategy), set: true };
      default:
        return { text: '', set: false };
    }
  };

  const perSeat = noBudget ? null : Math.round(budget / Math.max(1, teamSize));

  return (
    <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-md overflow-hidden">
      {/* House accent top line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#1E3A5F] via-[#244874] to-emerald-500" />

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-950">Your Stack Brief</h2>
          <span className="text-xs font-black text-[#1E3A5F] bg-[#1E3A5F]/10 px-2.5 py-1 rounded-md border border-[#1E3A5F]/20 tabular-nums">
            Step {step} of 4
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-700 font-bold">Assembled as you decide</p>

        {/* ── Decision rows ── */}
        <div className="mt-4 divide-y-2 divide-slate-100">
          {STEPS.map((s) => {
            const status: RowStatus =
              s.n === step ? 'active' : s.n <= maxStepReached ? 'done' : 'upcoming';
            const { text, set } = valueFor(s.key);
            const reachable = s.n <= maxStepReached && s.n !== step;

            return (
              <button
                key={s.n}
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onStepClick(s.n)}
                className={`group flex w-full items-start gap-3.5 py-3.5 text-left transition-colors duration-150 ${
                  reachable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  <StatusDot status={status} />
                </span>

                <span className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`block text-xs font-black uppercase tracking-wider leading-tight ${
                        status === 'active'
                          ? 'text-[#1E3A5F]'
                          : status === 'done'
                          ? 'text-emerald-800'
                          : 'text-slate-700'
                      }`}
                    >
                      {s.numeral} · {s.eyebrow}
                    </span>
                    {reachable && (
                      <span className="text-xs font-black text-[#1E3A5F] opacity-0 transition-opacity group-hover:opacity-100 underline">
                        Edit
                      </span>
                    )}
                  </div>
                  <span
                    className={`mt-1 block truncate text-[14px] sm:text-[14.5px] leading-snug tracking-tight ${
                      set
                        ? 'font-black text-slate-950'
                        : 'font-bold text-slate-600'
                    } ${reachable ? 'group-hover:text-[#1E3A5F]' : ''}`}
                  >
                    {text}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Live spend readout ── */}
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 border-2 border-slate-300 p-4 text-center shadow-xs">
          <div>
            <div className="text-base sm:text-lg font-black text-slate-950 tabular-nums">
              {teamSize.toLocaleString()}
            </div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 mt-1">
              Seats
            </div>
          </div>
          <div className="border-x-2 border-slate-300">
            <div className="text-base sm:text-lg font-black text-slate-950 tabular-nums">
              {noBudget ? '—' : `$${budget.toLocaleString()}`}
            </div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 mt-1">
              Team / mo
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-[#1E3A5F] tabular-nums">
              {perSeat === null ? '—' : `$${perSeat.toLocaleString()}`}
            </div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 mt-1">
              Per seat
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
