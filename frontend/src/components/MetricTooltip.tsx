// ============================================================
// MetricTooltip — StackSave Architecture Intelligence Tooltips
// Premium SaaS hover / focus / touch explanation popover for
// Domain Fit and Requirement Match metrics.
// 100% Portal-based to eliminate carousel / overflow-x clipping.
// ============================================================

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';

export type MetricType = 'domainFit' | 'requirementMatch';

export interface MetricTooltipProps {
  type: MetricType;
  score?: number;
  domainName?: string;
  qualitativeFit?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Clean, subtle 14x14 information indicator aligned with StackSave typography.
 */
export function MetricInfoIcon({ className = 'w-3 h-3 text-slate-400 group-hover/tooltip:text-slate-600 transition-colors inline-block pointer-events-none shrink-0' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" />
      <line x1="8" y1="7.2" x2="8" y2="11.5" />
      <circle cx="8" cy="4.8" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface TooltipCoords {
  left: number;
  top?: number;
  bottom?: number;
  placement: 'top' | 'bottom';
}

export default function MetricTooltip({
  type,
  score,
  domainName,
  qualitativeFit,
  children,
  className = '',
}: MetricTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords>({
    left: 0,
    placement: 'top',
  });

  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 280;
    const padding = 12;

    // Horizontal positioning: centered over trigger, clamped to viewport edges
    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - tooltipWidth / 2;
    left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

    // Vertical positioning:
    // If there is >= 170px space above the trigger, place above using `bottom`.
    // Otherwise place below using `top`.
    // Using `bottom` guarantees the tooltip's bottom edge is ALWAYS 8px above the trigger,
    // so it can NEVER overlap the trigger or cursor regardless of tooltip height.
    const spaceAbove = rect.top;
    const placeAbove = spaceAbove >= 170;

    setCoords({
      left,
      placement: placeAbove ? 'top' : 'bottom',
      bottom: placeAbove ? Math.round(window.innerHeight - rect.top + 8) : undefined,
      top: placeAbove ? undefined : Math.round(rect.bottom + 8),
    });
  }, []);

  const handleOpen = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  const handleClose = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
  }, []);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen((prev) => {
      if (!prev) updatePosition();
      return !prev;
    });
  }, [updatePosition]);

  // Close on outside clicks (for mobile tap interactions)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    let rafId: number | null = null;
    function handleScrollOrResize() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (isOpen) updatePosition();
      });
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const isDomain = type === 'domainFit';
  const title = isDomain ? 'Domain Fit' : 'Requirement Match';
  const description = isDomain
    ? "How well this platform's capabilities fit your selected work domain."
    : 'How closely this platform satisfies the specific requirements you provided.';

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        onClick={handleToggle}
        onPointerDown={(e) => e.stopPropagation()}
        tabIndex={0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        className={`group/tooltip inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/40 focus-visible:ring-offset-1 rounded-sm cursor-help ${className}`}
      >
        {children}
      </span>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <m.div
                id={tooltipId}
                ref={tooltipRef}
                role="tooltip"
                initial={{
                  opacity: 0,
                  y: coords.placement === 'top' ? 4 : -4,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: coords.placement === 'top' ? 3 : -3,
                }}
                transition={{
                  duration: 0.12,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'fixed',
                  top: coords.top !== undefined ? `${coords.top}px` : undefined,
                  bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                  left: `${coords.left}px`,
                  width: '280px',
                  zIndex: 99999,
                }}
                className="pointer-events-none rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3.5 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.14),0_4px_12px_-2px_rgba(15,23,42,0.06)] text-left select-none text-slate-800"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A5F] shrink-0" />
                    <h5 className="text-xs font-bold text-slate-950 tracking-tight leading-none truncate">
                      {title}
                    </h5>
                  </div>
                  {score !== undefined && (
                    <span className="text-[11px] font-black tabular-nums text-[#1E3A5F] bg-[#1E3A5F]/10 px-2 py-0.5 rounded-md border border-[#1E3A5F]/20 shrink-0 leading-none font-mono">
                      {score}%
                    </span>
                  )}
                </div>

                {/* Primary Meaning Description */}
                <p className="text-[11.5px] leading-relaxed text-slate-600 font-normal mt-2">
                  {description}
                </p>

                {/* Contextual Clarification Box */}
                <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10.5px] leading-snug text-slate-600">
                  {isDomain ? (
                    <>
                      <div className="flex items-center justify-between gap-1 font-bold text-slate-800 mb-0.5">
                        <span className="truncate">{domainName || 'Work Domain Context'}</span>
                        {qualitativeFit && (
                          <span className="text-[#1E3A5F] font-bold shrink-0 text-[10px] bg-[#1E3A5F]/5 px-1.5 py-0.5 rounded border border-[#1E3A5F]/15">
                            {qualitativeFit}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 block">
                        Evaluates overall workflow suitability for this domain, distinct from individual feature matching.
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-slate-800 mb-0.5">
                        Selected Capabilities Match
                      </div>
                      <span className="text-slate-500 block">
                        Evaluates how closely this platform satisfies the specific operational features you requested.
                      </span>
                    </>
                  )}
                </div>
              </m.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
