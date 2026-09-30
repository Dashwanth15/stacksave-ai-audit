// ============================================================
// OffersPage — StackSave AI Spend & Pricing Intelligence
// Interactive SaaS Verified Intelligence Platform
// 100% Data-Driven: Powered by official daily Playwright crawler
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { fetchPublicOffers, fetchPricingStatus, getCachedPublicOffers } from '../services/api';
import { useUserScopedStorage } from '../hooks/useUserScopedStorage';
import Logo from '../components/Logo';
import ProviderLogo from '../components/ProviderLogo';
import OfferNotificationBell from '../components/OfferNotificationBell';
import UserNavMenu from '../components/UserNavMenu';
import { useAuth } from '../context/AuthContext';
import PremiumUpgradeNudge from '../components/PremiumUpgradeNudge';
import PremiumOffersGate from '../components/PremiumOffersGate';
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
  { id: 'partner', label: 'Partner Bundles', icon: 'zap' },
  { id: 'student', label: 'Student & Education', icon: 'graduation' },
  { id: 'api', label: 'API Discounts', icon: 'zap' },
  { id: 'annual', label: 'Annual Savings', icon: 'dollar' },
  { id: 'startup', label: 'Startup Grants', icon: 'rocket' },
  { id: 'trial', label: 'Trials & Free', icon: 'gift' },
];

