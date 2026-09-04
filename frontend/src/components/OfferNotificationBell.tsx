// ============================================================
// OfferNotificationBell — StackSave AI Pricing & Offer Intelligence
// Deterministic notification bell with compact preview popover
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { fetchPublicOffers } from '../services/api';
import type { PublicOffer } from '../types';
import { trackNotificationOpened } from '../utils/analytics';

const CACHE_KEY = 'stacksave_cached_offers';

export default function OfferNotificationBell() {
  const navigate = useNavigate();

  // Load cached offers synchronously on mount to eliminate count flicker
  const [offers, setOffers] = useState<PublicOffer[]>(() => {
    try {
      const saved = window.localStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore localStorage errors
    }
    return [];
  });

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [caretRight, setCaretRight] = useState<string>('18px');

  // Fetch live public offers from official backend API on mount
  useEffect(() => {
    let isMounted = true;
    fetchPublicOffers()
      .then((res) => {
        if (isMounted && res && Array.isArray(res.offers) && res.offers.length > 0) {
          setOffers(res.offers);
          try {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify(res.offers));
          } catch {
            // ignore localStorage errors
          }
        }
      })
      .catch((err) => {
        console.warn('Could not load public offers:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute unique offers count dynamically
  const availableCount = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    for (const raw of offers) {
      const key = `${(raw.providerId || '').toLowerCase().trim()}:${(raw.title || '').toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        count++;
      }
    }
    return count;
  }, [offers]);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Dynamic mobile viewport clamping so dropdown never clips or causes horizontal overflow
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;

      if (screenWidth < 640) {
        const popoverWidth = Math.min(250, screenWidth - 24);
        const bellCenter = rect.left + rect.width / 2;
        let idealLeft = bellCenter - popoverWidth / 2;
        // Clamp to viewport edges with minimum 12px margin
        if (idealLeft < 12) idealLeft = 12;
        if (idealLeft + popoverWidth > screenWidth - 12) {
          idealLeft = screenWidth - 12 - popoverWidth;
        }
        const relativeLeft = idealLeft - rect.left;
        setPopoverStyle({
          position: 'absolute',
          top: '100%',
          left: `${Math.round(relativeLeft)}px`,
          right: 'auto',
          width: `${popoverWidth}px`,
        });

        const caretFromLeft = bellCenter - idealLeft;
        const caretFromRight = popoverWidth - caretFromLeft - 6;
        setCaretRight(`${Math.max(12, Math.min(popoverWidth - 20, Math.round(caretFromRight)))}px`);
      } else {
        setPopoverStyle({});
        setCaretRight('18px');
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen]);

  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        trackNotificationOpened();
      }
      return next;
    });
  };

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* ── Bell Icon Button (Independent ~44x44px touch target) ────── */}
      <button
        type="button"
        onClick={handleBellClick}
        className={`relative w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border transition-all duration-150 flex items-center justify-center cursor-pointer select-none active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
          isOpen
            ? 'bg-slate-100 border-slate-300 text-slate-950 shadow-2xs'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 shadow-2xs hover:border-slate-300'
        }`}
        aria-label={`AI Offers and Intelligence Notifications (${availableCount} available offers)`}
        aria-expanded={isOpen}
        title="AI Offers & Pricing Intelligence"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {availableCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold leading-none text-white bg-emerald-600 rounded-full ring-2 ring-white shadow-xs tabular-nums pointer-events-none">
            {availableCount}
          </span>
        )}
      </button>

      {/* ── Compact Notification Dropdown ────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop to catch outside taps and prevent accidental click through */}
            <div
              className="fixed inset-0 bg-transparent z-40 sm:hidden"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-hidden="true"
            />

            <m.div
              initial={{ opacity: 0, y: 5, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -3, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={popoverStyle}
              className="absolute right-0 top-full mt-2 w-[240px] sm:w-[260px] p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_12px_32px_-6px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.04)] z-50 text-left select-none box-border"
            >
              {/* Caret Pointer Arrow directed toward bell */}
              <div
                className="absolute -top-1.5 w-3 h-3 bg-white border-t border-l border-slate-200/90 rotate-45 pointer-events-none"
                style={{ right: caretRight }}
              />

              <div className="relative z-10">
                {/* Header row: Status + Offer count + Close button */}
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 leading-none">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="tabular-nums">
                        <span className="font-extrabold text-slate-950">{availableCount}</span> {availableCount === 1 ? 'available offer' : 'available offers'}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 mt-1.5 leading-snug">
                      New AI pricing updates
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 rounded hover:bg-slate-100 transition-colors cursor-pointer text-xs"
                    title="Close"
                    aria-label="Close notification"
                  >
                    ✕
                  </button>
                </div>

                {/* Divider */}
                <div className="my-2.5 border-t border-slate-100" />

                {/* Action CTA: See all offers (Only clicking this navigates to /offers) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    navigate('/offers');
                  }}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer group py-1 focus:outline-none"
                >
                  <span>See all offers</span>
                  <span className="text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all">→</span>
                </button>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
