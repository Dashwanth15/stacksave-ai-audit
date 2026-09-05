// ============================================================
// OfferNotificationBell — StackSave AI Pricing & Offer Intelligence
// Mature SaaS notification bell with persistent hint popover & spacious high-contrast panel
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { fetchPublicOffers, getCachedPublicOffers } from '../services/api';
import { useUserScopedStorage } from '../hooks/useUserScopedStorage';
import { getUserScopedKey } from '../utils/userSession';
import ProviderLogo from './ProviderLogo';
import { formatOfferForDisplay, formatCompactTime } from '../utils/offerFormatter';
import { renderEmphasizedDescription } from '../utils/descriptionFormatter';
import type { PublicOffer } from '../types';
import { trackNotificationOpened, trackOfferClicked } from '../utils/analytics';


export default function OfferNotificationBell() {
  const navigate = useNavigate();
  // Initialize with cached offers to prevent initial empty 0-offer flash
  const [offers, setOffers] = useState<PublicOffer[]>(() => getCachedPublicOffers()?.offers ?? []);
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  // USER-SCOPED: read offer IDs are stored per user session, not shared globally
  const [readOfferIds, setReadOfferIds] = useUserScopedStorage<string[]>('read_offer_ids', []);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load public offers from official backend API on mount
  useEffect(() => {
    let isMounted = true;
    fetchPublicOffers()
      .then((res) => {
        if (isMounted && res && Array.isArray(res.offers)) {
          setOffers(res.offers);

          // Show floating hint if there are unread offers for THIS user session
          // hint_dismissed is scoped to the browser tab (sessionStorage) — per-tab only
          const hintDismissedKey = getUserScopedKey('hint_dismissed');
          const alreadyDismissed = sessionStorage.getItem(hintDismissedKey);
          // Read current user-scoped read IDs directly from localStorage to avoid stale closure
          const scopedReadKey = getUserScopedKey('read_offer_ids');
          const savedReadIdsStr = window.localStorage.getItem(scopedReadKey);
          const savedReadIds: string[] = savedReadIdsStr ? JSON.parse(savedReadIdsStr) : [];
          const hasUnread = res.offers.some((o: PublicOffer) => !savedReadIds.includes(o.id));

          if (hasUnread && !alreadyDismissed) {
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

  // Mark all current visible offers as read / seen in persistent storage
  const markCurrentOffersAsSeen = () => {
    if (formattedOffers.length > 0) {
      const currentIds = formattedOffers.map((o) => o.id);
      setReadOfferIds((prev) => {
        const existing = Array.isArray(prev) ? prev : [];
        return Array.from(new Set([...existing, ...currentIds]));
      });
    }
  };

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
    const hintDismissedKey = getUserScopedKey('hint_dismissed');
    sessionStorage.setItem(hintDismissedKey, 'true');
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) {
      trackNotificationOpened();
      markCurrentOffersAsSeen();
    }
  };

  const handleHintClick = () => {
    setShowHint(false);
    const hintDismissedKey = getUserScopedKey('hint_dismissed');
    sessionStorage.setItem(hintDismissedKey, 'true');
    trackNotificationOpened();
    setIsOpen(true);
    markCurrentOffersAsSeen();
  };

  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markCurrentOffersAsSeen();
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
        aria-label={`AI Offers and Intelligence Notifications (${offerCountLabel}, ${unreadCount} unread)`}
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
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold leading-none text-white bg-emerald-600 rounded-full ring-2 ring-white shadow-xs tabular-nums">
            {unreadCount}
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
            className="absolute right-0 top-full mt-2 w-[228px] p-3 rounded-xl bg-white border border-slate-200/90 shadow-[0_12px_30px_-6px_rgba(15,23,42,0.14),0_0_0_1px_rgba(15,23,42,0.04)] z-50 cursor-pointer text-left select-none group transition-all hover:border-slate-300"
          >
            {/* Triangular pointer / caret directed toward the bell */}
            <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-t border-l border-slate-200/90 rotate-45" />

            <div className="relative z-10 flex items-start justify-between gap-2.5">
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(false);
                  const hintDismissedKey = getUserScopedKey('hint_dismissed');
                  sessionStorage.setItem(hintDismissedKey, 'true');
                }}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 -mr-1 -mt-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                title="Dismiss hint"
                aria-label="Dismiss notification hint"
              >
                ✕
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Mobile Backdrop Overlay ────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
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
            className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[440px] sm:max-w-[calc(100vw-32px)] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col text-slate-800 box-border"
            style={{
              boxShadow: '0 20px 48px -12px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06)',
              maxHeight: 'min(580px, calc(100dvh - 84px))',
            }}
          >
            {/* ── 1. Popover Header ─────────────────────────── */}
            <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <h4 className="text-sm font-bold text-slate-950 tracking-tight truncate">
                    AI Offers & Promotions
                  </h4>
                  {availableCount > 0 && (
                    <span className="text-xs font-medium text-slate-400 tabular-nums shrink-0">
                      · {availableCount} {availableCount === 1 ? 'offer' : 'offers'}
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] sm:text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
                  Live pricing opportunities from monitored AI providers
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-slate-950 transition-colors focus:outline-none cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden text-slate-400 hover:text-slate-700 p-1 rounded-md text-xs"
                  aria-label="Close offers"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ── 2. Scrollable Offers List (High-Contrast, Spacious Rows) ── */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 overscroll-contain">
              {formattedOffers.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <p className="text-xs font-bold text-slate-800">No new public offers detected</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                    StackSave checks official AI provider sources continuously.
                  </p>
                </div>
              ) : (
                formattedOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="group relative p-3.5 sm:p-4 bg-white hover:bg-slate-50/90 transition-all duration-150"
                  >
                    {/* Top Row: Provider Header */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <ProviderLogo providerId={offer.providerId} providerName={offer.providerName} size="sm" />
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

                      <button
                        onClick={(e) => toggleReadStatus(offer.id, e)}
                        className="text-[10.5px] font-medium text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                        title={offer.isUnread ? 'Mark as read' : 'Mark as unread'}
                      >
                        {offer.isUnread ? 'Mark read' : 'Unread'}
                      </button>
                    </div>

                    {/* Offer Title */}
                    <h5 className="text-[13px] sm:text-sm font-bold text-slate-950 mt-1.5 leading-snug">
                      {offer.title}
                    </h5>

                    {/* Concise Summary with selective emphasis */}
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {renderEmphasizedDescription(offer.summary)}
                    </p>

                    {/* Footer Row: Metadata & View Deal CTA */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100/80 text-[11px]">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <span>{formatCompactTime(offer.detectedAt)}</span>
                        <span>·</span>
                        <span className="text-slate-500 font-medium">Official Source</span>
                      </span>

                      <a
                        href={offer.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackOfferClicked(offer.providerName)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                      >
                        <span>View offer</span>
                        <span className="text-slate-400 hover:text-emerald-700">→</span>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── 3. Sticky / Fixed Popover Footer (Black Button Style) ──── */}
            <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-50/95 border-t border-slate-200/80 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] sm:text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <span>✓</span>
                  <span>Verified official vendor sources</span>
                </span>
                <span className="text-[10.5px] sm:text-[11px] text-slate-600 font-bold">
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
