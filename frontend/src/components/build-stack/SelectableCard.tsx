// ============================================================
// SelectableCard — the single, consistent selection surface for
// the Build My AI Stack wizard (domains, capabilities, strategies).
//
// Rest → hover → selected → focus states are unified here so every
// choice in the flow reads the same way: navy border + faint navy
// wash + an emerald "confirmed" check + a subtle lift.
// Fully keyboard operable (Enter / Space), aria-pressed for state.
// ============================================================

import type { ReactNode } from 'react';

interface SelectableCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  /** Optional inline SVG path (24×24, stroke=currentColor) for the icon tile. */
  iconPath?: string;
  /** Small muted overline shown under the title (e.g. a category label). */
  overline?: string;
  description?: string;
  /** Extra content rendered below the description (e.g. strategy trade-offs). */
  children?: ReactNode;
  /** Multi-select cards use a square indicator; single-select use a circle. */
  multi?: boolean;
  className?: string;
}

const NAVY = '#1E3A5F';
const NAVY_WASH = 'rgba(30, 58, 95, 0.05)';

export default function SelectableCard({
  selected,
  onSelect,
  title,
  iconPath,
  overline,
  description,
  children,
  multi = false,
  className = '',
}: SelectableCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={selected ? { borderColor: NAVY, background: NAVY_WASH } : undefined}
      className={`group relative flex flex-col text-left rounded-xl border-2 p-5 pr-13 cursor-pointer outline-none
        transition-all duration-200 ease-out
        ${selected
          ? 'shadow-md ring-2 ring-[#1E3A5F]/20 -translate-y-0.5'
          : 'bg-white border-slate-300 shadow-xs hover:border-[#1E3A5F] hover:shadow-md hover:-translate-y-0.5'
        }
        ${className}`}
    >
      {/* Confirmation indicator — outline ring/box at rest, emerald check when chosen */}
      <span
        aria-hidden="true"
        className={`absolute top-4.5 right-4.5 flex items-center justify-center w-6 h-6 border-2 transition-all duration-200 ease-out
          ${multi ? 'rounded-md' : 'rounded-full'}
          ${selected
            ? 'bg-emerald-600 border-emerald-600 shadow-xs scale-100'
            : 'bg-white border-slate-400 group-hover:border-[#1E3A5F] group-hover:scale-105'
          }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          className={`w-3.5 h-3.5 transition-all duration-200 ease-out ${selected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>

      <div className="flex items-start gap-3.5">
        {iconPath && (
          <span
            style={selected ? { backgroundColor: NAVY } : undefined}
            className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200 ease-out
              ${selected ? 'text-white border-[#1E3A5F] shadow-xs' : 'bg-slate-100 border-slate-200 text-slate-900 group-hover:bg-[#1E3A5F]/10 group-hover:text-[#1E3A5F] group-hover:border-[#1E3A5F]/30'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
            </svg>
          </span>
        )}

        <div className="min-w-0 flex-1">
          {overline && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-[0.06em] mb-1.5 transition-all duration-200 ${selected
                  ? 'bg-[#1E3A5F] text-white shadow-xs'
                  : 'bg-[#1E3A5F]/[0.07] text-[#1E3A5F] group-hover:bg-[#1E3A5F]/[0.12]'
                }`}
            >
              {overline}
            </span>
          )}
          <h3
            className={`text-base sm:text-[16.5px] font-bold tracking-tight leading-snug transition-colors duration-200 ${selected ? 'text-slate-950 font-extrabold' : 'text-slate-900'
              }`}
          >
            {title}
          </h3>
          {description && (
            <p
              className={`mt-1.5 text-[13.5px] leading-relaxed transition-colors duration-200 ${selected ? 'text-slate-800 font-medium' : 'text-slate-700 font-normal'
                }`}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {children && <div className="mt-3.5 pt-3 border-t border-slate-200/70">{children}</div>}
    </div>
  );
}
