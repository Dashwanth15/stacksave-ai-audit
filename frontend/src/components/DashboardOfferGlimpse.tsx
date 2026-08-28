// ============================================================
// DashboardOfferGlimpse — StackSave AI Sourcing & Intelligence
// Premium, Bloomberg/Stripe-grade dashboard intelligence module
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchPublicOffers } from '../services/api';
import { useUserScopedStorage } from '../hooks/useUserScopedStorage';
import ProviderLogo from './ProviderLogo';
import { formatOfferForDisplay, formatCompactTime } from '../utils/offerFormatter';
import type { PublicOffer } from '../types';

export default function DashboardOfferGlimpse() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  // USER-SCOPED: read offer IDs are stored per user session, not shared globally
  const [readOfferIds] = useUserScopedStorage<string[]>('read_offer_ids', []);

  useEffect(() => {
    let isMounted = true;
    fetchPublicOffers()
      .then((res) => {
        if (isMounted && res && Array.isArray(res.offers)) {
          setOffers(res.offers);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Deduplicate semantically by providerId + normalized title, then pick top 3 (unread first)
  const topOffers = useMemo(() => {
    const seen = new Set<string>();
    const deduped = [];
    const sorted = [...offers].sort(
      (a, b) => new Date(b.detectedAt || 0).getTime() - new Date(a.detectedAt || 0).getTime()
    );

    for (const raw of sorted) {
      const formatted = formatOfferForDisplay(raw, readOfferIds);
      const semanticKey = `${formatted.providerId.toLowerCase().trim()}:${formatted.title.toLowerCase().trim()}`;
      if (!seen.has(semanticKey)) {
        seen.add(semanticKey);
        deduped.push(formatted);
      }
    }

    return deduped
      .sort((a, b) => {
        if (a.isUnread && !b.isUnread) return -1;
        if (!a.isUnread && b.isUnread) return 1;
        return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
      })
      .slice(0, 3);
  }, [offers, readOfferIds]);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
        <div className="h-3 bg-slate-100 rounded w-1/2 mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="h-24 bg-slate-50 rounded-lg border border-slate-100" />
          <div className="h-24 bg-slate-50 rounded-lg border border-slate-100" />
          <div className="h-24 bg-slate-50 rounded-lg border border-slate-100" />
        </div>
      </div>
    );
  }

  if (offers.length === 0) {
    return null; // Gracefully hidden if zero offers exist
  }

  const latestTime = topOffers[0] ? formatCompactTime(topOffers[0].detectedAt) : 'Recently';

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200 hover:border-slate-300">
      {/* ── Section Header ─────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
              AI Marketplace Insights
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              · {offers.length} active offers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Official pricing changes, developer trials, and discounts detected across monitored AI providers.
          </p>
        </div>

        <button
          onClick={() => navigate('/offers')}
          className="self-start sm:self-center inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors shrink-0"
        >
          <span>View all ({offers.length})</span>
          <span className="text-slate-400 font-normal">→</span>
        </button>
      </div>

      {/* ── Top 3 Offer Glimpse Cards ──────────────────────── */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {topOffers.map((offer) => (
          <a
            key={offer.id}
            href={offer.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative p-3.5 rounded-lg border border-slate-200/70 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header: Provider Logo + Name + Discount Badge */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ProviderLogo providerId={offer.providerId} providerName={offer.providerName} size="xs" />
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {offer.providerName}
                  </span>
                </div>

                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                  {offer.discountBadge}
                </span>
              </div>

              {/* Title & 1-line Summary */}
              <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-emerald-800 transition-colors">
                {offer.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {offer.summary}
              </p>
            </div>

            {/* Footer: Official Indicator + Relative Time */}
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-medium flex items-center gap-1 text-slate-600">
                <span>✓ Official</span>
                <span>·</span>
                <span>{formatCompactTime(offer.detectedAt)}</span>
              </span>

              <span className="text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all font-bold flex items-center gap-0.5">
                <span>Offer</span>
                <span>↗</span>
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* ── Section Footer Status Bar ──────────────────────── */}
      <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-slate-500">
        <span className="font-medium">
          Checked from official vendor markup · Updated {latestTime}
        </span>

        <button
          onClick={() => navigate('/offers')}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline self-start sm:self-auto"
        >
          Explore All Verified Offers →
        </button>
      </div>
    </div>
  );
}
