// ============================================================
// OfferNotificationBell — StackSave AI Pricing & Offer Intelligence
// Mature SaaS notification bell with persistent hint popover & spacious high-contrast panel
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { fetchPublicOffers } from '../services/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import ProviderLogo from './ProviderLogo';
import { formatOfferForDisplay, formatCompactTime } from '../utils/offerFormatter';
import type { PublicOffer } from '../types';


export default function OfferNotificationBell() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [readOfferIds, setReadOfferIds] = useLocalStorage<string[]>('stacksave_read_offer_ids', []);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load public offers from official backend API on mount
  useEffect(() => {
    let isMounted = true;
    fetchPublicOffers()
      .then((res) => {
        if (isMounted && res && Array.isArray(res.offers)) {
          setOffers(res.offers);

          // Show floating hint persistently until user clicks the bell
          const count = res.offers.length;
          const alreadyDismissed = sessionStorage.getItem('stacksave_hint_dismissed');
          if (count > 0 && !alreadyDismissed) {
            setShowHint(true);
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

  // Deduplicate offers semantically by providerId and normalized title (newest first)
  const formattedOffers = useMemo(() => {
    const seen = new Set<string>();
    const list = [];
    const sorted = [...offers].sort(
      (a, b) => new Date(b.detectedAt || 0).getTime() - new Date(a.detectedAt || 0).getTime()
    );

    for (const raw of sorted) {
      const formatted = formatOfferForDisplay(raw, readOfferIds);
      const semanticKey = `${formatted.providerId.toLowerCase().trim()}:${formatted.title.toLowerCase().trim()}`;
      if (!seen.has(semanticKey)) {
        seen.add(semanticKey);
        list.push(formatted);
      }
    }
    return list;
  }, [offers, readOfferIds]);

  const availableCount = formattedOffers.length;
  const unreadCount = useMemo(() => {
    return formattedOffers.filter((o) => o.isUnread).length;
  }, [formattedOffers]);


  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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

  const handleBellClick = () => {
    setShowHint(false);
    sessionStorage.setItem('stacksave_hint_dismissed', 'true');
    setIsOpen((prev) => !prev);
  };

  const handleHintClick = () => {
    setShowHint(false);
    sessionStorage.setItem('stacksave_hint_dismissed', 'true');
    setIsOpen(true);
  };

  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = formattedOffers.map((o) => o.id);
    setReadOfferIds(allIds);
  };

  const toggleReadStatus = (offerId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setReadOfferIds((prev) =>
      prev.includes(offerId) ? prev.filter((id) => id !== offerId) : [...prev, offerId]
    );
  };

  const offerCountLabel =
    availableCount === 1 ? '1 available offer' : `${availableCount} available offers`;

  return (
    <div className="relative inline-flex items-center" ref={popoverRef}>
      {/* ── Bell Icon Button (Clean SaaS Icon Trigger) ────── */}
      <button
        onClick={handleBellClick}
        className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl border transition-all duration-150 flex items-center justify-center cursor-pointer select-none ${
          isOpen
            ? 'bg-slate-100 border-slate-300 text-slate-950 shadow-2xs'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 shadow-2xs hover:border-slate-300'
        }`}
        aria-label={`AI Offers and Intelligence Notifications (${availableCount} available offers, ${unreadCount} unread)`}
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

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[19px] h-[19px] px-1 text-[10px] font-extrabold leading-none text-white bg-emerald-600 rounded-full ring-2 ring-white shadow-2xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Floating Notification Hint Popover (Stays visible until clicked) ── */}
      <AnimatePresence>
        {showHint && !isOpen && availableCount > 0 && (
          <m.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={handleHintClick}
            className="absolute right-0 top-full mt-2 w-[220px] p-3 rounded-xl bg-white border border-slate-200/90 shadow-xl z-50 cursor-pointer text-left select-none group transition-all hover:border-slate-300"
            style={{
              boxShadow: '0 12px 30px -6px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.04)',
            }}
          >
            {/* Triangular pointer / caret directed toward the bell */}
            <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-t border-l border-slate-200/90 rotate-45" />

            <div className="relative z-10 flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 leading-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>{offerCountLabel}</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 mt-1 leading-snug">
                  New AI pricing updates
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(false);
                  sessionStorage.setItem('stacksave_hint_dismissed', 'true');
                }}
                className="text-slate-400 hover:text-slate-700 text-xs p-0.5 rounded cursor-pointer"
                title="Dismiss hint"
              >
                ✕
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Full Premium Notification Popover ──────────────── */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2.5 w-[400px] sm:w-[460px] max-w-[calc(100vw-20px)] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col text-slate-800"
            style={{
              boxShadow: '0 20px 48px -12px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06)',
              maxHeight: 'min(640px, calc(100vh - 90px))',
            }}
          >
            {/* ── 1. Popover Header ─────────────────────────── */}
            <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-slate-950 tracking-tight">
                  AI Offers & Promotions
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Live pricing opportunities from monitored AI providers
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-950 transition-colors focus:outline-none cursor-pointer shrink-0"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* ── 2. Scrollable Offers List (High-Contrast, Spacious Rows) ── */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100/90 max-h-[440px]">
              {formattedOffers.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <p className="text-xs font-bold text-slate-800">No new public offers detected</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                    StackSave checks official AI provider sources continuously.
                  </p>
                </div>
              ) : (
                formattedOffers.map((offer) => (
                  <a
                    key={offer.id}
                    href={offer.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-4 sm:p-4.5 bg-white hover:bg-slate-50/90 transition-all duration-150 cursor-pointer"
                  >
                    {/* Line 1: [ProviderLogo] Provider Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProviderLogo providerId={offer.providerId} providerName={offer.providerName} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-950 truncate">
                            {offer.providerName}
                          </span>
                          {offer.isUnread && (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                              title="Unread offer"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Line 2: Offer Title */}
                    <h5 className="text-sm font-bold text-slate-950 mt-2 leading-snug group-hover:text-slate-900 transition-colors">
                      {offer.title}
                    </h5>


                    {/* Line 3: Concise Business Benefit */}
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {offer.summary}
                    </p>

                    {/* Line 4: Metadata & Action CTA */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/70 text-[11px]">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <span>{formatCompactTime(offer.detectedAt)}</span>
                        <span>·</span>
                        <span className="text-slate-500 font-medium">Official Source</span>
                      </span>


                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={(e) => toggleReadStatus(offer.id, e)}
                          className="text-[11px] font-medium text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          title={offer.isUnread ? 'Mark as read' : 'Mark as unread'}
                        >
                          {offer.isUnread ? 'Mark read' : 'Unread'}
                        </button>

                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:text-slate-950">
                          <span>View offer</span>
                          <span className="text-slate-400 group-hover:text-slate-950 group-hover:translate-x-0.5 transition-all">
                            →
                          </span>
                        </span>
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>

            {/* ── 3. Sticky / Fixed Popover Footer (Black Button Style) ──── */}
            <div className="px-5 py-3.5 bg-slate-50/95 border-t border-slate-200/80 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <span>✓</span>
                  <span>Verified official vendor sources</span>
                </span>
                <span className="text-[11px] text-slate-600 font-bold">
                  {availableCount} active offers
                </span>
              </div>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/offers');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer group"
              >
                <span>View all {availableCount} offers</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
