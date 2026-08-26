// ============================================================
// StepHeader — the left-canvas heading for each wizard step.
// The DM Serif Display numeral (01–04) is the flow's signature:
// the steps are a genuine ordered sequence, so an editorial numeral
// earns its place. Eyebrow + plain-language title carry the rest.
// ============================================================

import type { ReactNode } from 'react';

interface StepHeaderProps {
  numeral: string;
  eyebrow: string;
  title: string;
  /** Optional right-aligned readout (e.g. a live capability count). */
  aside?: ReactNode;
}

export default function StepHeader({ numeral, eyebrow, title, aside }: StepHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 sm:mb-7">
      <div className="flex items-center gap-4 sm:gap-5">
        <span
          className="font-serif-display text-[#1E3A5F] leading-none select-none text-5xl sm:text-6xl"
          aria-hidden="true"
        >
          {numeral}
        </span>
        <span className="block w-px self-stretch bg-slate-300" aria-hidden="true" />
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
            {eyebrow}
          </div>
          <h1 className="mt-1 text-xl sm:text-[26px] font-extrabold tracking-tight text-slate-950">
            {title}
          </h1>
        </div>
      </div>
      {aside && <div className="shrink-0 pb-1">{aside}</div>}
    </div>
  );
}
