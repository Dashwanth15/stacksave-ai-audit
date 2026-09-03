// ============================================================
// OffersPage — StackSave AI Spend & Pricing Intelligence
// Interactive SaaS Verified Intelligence Platform
// 100% Data-Driven: Powered by official daily Playwright crawler
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { fetchPublicOffers, fetchPricingStatus } from '../services/api';
import { useUserScopedStorage } from '../hooks/useUserScopedStorage';
import Logo from '../components/Logo';
import ProviderLogo from '../components/ProviderLogo';
import OfferNotificationBell from '../components/OfferNotificationBell';
import {
  formatOfferForDisplay,
  formatVerificationDate,
  formatCompactTime,
} from '../utils/offerFormatter';
import { renderEmphasizedDescription } from '../utils/descriptionFormatter';
import type { FormattedOffer, OfferCategory } from '../utils/offerFormatter';
import type { PublicOffer } from '../types';
import { trackOfferClicked } from '../utils/analytics';

type SortOption = 'recommended' | 'savings' | 'newest';
type CategoryIconName = 'sparkles' | 'graduation' | 'zap' | 'dollar' | 'rocket' | 'gift';

const CATEGORY_TABS: { id: OfferCategory; label: string; icon: CategoryIconName }[] = [
  { id: 'all', label: 'All Offers', icon: 'sparkles' },
  { id: 'student', label: 'Student & Education', icon: 'graduation' },
  { id: 'api', label: 'API Discounts', icon: 'zap' },
  { id: 'annual', label: 'Annual Savings', icon: 'dollar' },
  { id: 'startup', label: 'Startup Grants', icon: 'rocket' },
  { id: 'trial', label: 'Trials & Free', icon: 'gift' },
];