function UiIcon({
  name,
  size = 14,
}: {
  name:
    | CategoryIconName
    | 'search'
    | 'clock'
    | 'calendar'
    | 'check'
    | 'arrow'
    | 'chevron'
    | 'users'
    | 'code'
    | 'layers'
    | 'shield';
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    sparkles: (
      <>
        <path d="m12 3-1.2 4.1L7 8.3l3.8 1.2L12 13l1.2-3.5L17 8.3l-3.8-1.2L12 3Z" />
        <path d="m19 13-.7 2.3L16 16l2.3.7L19 19l.7-2.3L22 16l-2.3-.7L19 13ZM5 15l-.6 1.9L2.5 17.5l1.9.6L5 20l.6-1.9 1.9-.6-1.9-.6L5 15Z" />
      </>
    ),
    graduation: <path d="m3 8 9-4 9 4-9 4-9-4Zm3 2.2V15c3.3 2.2 6.7 2.2 10 0v-4.8M21 9v5" />,
    zap: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    dollar: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 8.5c-.7-.6-1.6-.9-2.7-.9-1.4 0-2.4.7-2.4 1.7 0 2.7 5.2 1 5.2 3.8 0 1.1-1 1.8-2.6 1.8-1.2 0-2.2-.4-3-1.1M12.5 6v12" />
      </>
    ),
    rocket: (
      <path d="M14.5 5.5c2.2-2.2 4.8-2.8 6-2.5.3 1.2-.3 3.8-2.5 6L13 14l-3-3 4.5-5.5ZM10 14l-3 3M7 17l-3 .5.5-3 2.5-2.5M13 7l4 4M9 20l-2-2" />
    ),
    gift: (
      <>
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M12 8v13M3 12h18M5 8a2.5 2.5 0 1 1 5 0H5ZM14 8a2.5 2.5 0 1 0-5 0h5Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    check: (
      <>
        <path d="M20 6 9 17l-5-5" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    chevron: <path d="m7 9 5 5 5-5" />,
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    code: (
      <>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </>
    ),
    layers: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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

function PremiumCrownIllustration() {
  return (
    <div className="absolute right-2 sm:right-4 top-2 sm:top-3 pointer-events-none select-none z-0 transition-transform duration-300 group-hover:scale-105">
      {/* Soft warm ambient glow behind crown */}
      <div className="absolute inset-0 -m-6 bg-gradient-to-br from-amber-300/30 via-amber-200/20 to-transparent rounded-full blur-2xl transform -rotate-12" />
      <svg
        className="w-[115px] h-[86px] sm:w-[150px] sm:h-[110px] drop-shadow-[0_12px_24px_rgba(217,119,6,0.22)] opacity-95"
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ssGoldBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="25%" stopColor="#FDE68A" />
            <stop offset="55%" stopColor="#F59E0B" />
            <stop offset="85%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="ssGoldFacet" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#FDE68A" />
            <stop offset="80%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="ssGoldRim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B45309" />
            <stop offset="25%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#FFFBEB" />
            <stop offset="75%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
          <radialGradient id="ssCrownShine" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#FDE68A" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Crown Base Rim (Curved 3D arch) */}
        <path
          d="M 24 92 C 52 104, 112 104, 140 92 C 135 84, 126 81, 116 84 C 88 92, 64 92, 44 84 C 34 81, 28 85, 24 92 Z"
          fill="url(#ssGoldRim)"
        />

        {/* Main Crown Body with 5 Elegant Peaks */}
        <path
          d="M 24 90 C 22 66, 16 52, 15 44 C 15 40, 20 40, 24 45 C 38 61, 50 66, 54 39 C 56 34, 62 34, 64 39 C 72 55, 82 61, 84 25 C 85 20, 91 20, 92 25 C 94 61, 104 55, 112 39 C 114 34, 120 34, 122 39 C 126 66, 138 61, 152 45 C 156 40, 161 40, 161 44 C 160 52, 154 66, 152 90 C 120 102, 60 102, 24 90 Z"
          fill="url(#ssGoldBase)"
        />

        {/* Inner Volumetric Facet Highlights */}
        <path
          d="M 54 41 L 66 78 C 76 83, 90 83, 100 78 L 112 41 C 105 56, 95 61, 91 27 C 87 61, 74 56, 54 41 Z"
          fill="url(#ssGoldFacet)"
          opacity="0.9"
        />

        {/* 3D Surface Sheen */}
        <path
          d="M 24 90 C 22 66, 16 52, 15 44 C 15 40, 20 40, 24 45 C 38 61, 50 66, 54 39 C 56 34, 62 34, 64 39 C 72 55, 82 61, 84 25 C 85 20, 91 20, 92 25 C 94 61, 104 55, 112 39 C 114 34, 120 34, 122 39 C 126 66, 138 61, 152 45 C 156 40, 161 40, 161 44 C 160 52, 154 66, 152 90 C 120 102, 60 102, 24 90 Z"
          fill="url(#ssCrownShine)"
        />

        {/* Jewels / Accents on Peaks */}
        <circle cx="88" cy="22" r="4.5" fill="#FFFFFF" />
        <circle cx="88" cy="22" r="2.5" fill="#FDE68A" />
        <circle cx="18" cy="43" r="3.5" fill="#FFFFFF" />
        <circle cx="158" cy="43" r="3.5" fill="#FFFFFF" />
        <circle cx="58" cy="37" r="3.5" fill="#FFFFFF" />
        <circle cx="118" cy="37" r="3.5" fill="#FFFFFF" />

        {/* Refined Sparkle Glints */}
        <g transform="translate(82, 58) scale(1.1)">
          <path d="M 6 0 L 8 4.5 L 12.5 6.5 L 8 8.5 L 6 13 L 4 8.5 L 0 6.5 L 4 4.5 Z" fill="#FFFFFF" opacity="0.95" />
        </g>
        <g transform="translate(36, 24) scale(0.7)">
          <path d="M 6 0 L 8 4.5 L 12.5 6.5 L 8 8.5 L 6 13 L 4 8.5 L 0 6.5 L 4 4.5 Z" fill="#FEF3C7" opacity="0.85" />
        </g>
        <g transform="translate(132, 26) scale(0.8)">
          <path d="M 6 0 L 8 4.5 L 12.5 6.5 L 8 8.5 L 6 13 L 4 8.5 L 0 6.5 L 4 4.5 Z" fill="#FEF3C7" opacity="0.9" />
        </g>
      </svg>
    </div>
  );
}

function PriceDropChartIllustration() {
  return (
    <div className="absolute right-2 sm:right-4 top-2 sm:top-3 pointer-events-none select-none z-0 transition-transform duration-300 group-hover:scale-105">
      {/* Soft emerald ambient glow */}
      <div className="absolute inset-0 -m-6 bg-gradient-to-br from-emerald-300/25 via-emerald-200/15 to-transparent rounded-full blur-2xl" />
      <svg
        className="w-[115px] h-[82px] sm:w-[145px] sm:h-[105px] drop-shadow-[0_8px_20px_rgba(16,185,129,0.18)] opacity-95"
        viewBox="0 0 150 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ssGreenFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
            <stop offset="50%" stopColor="#34D399" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.00" />
          </linearGradient>
          <linearGradient id="ssGreenLine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="40%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>

        {/* Soft mountain area wash */}
        <path
          d="M 12 36 L 44 54 L 76 40 L 110 80 L 138 60 L 138 104 L 12 104 Z"
          fill="url(#ssGreenFill)"
        />

        {/* Crisp downward trend line */}
        <path
          d="M 12 36 L 44 54 L 76 40 L 110 80 L 138 60"
          stroke="url(#ssGreenLine)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Prominent downward terminal arrow */}
        <path
          d="M 126 60 L 138 60 L 138 72"
          stroke="url(#ssGreenLine)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Milestone Indicator Nodes */}
        <circle cx="138" cy="60" r="4.5" fill="#047857" />
        <circle cx="138" cy="60" r="2" fill="#FFFFFF" />
        <circle cx="76" cy="40" r="3" fill="#10B981" opacity="0.8" />
      </svg>
    </div>
  );
}

function LimitedTimeClockIllustration() {
  return (
    <div className="absolute right-2 sm:right-4 top-2 sm:top-3 pointer-events-none select-none z-0 transition-transform duration-300 group-hover:scale-105">
      {/* Soft warm orange ambient glow */}
      <div className="absolute inset-0 -m-6 bg-gradient-to-br from-orange-300/30 via-orange-200/20 to-transparent rounded-full blur-2xl" />
      <svg
        className="w-[110px] h-[84px] sm:w-[140px] sm:h-[108px] drop-shadow-[0_12px_24px_rgba(234,88,12,0.22)] opacity-95"
        viewBox="0 0 140 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ssClockRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="35%" stopColor="#FB923C" />
            <stop offset="80%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#9A3412" />
          </linearGradient>
          <linearGradient id="ssClockFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFF7ED" />
          </linearGradient>
          <linearGradient id="ssBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>

        {/* 3D Isometric Outer Bezel */}
        <circle cx="70" cy="55" r="42" fill="url(#ssClockRing)" />
        <ellipse cx="70" cy="55" rx="35" ry="35" fill="url(#ssClockFace)" />

        {/* Crisp Dial Tick Marks */}
        <line x1="70" y1="26" x2="70" y2="31" stroke="#FDBA74" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="70" y1="79" x2="70" y2="84" stroke="#FDBA74" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="41" y1="55" x2="46" y2="55" stroke="#FDBA74" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="94" y1="55" x2="99" y2="55" stroke="#FDBA74" strokeWidth="2.5" strokeLinecap="round" />

        {/* Urgency-angled Hands */}
        <line x1="70" y1="55" x2="70" y2="35" stroke="#EA580C" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="70" y1="55" x2="84" y2="65" stroke="#EA580C" strokeWidth="3" strokeLinecap="round" />
        <circle cx="70" cy="55" r="4" fill="#9A3412" />

        {/* Energetic Speed Lightning Flash */}
        <path
          d="M 102 50 L 93 65 L 100 65 L 91 82 L 108 62 L 100 62 Z"
          fill="url(#ssBoltGrad)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

function EarlyAccessIllustration() {
  return (
    <div className="absolute right-2 sm:right-4 top-2 sm:top-3 pointer-events-none select-none z-0 transition-transform duration-300 group-hover:scale-105">
      <div className="absolute inset-0 -m-6 bg-gradient-to-br from-indigo-300/25 via-indigo-200/15 to-transparent rounded-full blur-2xl" />
      <svg
        className="w-[110px] h-[84px] sm:w-[138px] sm:h-[105px] drop-shadow-[0_12px_24px_rgba(79,70,229,0.20)] opacity-95"
        viewBox="0 0 140 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ssIndigoStar" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E0E7FF" />
            <stop offset="40%" stopColor="#818CF8" />
            <stop offset="85%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#3730A3" />
          </linearGradient>
        </defs>
        <ellipse cx="70" cy="55" rx="42" ry="21" stroke="#C7D2FE" strokeWidth="1.8" strokeDasharray="4 4" transform="rotate(-20 70 55)" opacity="0.65" />
        <path
          d="M 70 20 Q 70 55 105 55 Q 70 55 70 90 Q 70 55 35 55 Q 70 55 70 20 Z"
          fill="url(#ssIndigoStar)"
        />
        <circle cx="70" cy="55" r="4.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

function CardSideIllustration({ offer }: { offer: FormattedOffer }) {
  if (offer.isPremiumOnly) {
    return <PremiumCrownIllustration />;
  }
  if (offer.isIntelligenceAlert) {
    if (offer.alertType === 'PRICE_DROP') return <PriceDropChartIllustration />;
    if (offer.alertType === 'LIMITED_TIME') return <LimitedTimeClockIllustration />;
    if (offer.alertType === 'EARLY_ACCESS') return <EarlyAccessIllustration />;
  }
  return null;
}

export default function OffersPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  // Initialize from the in-memory/sessionStorage cache so that if the notification bell
  // already fetched the 12 offers, the page renders them immediately without a skeleton.
  const cachedOnMount = getCachedPublicOffers();
  const [offers, setOffers] = useState<PublicOffer[]>(() => cachedOnMount?.offers ?? []);
  // Only show the loading skeleton when there is nothing cached to display yet.
  const [loading, setLoading] = useState(!cachedOnMount || cachedOnMount.offers.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<OfferCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [canonicalProviderCount, setCanonicalProviderCount] = useState<number | null>(() => {
    const cached = getCachedPublicOffers();
    return cached?.providerCount ?? null;
  });
  const { user } = useAuth();
  const [isServerPremium, setIsServerPremium] = useState<boolean>(() => cachedOnMount?.isPremiumUser ?? false);
  const isPremiumUser = user?.plan === 'PREMIUM' || isServerPremium;
  // USER-SCOPED: read offer IDs are stored per user session
  const [readOfferIds, setReadOfferIds] = useUserScopedStorage<string[]>('read_offer_ids', []);

  const loadOffersData = React.useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    setError(null);

    try {
      const [offersRes, statusRes] = await Promise.all([
        fetchPublicOffers(),
        fetchPricingStatus().catch(() => null),
      ]);

      if (offersRes && Array.isArray(offersRes.offers)) {
        setOffers(offersRes.offers);
        if (offersRes.providerCount !== undefined) {
          setCanonicalProviderCount(offersRes.providerCount);
        }
        if (offersRes.isPremiumUser !== undefined) {
          setIsServerPremium(offersRes.isPremiumUser);
        }
      }
      if (statusRes?.summary?.lastSuccessfulSyncAt) {
        setLastSyncDate(statusRes.summary.lastSuccessfulSyncAt);
      }
    } catch (err) {
      // Retain stale cached offers if available (SWR); otherwise set explicit error
      const msg = err instanceof Error ? err.message : 'Failed to load offers';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      loadOffersData(!cachedOnMount || cachedOnMount.offers.length === 0);
    }
    return () => {
      isMounted = false;
    };
  }, [loadOffersData, cachedOnMount]);

  // Format and deduplicate offers semantically
  const formattedOffers = useMemo(() => {
    const seen = new Set<string>();
    const list: FormattedOffer[] = [];
    const sorted = [...offers].sort((a, b) => {
      const scoreA = a.finalRecommendedScore ?? a.offerOpportunityScore ?? 0;
      const scoreB = b.finalRecommendedScore ?? b.offerOpportunityScore ?? 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.detectedAt || 0).getTime() - new Date(a.detectedAt || 0).getTime();
    });

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
    const map = new Map<string, { id: string; name: string }>();
    formattedOffers.forEach((o) => {
      const canonicalId = (o.canonicalProviderId || o.aiProvider || o.providerId || '').toLowerCase().trim();
      if (canonicalId && !map.has(canonicalId)) {
        map.set(canonicalId, {
          id: canonicalId,
          name: o.providerName || canonicalId,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
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
      if (selectedProvider !== 'all') {
        const canonicalId = (offer.canonicalProviderId || offer.aiProvider || offer.providerId || '').toLowerCase().trim();
        if (canonicalId !== selectedProvider && offer.providerName !== selectedProvider) {
          return false;
        }
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
        const matchPartner = offer.partner ? offer.partner.toLowerCase().includes(q) : false;
        const matchBenefit = offer.benefit ? offer.benefit.toLowerCase().includes(q) : false;
        return matchTitle || matchDesc || matchProvider || matchDiscount || matchEligibility || matchCat || matchPartner || matchBenefit;
      }

      return true;
    });

    // Sort result
    return result.sort((a, b) => {
      if (sortBy === 'recommended') {
        // ── Platform-First Intelligent Grouping ────────────────────────────
        // Step 1: Resolve canonical AI platform identity for each offer.
        // Partner/bundle offers (e.g. ASUS Gemini, Pixel Gemini) use aiProvider
        // so they cluster under 'gemini', not 'asus' or 'google-pixel'.
        const getCanonicalId = (o: typeof a) =>
          ((o.aiProvider || o.providerId) || '').toLowerCase().trim();

        // Step 2: Group all filtered offers by canonical platform.
        const groups = new Map<string, (typeof result)>();
        for (const offer of result) {
          const key = getCanonicalId(offer);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(offer);
        }

        // Step 3: For each group, sort offers internally by:
        //   finalRecommendedScore DESC → offerOpportunityScore DESC → freshness DESC
        groups.forEach((groupOffers) => {
          groupOffers.sort((x, y) => {
            const fsX = x.finalRecommendedScore ?? x.offerOpportunityScore ?? 0;
            const fsY = y.finalRecommendedScore ?? y.offerOpportunityScore ?? 0;
            if (fsX !== fsY) return fsY - fsX;
            const oX = x.offerOpportunityScore ?? 0;
            const oY = y.offerOpportunityScore ?? 0;
            if (oX !== oY) return oY - oX;
            return new Date(y.detectedAt || 0).getTime() - new Date(x.detectedAt || 0).getTime();
          });
        });

        // Step 4: Sort platform groups by:
        //   Primary:    max(platformIntelligenceScore) DESC — platform quality determines group order
        //   Tie-breaker: max(finalRecommendedScore) DESC — best verified offer quality as secondary
        // No hardcoded provider ordering — all derived from PlatformRankingEngine signals.
        const groupEntries = Array.from(groups.entries()).sort(([, aOffers], [, bOffers]) => {
          const aPlatScore = Math.max(...aOffers.map((o) => o.platformIntelligenceScore ?? 0));
          const bPlatScore = Math.max(...bOffers.map((o) => o.platformIntelligenceScore ?? 0));
          if (aPlatScore !== bPlatScore) return bPlatScore - aPlatScore;
          // Tie-breaker: best combined recommended score
          const aFinal = Math.max(...aOffers.map((o) => o.finalRecommendedScore ?? o.offerOpportunityScore ?? 0));
          const bFinal = Math.max(...bOffers.map((o) => o.finalRecommendedScore ?? o.offerOpportunityScore ?? 0));
          return bFinal - aFinal;
        });

        // Step 5: Flatten groups into final ordered list.
        // Caller's .sort() comparator is replaced — we return the pre-sorted flat array.
        // Since Array.sort comparators cannot "return a sorted list", we mutate `result`
        // in-place by splicing the grouped order. We do this via index comparison:
        const flat = groupEntries.flatMap(([, groupOffers]) => groupOffers);
        const indexMap = new Map(flat.map((o, i) => [o.id, i]));
        return (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0);
      }
      if (sortBy === 'savings') {
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
            <UserNavMenu />
          </div>
        </div>
      </header>

      {/* ── Main Container ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        {/* ── Intelligence Masthead ───────────────────────────── */}
        <section className="mb-6 border-b border-slate-200/80 pb-6">
          <div className="flex w-fit max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 text-xs leading-none font-semibold">
            <span className="inline-flex items-center gap-2 text-slate-900">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
              {loading && formattedOffers.length === 0 ? '—' : formattedOffers.length} Active Promotions
            </span>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <span className="text-slate-600">
              <span className="font-semibold">{loading && formattedOffers.length === 0 ? '—' : (canonicalProviderCount ?? uniqueProviders.length)}</span>{' '}
              AI Providers Monitored
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
        <div className="mb-4 sm:mb-5">
          {/* Horizontally scrollable track — real scrollbar on mobile, styled pill on desktop */}
          <div
            role="tablist"
            aria-label="Filter offers by category"
            className="flex items-center gap-2 sm:gap-1 overflow-x-auto categories-scrollbar scroll-smooth overscroll-x-contain touch-pan-x py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:py-0 sm:rounded-2xl sm:border sm:border-slate-200/90 sm:bg-white sm:p-1.5 sm:shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)]"
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
                  <option value="all">All Providers ({canonicalProviderCount ?? uniqueProviders.length})</option>
                  {uniqueProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
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
        ) : error && formattedOffers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center max-w-md mx-auto my-8 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3 text-amber-600">
              <UiIcon name="clock" size={20} />
            </div>
            <p className="text-sm font-bold text-slate-900">Unable to load intelligence offers</p>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{error}</p>
            <button
              onClick={() => loadOffersData(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Try Again
            </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedOffers.map((offer) => (
                <a
                  key={offer.id}
                  href={offer.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackOfferClicked(offer.providerName)}
                  className={`group relative overflow-hidden flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${
                    offer.isPremiumOnly
                      ? 'bg-gradient-to-b from-[#FFFDF5] via-[#FFFBF0] to-[#FFFFFF] border-2 border-[#FDE68A] hover:border-amber-400 shadow-[0_8px_28px_rgba(245,158,11,0.08)] focus-visible:ring-amber-400'
                      : offer.isIntelligenceAlert
                      ? offer.alertType === 'EARLY_ACCESS'
                        ? 'bg-gradient-to-b from-[#EEF2FF] via-[#F8FAFC] to-[#FFFFFF] border-2 border-[#C7D2FE] hover:border-indigo-400 shadow-[0_8px_28px_rgba(99,102,241,0.06)] focus-visible:ring-indigo-400'
                        : offer.alertType === 'PRICE_DROP'
                        ? 'bg-gradient-to-b from-[#F0FDF4] via-[#F8FEFA] to-[#FFFFFF] border-2 border-[#A7F3D0] hover:border-emerald-400 shadow-[0_8px_28px_rgba(16,185,129,0.06)] focus-visible:ring-emerald-400'
                        : offer.alertType === 'LIMITED_TIME'
                        ? 'bg-gradient-to-b from-[#FFF7ED] via-[#FFFAF5] to-[#FFFFFF] border-2 border-[#FDBA74] hover:border-orange-400 shadow-[0_8px_28px_rgba(249,115,22,0.06)] focus-visible:ring-orange-400'
                        : offer.alertType === 'PRICE_CHANGE'
                        ? 'bg-gradient-to-b from-[#F0F9FF] via-[#F8FAFC] to-[#FFFFFF] border-2 border-[#BAE6FD] hover:border-sky-400 shadow-[0_8px_28px_rgba(14,165,233,0.06)] focus-visible:ring-sky-400'
                        : offer.alertType === 'IMPORTANT'
                        ? 'bg-gradient-to-b from-[#FFFDF5] via-[#FFFBF0] to-[#FFFFFF] border-2 border-[#FDE68A] hover:border-amber-400 shadow-[0_8px_28px_rgba(245,158,11,0.06)] focus-visible:ring-amber-400'
                        : 'bg-gradient-to-b from-[#EEF2FF] via-[#F8FAFC] to-[#FFFFFF] border-2 border-[#C7D2FE] hover:border-indigo-400 shadow-[0_8px_28px_rgba(99,102,241,0.06)] focus-visible:ring-indigo-400'
                      : 'bg-white border border-slate-200/90 hover:border-slate-300 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-md focus-visible:ring-slate-400'
                  }`}
                >
                  {/* Decorative side illustration on right */}
                  <CardSideIllustration offer={offer} />

                  <div className="relative z-10">
                    {/* Provider identity and subtle live status */}
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <ProviderLogo providerId={offer.providerId} providerName={offer.providerName} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[16px] font-bold tracking-tight text-slate-900 truncate">
                              {offer.providerName}
                            </h3>
                            {offer.isUnread && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"
                                title="New unread offer"
                              />
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-normal truncate mt-0.5">
                            {offer.partner ? `${offer.partner} • Partner Bundle` : offer.categoryLabel}
                          </div>
                        </div>
                      </div>

                      {/* Subtle status indicator: ● Available */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-normal shrink-0">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            offer.verificationStatusType === 'unavailable' ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                        />
                        <span>
                          {offer.verificationStatusType === 'unavailable' ? 'Unavailable' : 'Available'}
                        </span>
                      </div>
                    </div>

                    {/* Editorial Intelligence Context — Rendered ONLY for genuine alert or Premium-only */}
                    {offer.isPremiumOnly ? (
                      <div className="mt-4 flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          <svg className="w-4 h-4 text-amber-600 fill-amber-500" viewBox="0 0 24 24" aria-hidden="true">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black tracking-wide text-[#92400E] uppercase leading-none">
                            PREMIUM INTELLIGENCE
                          </div>
                          <div className="text-[11.5px] font-normal text-slate-500 mt-1 leading-snug">
                            Exclusive to StackSave Premium members
                          </div>
                        </div>
                      </div>
                    ) : offer.isIntelligenceAlert && offer.alertType ? (
                      <div className="mt-4 flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 shrink-0 ${
                            offer.alertType === 'EARLY_ACCESS'
                              ? 'text-indigo-600 fill-indigo-600'
                              : offer.alertType === 'PRICE_DROP'
                              ? 'text-emerald-600'
                              : offer.alertType === 'LIMITED_TIME'
                              ? 'text-orange-600'
                              : offer.alertType === 'PRICE_CHANGE'
                              ? 'text-sky-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {offer.alertType === 'EARLY_ACCESS' && (
                            <svg className="w-4 h-4 fill-indigo-600" viewBox="0 0 24 24" aria-hidden="true">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          )}
                          {offer.alertType === 'PRICE_DROP' && (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                              <polyline points="17 18 23 18 23 12" />
                            </svg>
                          )}
                          {offer.alertType === 'LIMITED_TIME' && (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          )}
                          {offer.alertType === 'PRICE_CHANGE' && (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                          )}
                          {offer.alertType === 'IMPORTANT' && (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          )}
                          {offer.alertType === 'NEW' && (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-black tracking-wide uppercase leading-none ${
                              offer.alertType === 'EARLY_ACCESS'
                                ? 'text-indigo-950'
                                : offer.alertType === 'PRICE_DROP'
                                ? 'text-[#065F46]'
                                : offer.alertType === 'LIMITED_TIME'
                                ? 'text-[#9A3412]'
                                : offer.alertType === 'PRICE_CHANGE'
                                ? 'text-sky-950'
                                : 'text-amber-950'
                            }`}
                          >
                            {offer.alertType === 'EARLY_ACCESS'
                              ? 'EARLY ACCESS'
                              : offer.alertType === 'PRICE_DROP'
                              ? 'PRICE DROP'
                              : offer.alertType === 'LIMITED_TIME'
                              ? 'LIMITED TIME'
                              : offer.alertType === 'PRICE_CHANGE'
                              ? 'RATE UPDATE'
                              : offer.alertType === 'IMPORTANT'
                              ? 'IMPORTANT INTELLIGENCE'
                              : 'NEW INTELLIGENCE'}
                          </div>
                          <div className="text-[11.5px] font-normal text-slate-500 mt-1 leading-snug">
                            {offer.alertReason ||
                              (offer.alertType === 'PRICE_DROP'
                                ? 'Recent price reduction detected'
                                : offer.alertType === 'LIMITED_TIME'
                                ? 'Offer ends soon • Don’t miss out'
                                : offer.alertType === 'EARLY_ACCESS'
                                ? 'Available to Premium members first'
                                : 'Verified pricing intelligence update')}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Offer Value Highlight — Prominent typography matching Image 2 */}
                    {offer.discountBadge && (
                      <div
                        className={`${
                          offer.isPremiumOnly || offer.isIntelligenceAlert ? 'mt-4' : 'mt-4.5'
                        } flex items-center gap-2.5 flex-wrap`}
                      >
                        <span className="text-[21px] sm:text-[23px] font-black uppercase tracking-tight text-slate-950">
                          {offer.discountBadge}
                        </span>
                        {offer.partner && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase tracking-wider shrink-0">
                            <UiIcon name="layers" size={11} />
                            <span>BUNDLED</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Offer Title */}
                    <h4 className="mt-1.5 line-clamp-2 min-h-[2.65rem] text-[15px] sm:text-base font-bold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-slate-950">
                      {offer.title}
                    </h4>

                    {/* Clean description */}
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                      {renderEmphasizedDescription(offer.summary)}
                    </p>

                    {/* Eligibility Capsule matching Image 2 */}
                    {offer.eligibility && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 bg-slate-100/80 border border-slate-200/50 max-w-full truncate">
                          <span className="text-slate-400 shrink-0">
                            {offer.category === 'student' ? (
                              <UiIcon name="graduation" size={13} />
                            ) : offer.category === 'api' ? (
                              <UiIcon name="code" size={13} />
                            ) : offer.category === 'startup' ? (
                              <UiIcon name="rocket" size={13} />
                            ) : (
                              <UiIcon name="users" size={13} />
                            )}
                          </span>
                          <span className="truncate">
                            For {offer.eligibility.replace(/^(Verified|Eligible)\s+/i, (m) => m.toLowerCase())}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer matching Image 2 */}
                  <div className="relative z-10 mt-5 border-t border-slate-100/90 pt-4">
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 text-xs font-normal text-slate-400">
                      <div className="min-w-0 flex items-center gap-3.5 flex-wrap">
                        <span className="flex min-w-0 items-center gap-1.5 truncate">
                          <UiIcon name="calendar" size={13} />
                          <span className="truncate text-slate-500 font-medium">Verified {formatVerificationDate(offer.lastConfirmedAt || offer.detectedAt)}</span>
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5 text-slate-400 text-xs">
                          <UiIcon name="shield" size={13} />
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

                      <span className="row-span-1 inline-flex h-10 items-center gap-2 rounded-2xl bg-[#0B0F17] px-5 text-xs font-bold text-white shadow-xs transition-all duration-150 group-hover:bg-slate-800 shrink-0">
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

        {/* ── Premium Locked Offers Preview Section (Always visible for Guest/Free users) ── */}
        {!loading && !error && !isPremiumUser && (
          <PremiumOffersGate previewCount={3} />
        )}
      </main>

      {/* ── Contextual Offers Premium Upgrade Nudge ────────── */}
      <PremiumUpgradeNudge variant="offers" />
    </div>
  );
}
