// ============================================================
// OffersPage — StackSave AI Spend & Pricing Intelligence
// Enterprise SaaS verified intelligence platform
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { fetchPublicOffers, fetchPricingStatus } from '../services/api';
import { useUserScopedStorage } from '../hooks/useUserScopedStorage';
import Logo from '../components/Logo';
import ProviderLogo from '../components/ProviderLogo';
import OfferNotificationBell from '../components/OfferNotificationBell';
import { formatOfferForDisplay, formatCompactTime } from '../utils/offerFormatter';
import type { PublicOffer } from '../types';


const HERO_WORDS = [
  'Verified',
  'promotions',
  'and',
  'pricing',
  'opportunities',
  'detected',
  'directly',
  'from',
  'official',
  'AI',
  'provider',
  'sources.',
  'Zero',
  'third-party',
  'aggregators.',
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: 'easeOut',
    },
  },
};

export default function OffersPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  // USER-SCOPED: read offer IDs are stored per user session, not shared globally
  const [readOfferIds, setReadOfferIds] = useUserScopedStorage<string[]>('read_offer_ids', []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchPublicOffers().catch(() => ({ offers: [], count: 0, note: '' })),
      fetchPricingStatus().catch(() => null),
    ])
      .then(([offersRes, statusRes]) => {
        if (isMounted) {
          if (offersRes && Array.isArray(offersRes.offers)) {
            setOffers(offersRes.offers);
          }
          if (statusRes?.summary?.overlayLastAppliedAt) {
            setLastSyncDate(statusRes.summary.overlayLastAppliedAt);
          }
        }
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load offers');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
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

  const uniqueProviders = useMemo(() => {
    const set = new Set<string>();
    formattedOffers.forEach((o) => {
      if (o.providerName) set.add(o.providerName);
    });
    return Array.from(set).sort();
  }, [formattedOffers]);

  const unreadCount = useMemo(() => {
    return formattedOffers.filter((o) => o.isUnread).length;
  }, [formattedOffers]);


  const filteredOffers = useMemo(() => {
    return formattedOffers.filter((offer) => {
      // Provider filter
      if (selectedProvider !== 'all' && offer.providerName !== selectedProvider) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = offer.title.toLowerCase().includes(q);
        const matchDesc = offer.summary.toLowerCase().includes(q);
        const matchProvider = offer.providerName.toLowerCase().includes(q);
        const matchDiscount = offer.discountBadge.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchProvider || matchDiscount;
      }

      return true;
    });
  }, [formattedOffers, selectedProvider, searchQuery]);

  const markAllAsRead = () => {
    const allIds = formattedOffers.map((o) => o.id);
    setReadOfferIds(allIds);
  };


  const toggleReadStatus = (offerId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setReadOfferIds((prev) =>
      prev.includes(offerId) ? prev.filter((id) => id !== offerId) : [...prev, offerId]
    );
  };

  const lastSyncDisplay = useMemo(() => {
    if (!lastSyncDate) return 'Aug 21, 12:06 PM';
    try {
      const d = new Date(lastSyncDate);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Aug 21, 12:06 PM';
    }
  }, [lastSyncDate]);

  return (
    <div className="min-h-screen pb-24 selection:bg-slate-900 selection:text-white bg-[#F8FAFC]">
      {/* ── Top Navigation Bar ───────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 border-b border-slate-200/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/')} className="focus:outline-none cursor-pointer" aria-label="StackSave Home">
              <Logo asDiv />
            </button>

            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              <button
                onClick={() => navigate('/audit')}
                className="text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
              >
                Audit Stack
              </button>
              <button
                onClick={() => navigate('/build-stack')}
                className="text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
              >
                Build Stack
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3.5">
            <OfferNotificationBell />
            <button
              onClick={() => navigate('/audit')}
              className="h-9 px-4 rounded-xl font-bold text-xs text-white bg-slate-950 hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
            >
              Audit My Existing Stack
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        {/* ── Hero Title Section ──────────────────────────────── */}
        <div className="mb-8">
          {/* Refined Enterprise Status Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/[0.04] border border-slate-900/[0.08] text-xs font-semibold text-slate-700 mb-3.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>13 Monitored AI Providers</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-medium">Official Vendor Pricing Feeds</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            AI Offers & Pricing Intelligence
          </h1>

          {/* Word-by-word reveal sentence */}
          {prefersReducedMotion ? (
            <p className="text-sm sm:text-base text-slate-600 mt-2.5 max-w-3xl leading-relaxed">
              Verified promotions and pricing opportunities detected directly from official AI provider sources. Zero third-party aggregators.
            </p>
          ) : (
            <m.p
              className="text-sm sm:text-base text-slate-600 mt-2.5 max-w-3xl leading-relaxed flex flex-wrap gap-x-1.5"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {HERO_WORDS.map((word, i) => (
                <m.span key={i} variants={wordVariants} className="inline-block">
                  {word}
                </m.span>
              ))}
            </m.p>
          )}

          {/* Supporting Metadata */}
          <div className="mt-3 text-xs text-slate-400 font-medium">
            <span>Last verified:</span>{' '}
            <span className="font-semibold text-slate-700">{lastSyncDisplay}</span>
          </div>
        </div>

        {/* ── Filter & Search Toolbar ─────────────────────────── */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by provider, offer title, or discount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9.5 pl-9.5 pr-4 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-all"
              />
              <svg
                className="absolute left-3.5 top-3 text-slate-400"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-48 sm:w-56 shrink-0">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full h-9.5 px-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="all">All Providers ({uniqueProviders.length})</option>
                  {uniqueProviders.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="h-9.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Offers Grid (Structured, Ultra-Premium Intelligence Cards) ── */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-7 h-7 border-2 border-slate-950 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-600">
              Loading official AI offers...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
            <p className="text-xs font-bold text-rose-800">Failed to load offers</p>
            <p className="text-[11px] text-rose-600 mt-0.5">{error}</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-slate-200/90 text-center shadow-2xs">
            <p className="text-base font-bold text-slate-900">No public offers found</p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {searchQuery || selectedProvider !== 'all'
                ? 'No offers match your current filters. Try resetting search criteria.'
                : 'StackSave checks official AI provider sources continuously. No active public promotions are currently detected.'}
            </p>
            {(searchQuery || selectedProvider !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedProvider('all');
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredOffers.map((offer) => (
                <a
                  key={offer.id}
                  href={offer.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-6 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.05)] hover:border-slate-300 hover:shadow-[0_12px_24px_-6px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Provider Header */}
                    <div className="flex items-center gap-3 min-w-0">
                      <ProviderLogo providerId={offer.providerId} providerName={offer.providerName} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-sm text-slate-950 truncate">
                            {offer.providerName}
                          </h3>
                          {offer.isUnread && (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                              title="Unread offer"
                            />
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                          Official Vendor Source
                        </span>
                      </div>
                    </div>

                    {/* Middle: Title */}
                    <h4 className="font-extrabold text-base text-slate-950 mt-4 leading-snug group-hover:text-slate-900 transition-colors">
                      {offer.title}
                    </h4>



                    {/* Business Value Highlight Box */}
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                      {offer.summary}
                    </div>
                  </div>

                  {/* Card Footer: Metadata & Action Link */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-slate-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>Detected {formatCompactTime(offer.detectedAt)}</span>
                      <span>·</span>
                      <span className="text-emerald-700 font-semibold">Live Offer</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => toggleReadStatus(offer.id, e)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                        title={offer.isUnread ? 'Mark as read' : 'Mark as unread'}
                      >
                        {offer.isUnread ? 'Mark read' : 'Unread'}
                      </button>

                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 group-hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-all duration-150">
                        <span>View Deal</span>
                        <span className="text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
