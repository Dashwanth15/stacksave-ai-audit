// ============================================================
// GeneratingOverlay — 6-Step Autonomous Procurement Analysis Sequence
//
// Shown while the AI stack generation request is in-flight.
// Presents a calibrated, professional analysis sequence that
// communicates the depth of the intelligence synthesis without
// artificial delay or chatbot typing effects.
//
// Purely presentational — triggers no requests and reflects
// nothing back into wizard state. Reduced-motion collapses it
// to a fully-revealed static state immediately.
// ============================================================

import { useEffect, useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { domainTitle, strategyTitle } from './wizardData';
import type { StackStrategy } from '../../types';

interface GeneratingOverlayProps {
  domain: string;
  strategy: StackStrategy;
}

const STEP_DURATION_MS = 250;

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
      <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function GeneratingOverlay({ domain, strategy }: GeneratingOverlayProps) {
  const reduce = useReducedMotion();

  const steps = [
    { num: '01', label: 'Reading team workflow profile', sub: domain ? domainTitle(domain) : 'Specified requirements' },
    { num: '02', label: 'Mapping requested capability & governance specs', sub: 'Filtering compatibility constraints' },
    { num: '03', label: 'Evaluating provider knowledge graph & benchmark fits', sub: 'Scoring reasoning depth & domain velocity' },
    { num: '04', label: 'Checking financial ceiling & headroom clearance', sub: 'Validating per-seat subscription economics' },
    { num: '05', label: 'Synthesizing candidate multi-tool architectures', sub: `Applying ${strategyTitle(strategy).toLowerCase()} stance` },
    { num: '06', label: 'Assembling recommended procurement stack', sub: 'Finalizing optimal acquisition brief' },
  ];

  const [activeStep, setActiveStep] = useState(reduce ? steps.length : 0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setActiveStep(i => (i < steps.length ? i + 1 : i));
    }, STEP_DURATION_MS);
    return () => clearInterval(id);
  }, [reduce, steps.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F8FAFC]/94 px-4 backdrop-blur-[3px]">
      <m.div
        role="status"
        aria-live="polite"
        aria-label="Generating AI procurement stack recommendation"
        initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="w-full max-w-[460px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Top accent line */}
        <div className="h-[3.5px] bg-[#1E3A5F]" />

        <div className="px-7 py-6.5">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1E3A5F] bg-[#1E3A5F]/[0.08] px-2 py-0.5 rounded border border-[#1E3A5F]/15">
                StackSave Engine
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Procurement Synthesis
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">
              Synthesizing AI Stack Architecture
            </h2>
            <p className="text-[13px] text-slate-600 mt-1 font-normal leading-snug">
              {domain ? domainTitle(domain) : 'Enterprise Team'} ·{' '}
              <strong className="text-slate-900 font-semibold">{strategyTitle(strategy)}</strong> Strategy
            </p>
          </div>

          {/* 6-Step Staggered List */}
          <ul className="space-y-0 divide-y divide-slate-100">
            {steps.map((step, i) => {
              const done = i < activeStep;
              const current = i === activeStep;
              const pending = i > activeStep;

              return (
                <m.li
                  key={step.label}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: pending ? 0.35 : 1, x: 0 }}
                  transition={{ duration: 0.2, delay: reduce ? 0 : i * 0.04 }}
                  className="flex items-center gap-3.5 py-2.5"
                >
                  {/* Step status / index badge */}
                  <div className={`w-5.5 h-5.5 rounded-md shrink-0 flex items-center justify-center text-[10.5px] font-bold transition-all duration-200 ${
                    done
                      ? 'bg-emerald-600 text-white'
                      : current
                      ? 'border-2 border-[#1E3A5F] bg-[#1E3A5F]/[0.08] text-[#1E3A5F]'
                      : 'border border-slate-200 bg-slate-50 text-slate-400'
                  }`}>
                    {done ? <CheckIcon /> : step.num}
                  </div>

                  {/* Step label */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-[13px] leading-tight block transition-colors duration-200 ${
                      done ? 'text-slate-500 font-medium' : current ? 'text-slate-950 font-bold' : 'text-slate-400 font-normal'
                    }`}>
                      {step.label}
                    </span>
                    <AnimatePresence>
                      {current && !reduce && (
                        <m.span
                          key="sub"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="text-[11px] text-[#1E3A5F] font-medium block mt-0.5 overflow-hidden"
                        >
                          {step.sub}
                        </m.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Done status tag */}
                  {done && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 shrink-0">
                      Done
                    </span>
                  )}
                  {current && (
                    <span className="w-2 h-2 rounded-full bg-[#1E3A5F] animate-pulse shrink-0" />
                  )}
                </m.li>
              );
            })}
          </ul>

          {/* Skeleton Preview Footer */}
          <div className="mt-4.5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Multi-Provider Model Optimization Active</span>
            </span>
            <span className="text-[11px] font-bold text-slate-400 tabular-nums">
              {Math.min(100, Math.round((activeStep / steps.length) * 100))}%
            </span>
          </div>
        </div>
      </m.div>
    </div>
  );
}