function UiIcon({ name, size = 14 }: { name: CategoryIconName | 'search' | 'clock' | 'calendar' | 'check' | 'arrow' | 'chevron'; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    sparkles: (
      <>
        <path d="m12 3-1.2 4.1L7 8.3l3.8 1.2L12 13l1.2-3.5L17 8.3l-3.8-1.2L12 3Z" />
        <path d="m19 13-.7 2.3L16 16l2.3.7L19 19l.7-2.3L22 16l-2.3-.7L19 13ZM5 15l-.6 1.9L2.5 17.5l1.9.6L5 20l.6-1.9 1.9-.6-1.9-.6L5 15Z" />
      </>
    ),
    graduation: <path d="m3 8 9-4 9 4-9 4-9-4Zm3 2.2V15c3.3 2.2 6.7 2.2 10 0v-4.8M21 9v5" />,
    zap: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    dollar: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.7-.6-1.6-.9-2.7-.9-1.4 0-2.4.7-2.4 1.7 0 2.7 5.2 1 5.2 3.8 0 1.1-1 1.8-2.6 1.8-1.2 0-2.2-.4-3-1.1M12.5 6v12" /></>,
    rocket: <path d="M14.5 5.5c2.2-2.2 4.8-2.8 6-2.5.3 1.2-.3 3.8-2.5 6L13 14l-3-3 4.5-5.5ZM10 14l-3 3M7 17l-3 .5.5-3 2.5-2.5M13 7l4 4M9 20l-2-2" />,
    gift: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M5 8a2.5 2.5 0 1 1 5 0H5ZM14 8a2.5 2.5 0 1 0-5 0h5Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    check: <><path d="M20 6 9 17l-5-5" /><circle cx="12" cy="12" r="9" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    chevron: <path d="m7 9 5 5 5-5" />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function formatDetectedTime(dateString: string): string {
  const compactTime = formatCompactTime(dateString);
  const match = compactTime.match(/^(\d+)([mhd]) ago$/);
  if (!match) return `Detected ${compactTime}`;

  const [, amount, unit] = match;
  const labels = { m: 'minute', h: 'hour', d: 'day' } as const;
  const label = labels[unit as keyof typeof labels];
  return `Detected ${amount} ${label}${amount === '1' ? '' : 's'} ago`;
}

export default function OffersPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<OfferCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [vendorFeedCount, setVendorFeedCount] = useState<number | null>(null);
  // USER-SCOPED: read offer IDs are stored per user session
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
          if (statusRes?.summary?.lastSuccessfulSyncAt) {
            setLastSyncDate(statusRes.summary.lastSuccessfulSyncAt);
          }
          if (statusRes?.summary?.totalProviders !== undefined) {
            setVendorFeedCount(statusRes.summary.totalProviders);
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

  // Format and deduplicate offers semantically
  const formattedOffers = useMemo(() => {
    const seen = new Set<string>();
    const list: FormattedOffer[] = [];
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

  // Compute category counts for tab badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: formattedOffers.length };
    formattedOffers.forEach((o) => {
      counts[o.category] = (counts[o.category] || 0) + 1;
    });
    counts.trial = (counts.trial || 0) + (counts.free || 0);
    return counts;
  }, [formattedOffers]);

  const unreadCount = useMemo(() => {
    return formattedOffers.filter((o) => o.isUnread).length;
  }, [formattedOffers]);

  // Filter & sort logic
  const filteredAndSortedOffers = useMemo(() => {
    const result = formattedOffers.filter((offer) => {
      // Provider filter
      if (selectedProvider !== 'all' && offer.providerName !== selectedProvider) {
        return false;
      }

      // Category tab filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'trial') {
          if (offer.category !== 'trial' && offer.category !== 'free') return false;
        } else if (offer.category !== selectedCategory) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = offer.title.toLowerCase().includes(q);
        const matchDesc = offer.summary.toLowerCase().includes(q);
        const matchProvider = offer.providerName.toLowerCase().includes(q);
        const matchDiscount = offer.discountBadge.toLowerCase().includes(q);
        const matchEligibility = offer.eligibility.toLowerCase().includes(q);
        const matchCat = offer.categoryLabel.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchProvider || matchDiscount || matchEligibility || matchCat;
      }

      return true;
    });

    // Sort result
    return result.sort((a, b) => {
      if (sortBy === 'recommended' || sortBy === 'savings') {
        return b.savingsScore - a.savingsScore;
      }
      if (sortBy === 'newest') {
        return new Date(b.detectedAt || 0).getTime() - new Date(a.detectedAt || 0).getTime();
      }
      return 0;
    });
  }, [formattedOffers, selectedProvider, selectedCategory, searchQuery, sortBy]);

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
    if (!lastSyncDate) return 'Unavailable';
    try {
      const d = new Date(lastSyncDate);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unavailable';
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
              className="h-9 px-3 sm:px-4 rounded-xl font-bold text-xs text-white bg-slate-950 hover:bg-slate-800 transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              <span className="hidden sm:inline">Audit My Existing Stack</span>
              <span className="inline sm:hidden">Audit Stack</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        {/* ── Intelligence Masthead ───────────────────────────── */}
        <section className="mb-6 border-b border-slate-200/80 pb-6">
          <div className="flex w-fit max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 text-xs leading-none font-semibold">
            <span className="inline-flex items-center gap-2 text-slate-900">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              {formattedOffers.length} Active Promotions
            </span>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <span className="text-slate-600">
              <span className="font-semibold">{vendorFeedCount ?? uniqueProviders.length}</span>{' '}
              Official Vendor Feeds
            </span>
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
            AI Offers & Pricing Intelligence
          </h1>

          {prefersReducedMotion ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
              Discover verified AI promotions, pricing opportunities, credits, discounts, and special programs directly from official AI provider sources.
            </p>
          ) : (
            <m.p
              className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              Discover verified AI promotions, pricing opportunities, credits, discounts, and special programs directly from official AI provider sources.
            </m.p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-400">
            <span className="flex items-center gap-1 font-bold text-emerald-700">
              <UiIcon name="check" size={12} />
              <span>100% Official Sources</span>
            </span>
            <span className="text-slate-300">•</span>
            <span>Last checked <span className="font-semibold text-slate-700">{lastSyncDisplay}</span></span>
          </div>
        </section>

        {/* ── Category Navigation ─────────────────────────────── */}
        <div className="relative mb-4 sm:mb-5">
          {/* Subtle mobile right-edge fade cue to indicate horizontal swiping */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#F8FAFC] via-[#F8FAFC]/70 to-transparent z-10 sm:hidden"
            aria-hidden="true"
          />

          {/* Horizontally scrollable track without native scrollbar */}
          <div
            role="tablist"
            aria-label="Filter offers by category"
            className="flex items-center gap-2 sm:gap-1 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:py-0 sm:rounded-2xl sm:border sm:border-slate-200/90 sm:bg-white sm:p-1.5 sm:shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)]"
          >
            {CATEGORY_TABS.map((tab) => {
              const count = categoryCounts[tab.id] || 0;
              const isSelected = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={(e) => {
                    setSelectedCategory(tab.id);
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                  }}
                  className={`group shrink-0 flex h-10 sm:h-9 items-center gap-2 sm:gap-1.5 rounded-xl px-3.5 sm:px-3 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer active:scale-[0.98] select-none border focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                    isSelected
                      ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                      : 'bg-white sm:bg-transparent text-slate-600 sm:text-slate-500 border-slate-200/80 sm:border-transparent hover:border-slate-300 sm:hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs sm:shadow-none'
                  }`}
                >
                  <span className="flex h-4 w-4 items-center justify-center text-current shrink-0">
                    <UiIcon name={tab.icon} size={14} />
                  </span>
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10.5px] px-1.5 py-0.5 rounded-md font-semibold tabular-nums shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-100 text-slate-600 sm:text-slate-500 group-hover:bg-slate-200/70'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {/* Trailing spacer for smooth mobile scroll padding */}
            <div className="w-3 shrink-0 sm:hidden" aria-hidden="true" />
          </div>
        </div>

        {/* ── Filter & Search Toolbar ─────────────────────────── */}
        <div className="mb-7 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search offers by provider, benefits, student, API, discount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-transparent bg-slate-50 px-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <span className="absolute left-3.5 top-3 flex text-slate-400">
                <UiIcon name="search" size={15} />
              </span>
            </div>

            {/* Provider & Sort Selectors */}
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none">
              <div className="min-w-[148px] sm:w-48 sm:flex-initial">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 transition-all focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                >
                  <option value="all">All Providers ({uniqueProviders.length})</option>
                  {uniqueProviders.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[148px] sm:w-44 sm:flex-initial">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-3 flex text-slate-500">
                    <UiIcon name={sortBy === 'recommended' ? 'sparkles' : sortBy === 'savings' ? 'dollar' : 'clock'} size={14} />
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-800 transition-all focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="savings">Highest Savings</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 cursor-pointer whitespace-nowrap"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Offers Grid (Structured, Rich Intelligence Cards) ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200/80 animate-pulse flex flex-col justify-between h-56">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-200" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 bg-slate-200 rounded w-28" />
                      <div className="h-2.5 bg-slate-100 rounded w-20" />
                    </div>
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-3/4 mt-4" />
                  <div className="h-12 bg-slate-100 rounded-xl mt-3" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-1/3 mt-4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center">
            <p className="text-sm font-bold text-rose-900">Unable to load intelligence offers</p>
            <p className="text-xs text-rose-600 mt-1">{error}</p>
          </div>
        ) : filteredAndSortedOffers.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-slate-200/90 text-center shadow-2xs">
            <div className="mb-2 flex justify-center text-slate-400"><UiIcon name="search" size={24} /></div>
            <p className="text-base font-bold text-slate-900">No matching offers found</p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              No promotions match your search or filter criteria. Try clearing search keywords or selecting all categories.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedProvider('all');
                setSelectedCategory('all');
                setSortBy('recommended');
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedOffers.map((offer) => (
                <a
                  key={offer.id}
                  href={offer.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackOfferClicked(offer.providerName)}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 cursor-pointer"
                >
                  <div>
                    {/* Provider identity and subtle live status */}
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <ProviderLogo providerId={offer.providerId} providerName={offer.providerName} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold tracking-tight text-slate-900 truncate">
                              {offer.providerName}
                            </h3>
                            {offer.isUnread && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"
                                title="New unread offer"
                              />
                            )}
                          </div>
                          <span className="mt-0.5 block text-[11px] text-slate-400 truncate">
                            {offer.categoryLabel}
                          </span>
                        </div>
                      </div>

                      {/* Subtle status indicator: ● Available (no colored pill) */}
                      <div className="flex items-center gap-1.5 text-[11px] font-normal text-slate-400 shrink-0">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            offer.verificationStatusType === 'unavailable' ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                        />
                        <span>
                          {offer.verificationStatusType === 'unavailable' ? 'Unavailable' : 'Available'}
                        </span>
                      </div>
                    </div>

                    {/* Offer Value Highlight — Strong typographic emphasis with subtle accent notch */}
                    {offer.discountBadge && (
                      <div className="mt-4 flex items-center gap-2">
                        <span className="h-3.5 w-1 rounded-sm bg-emerald-500 shrink-0" aria-hidden="true" />
                        <span className="text-xs font-black uppercase tracking-[0.05em] text-slate-900 truncate">
                          {offer.discountBadge}
                        </span>
                      </div>
                    )}

                    {/* Offer Title — Strongest textual element after provider */}
                    <h4 className="mt-1.5 line-clamp-2 min-h-[2.65rem] text-[17px] font-bold leading-snug tracking-tight text-slate-950 transition-colors group-hover:text-slate-800">
                      {offer.title}
                    </h4>

                    {/* Clean description with selective bold emphasis on commercial facts */}
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                      {renderEmphasizedDescription(offer.summary)}
                    </p>

                    {/* Subtle eligibility indicator */}
                    {offer.eligibility && (
                      <p className="mt-3 text-[11.5px] text-slate-400 truncate">
                        For <span className="font-medium text-slate-700">{offer.eligibility.replace(/^(Verified|Eligible)\s+/i, (m) => m.toLowerCase())}</span>
                      </p>
                    )}
                  </div>

                  {/* Footer stays aligned across cards */}
                  <div className="mt-4.5 border-t border-slate-100 pt-3">
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-400">
                      <div className="min-w-0 space-y-0.5">
                        <span className="flex min-w-0 items-center gap-1.5 truncate">
                          <UiIcon name="calendar" size={12} />
                          <span className="truncate text-slate-500">Verified {formatVerificationDate(offer.lastConfirmedAt || offer.detectedAt)}</span>
                        </span>
                        <span className="flex min-w-0 items-center gap-1 text-slate-400 text-[10.5px]">
                          <UiIcon name="clock" size={11} />
                          <span className="truncate">{formatDetectedTime(offer.detectedAt)}</span>
                        </span>
                      </div>

                      <button
                        onClick={(e) => toggleReadStatus(offer.id, e)}
                        className="sr-only"
                        title={offer.isUnread ? 'Mark as read' : 'Mark as unread'}
                        aria-label={offer.isUnread ? 'Mark offer as read' : 'Mark offer as unread'}
                      >
                        {offer.isUnread ? 'New' : 'Mark unread'}
                      </button>

                      <span className="row-span-1 inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 text-xs font-semibold text-white shadow-2xs transition-all duration-150 group-hover:bg-slate-800 shrink-0">
                        <span>View Offer</span>
                        <span className="text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-white">
                          <UiIcon name="arrow" size={13} />
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
