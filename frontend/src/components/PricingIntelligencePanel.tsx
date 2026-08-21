// ============================================================
// PricingIntelligencePanel — StackSave AI Audit
//
// Displays live pricing sync status per provider and recent
// new public offers detected from official sources.
//
// Data source: GET /api/intelligence/pricing-status (public)
//              GET /api/intelligence/offers (public)
//
// Design: compact glassmorphism panel, consistent with existing
//         StackSave dark navy design system. No admin auth required.
//
// Only appears on the Results page — post-audit experience only.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { fetchPricingStatus, fetchPublicOffers } from '../services/api';
import ProviderLogo from './ProviderLogo';
import { formatOfferForDisplay } from '../utils/offerFormatter';


// ── Types ────────────────────────────────────────────────────

export type DataAuthorityCategory =
  | 'VERIFIED_OFFICIAL_SUBSCRIPTION_PRICE'
  | 'AUTHORITATIVE_STATIC_BASELINE'
  | 'STALE'
  | 'NO_RELIABLE_PUBLIC_SOURCE';

interface ProviderStatus {
  providerId: string;
  displayName: string;
  syncStatus: 'VERIFIED' | 'STALE' | 'FETCH_BLOCKED' | 'PARSE_FAILED' | 'NO_RELIABLE_PUBLIC_SOURCE';
  authorityCategory?: DataAuthorityCategory;
  authorityDescription?: string;
  lastVerifiedAt: string | null;
  consecutiveFailures: number;
  sourceUrl: string | null;
  pricingStrategy: string | null;
  engineStatus: 'APPLIED' | 'SKIPPED' | 'NOT_IN_REGISTRY' | 'UNKNOWN';
  engineReason: string | null;
  plansPatched: number;
}


interface PricingSummary {
  totalProviders: number;
  verifiedCount: number;
  staleCount: number;
  blockedCount: number;
  overallHealth: 'ALL_VERIFIED' | 'PARTIAL' | 'DEGRADED';
  overlayLastAppliedAt: string | null;
}

import type { PublicOffer } from '../types';


// ── Helper functions ──────────────────────────────────────────

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (diff < 3_600_000) return 'Less than 1h ago';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function AuthorityBadge({
  category,
  strategy,
  status
}: {
  category?: DataAuthorityCategory;
  strategy: string | null;
  status: ProviderStatus['syncStatus'];
}) {
  // Infer category if not supplied
  const effectiveCat: DataAuthorityCategory =
    category ||
    (status === 'VERIFIED'
      ? 'VERIFIED_OFFICIAL_SUBSCRIPTION_PRICE'
      : status === 'STALE'
      ? 'STALE'
      : strategy === 'STATIC_FALLBACK' || status === 'FETCH_BLOCKED'
      ? 'AUTHORITATIVE_STATIC_BASELINE'
      : 'NO_RELIABLE_PUBLIC_SOURCE');

  const configs: Record<
    DataAuthorityCategory,
    { label: string; bg: string; color: string; tooltip: string }
  > = {
    VERIFIED_OFFICIAL_SUBSCRIPTION_PRICE: {
      label: '✓ Official verified',
      bg: '#DCFCE7',
      color: '#065F46',
      tooltip: 'Live verified subscription rates from official provider page markup.',
    },
    AUTHORITATIVE_STATIC_BASELINE: {
      label: '📖 Static baseline',
      bg: '#F1F5F9',
      color: '#334155',
      tooltip: 'Validated knowledge baseline. Direct automated scrape blocked by vendor.',
    },
    STALE: {
      label: '⚠ Last known (Stale)',
      bg: '#FEF3C7',
      color: '#78350F',
      tooltip: 'Sync overdue (>24h). Previous verified rates retained for continuity.',
    },
    NO_RELIABLE_PUBLIC_SOURCE: {
      label: '🚫 No public source',
      bg: '#FEE2E2',
      color: '#991B1B',
      tooltip: 'Dynamic SPA or auth-gated; no automated public rate feed available.',
    },
  };

  const cfg = configs[effectiveCat] || configs.AUTHORITATIVE_STATIC_BASELINE;

  return (
    <span
      title={cfg.tooltip}
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.03em',
        background: cfg.bg,
        color: cfg.color,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}


function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
      <div style={{ width: 90, height: 11, background: '#E2E8F0', borderRadius: 4, animation: 'pulse 1.4s ease-in-out infinite' }} />
      <div style={{ width: 52, height: 16, background: '#E2E8F0', borderRadius: 9999, animation: 'pulse 1.4s ease-in-out infinite' }} />
      <div style={{ width: 64, height: 11, background: '#E2E8F0', borderRadius: 4, animation: 'pulse 1.4s ease-in-out infinite', marginLeft: 'auto' }} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function PricingIntelligencePanel() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [summary, setSummary] = useState<PricingSummary | null>(null);
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'offers'>('status');
  const [statusError, setStatusError] = useState(false);
  const [offersError, setOffersError] = useState(false);

  const loadData = useCallback(() => {
    let isCancelled = false;

    // Load pricing status
    fetchPricingStatus()
      .then((data) => {
        if (!isCancelled) {
          setProviders(data.providers);
          setSummary(data.summary);
          setStatusError(false);
          setLoadingStatus(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setStatusError(true);
          setLoadingStatus(false);
        }
      });

    // Load offers
    fetchPublicOffers()
      .then((data) => {
        if (!isCancelled) {
          setOffers(data.offers);
          setOffersError(false);
          setLoadingOffers(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setOffersError(true);
          setLoadingOffers(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = loadData();
    return cancel;
  }, [loadData]);


  // ── Derived state ───────────────────────────────────────────

  const healthColor =
    summary?.overallHealth === 'ALL_VERIFIED' ? 'var(--color-success)'
    : summary?.overallHealth === 'PARTIAL'    ? 'var(--color-warning)'
    : '#EF4444';

  const healthLabel =
    summary?.overallHealth === 'ALL_VERIFIED' ? '✓ All Verified'
    : summary?.overallHealth === 'PARTIAL'    ? '⚠ Partially Verified'
    : '✗ Degraded';

  // ── Render ─────────────────────────────────────────────────

  return (
    <div
      className="glass-card-static"
      style={{
        borderRadius: 12,
        padding: '16px 20px',
        marginTop: 24,
        border: '1px solid rgba(30,58,95,0.12)',
        background: 'rgba(255,255,255,0.92)',
        maxWidth: 760,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15 }}>📊</span>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--color-text-heading)',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              Pricing Intelligence
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
              {loadingStatus ? (
                <span style={{ opacity: 0.5 }}>Loading sync status…</span>
              ) : statusError ? (
                <span style={{ color: '#EF4444' }}>Unavailable</span>
              ) : (
                <>
                  <span style={{ color: healthColor, fontWeight: 600 }}>{healthLabel}</span>
                  {summary?.overlayLastAppliedAt && (
                    <span style={{ marginLeft: 8 }}>
                      · Engine updated {formatTimeAgo(summary.overlayLastAppliedAt)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Offer badge */}
          {!loadingOffers && offers.length > 0 && (
            <span
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                color: '#fff',
                borderRadius: 9999,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                lineHeight: '16px',
              }}
            >
              {offers.length} new offer{offers.length !== 1 ? 's' : ''}
            </span>
          )}
          {/* Quick stats */}
          {!loadingStatus && summary && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right' }}>
              <span style={{ color: '#065F46', fontWeight: 600 }}>{summary.verifiedCount}</span>
              <span>/{summary.totalProviders} verified</span>
            </div>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{
              color: 'var(--color-text-muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ── Expanded Content ── */}
      {expanded && (
        <div style={{ marginTop: 14 }}>
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(30,58,95,0.1)',
              marginBottom: 12,
              gap: 0,
            }}
          >
            {(['status', 'offers'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '5px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  color:
                    activeTab === tab
                      ? 'var(--color-primary)'
                      : 'var(--color-text-muted)',
                  borderBottom:
                    activeTab === tab
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 0.15s ease',
                }}
              >
                {tab === 'status' ? 'Pricing Status' : `New Offers${offers.length > 0 ? ` (${offers.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* ── Pricing Status Tab ── */}
          {activeTab === 'status' && (
            <div>
              {loadingStatus ? (
                Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)
              ) : statusError ? (
                <div style={{ fontSize: 12, color: '#EF4444', padding: '8px 0' }}>
                  Unable to load pricing status. The backend may be starting up.
                </div>
              ) : providers.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>
                  No pricing sync data yet. Run a pricing sync to populate.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 0 }}>
                  {/* Header row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(140px, 1.4fr) minmax(130px, 1.3fr) 95px 75px',
                      gap: 8,
                      padding: '3px 0 6px',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-muted)',
                      borderBottom: '1px solid rgba(30,58,95,0.06)',
                    }}
                  >
                    <span>Provider</span>
                    <span>Pricing Authority</span>
                    <span>Last Checked</span>
                    <span>Engine</span>
                  </div>

                  {providers.map((p) => (
                    <div
                      key={p.providerId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(140px, 1.4fr) minmax(130px, 1.3fr) 95px 75px',
                        gap: 8,
                        padding: '7px 0',
                        fontSize: 11,
                        borderBottom: '1px solid rgba(30,58,95,0.04)',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {p.sourceUrl ? (
                          <a
                            href={p.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--color-text-heading)',
                              fontWeight: 600,
                              textDecoration: 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.displayName}
                            <span style={{ fontSize: 9, color: 'var(--color-text-muted)', marginLeft: 3 }}>↗</span>
                          </a>
                        ) : (
                          <span style={{ fontWeight: 600, color: 'var(--color-text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.displayName}
                          </span>
                        )}
                      </div>
                      <div>
                        <AuthorityBadge
                          category={p.authorityCategory}
                          strategy={p.pricingStrategy}
                          status={p.syncStatus}
                        />
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>
                        {p.lastVerifiedAt ? formatTimeAgo(p.lastVerifiedAt) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Static baseline</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        {p.engineStatus === 'APPLIED' ? (
                          <span style={{ color: '#065F46', fontWeight: 600 }}>✓ {p.plansPatched}p</span>
                        ) : p.engineStatus === 'SKIPPED' ? (
                          <span style={{ color: '#78350F' }}>Baseline</span>
                        ) : p.engineStatus === 'NOT_IN_REGISTRY' ? (
                          <span>–</span>
                        ) : (
                          <span style={{ opacity: 0.4 }}>–</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer note */}
              {!loadingStatus && !statusError && summary && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: '#F8FAFC',
                    borderRadius: 6,
                    fontSize: 10,
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.5,
                    border: '1px solid rgba(30,58,95,0.06)',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--color-text-body)', marginBottom: 2 }}>
                    Data Authority Legend:
                  </div>
                  <div>
                    <strong style={{ color: '#065F46' }}>✓ Official verified:</strong> Live pricing extracted directly from official vendor HTML/JSON-LD/Docs.
                  </div>
                  <div>
                    <strong style={{ color: '#334155' }}>📖 Static baseline:</strong> Verified knowledge baseline for SPA/bot-protected vendors (never claimed as freshly scraped).
                  </div>
                  <div>
                    <strong style={{ color: '#78350F' }}>⚠ Stale (last known):</strong> Pricing whose verification is overdue; previous confirmed rates retained for continuity.
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── New Offers Tab ── */}
          {activeTab === 'offers' && (
            <div>
              {loadingOffers ? (
                Array.from({ length: 3 }, (_, i) => <SkeletonRow key={i} />)
              ) : offersError ? (
                <div style={{ fontSize: 12, color: '#EF4444', padding: '8px 0' }}>
                  Unable to load offers.
                </div>
              ) : offers.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px 0 12px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🔍</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>No new offers detected</div>
                  <div style={{ fontSize: 11, marginTop: 4, maxWidth: 340, margin: '4px auto 0' }}>
                    The daily scan checks official provider pages for new public promotions.
                    Only genuinely new offers are recorded — repeat promotions are not re-notified.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {offers.map((rawOffer, idx) => {
                    const offer = formatOfferForDisplay(rawOffer);
                    return (
                      <div
                        key={idx}
                        style={{
                          borderRadius: 8,
                          border: '1px solid rgba(226, 232, 240, 0.9)',
                          background: '#FAFAFA',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <ProviderLogo providerId={offer.providerId} providerName={offer.providerName} size="xs" />
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: 'var(--color-text-heading)',
                                }}
                              >
                                {offer.providerName}
                              </span>
                              {offer.discountBadge && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background: '#ECFDF5',
                                    color: '#065F46',
                                    borderRadius: 4,
                                    padding: '1px 6px',
                                    border: '1px solid #A7F3D0',
                                  }}
                                >
                                  {offer.discountBadge}
                                </span>
                              )}
                              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                                {formatTimeAgo(offer.detectedAt)}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'var(--color-text-heading)',
                                marginTop: 4,
                                lineHeight: 1.4,
                              }}
                            >
                              {offer.title}
                            </div>
                            {offer.summary && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: 'var(--color-text-body, #475569)',
                                  marginTop: 3,
                                  lineHeight: 1.5,
                                }}
                              >
                                {offer.summary}
                              </div>
                            )}
                          </div>
                          <a
                            href={offer.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flexShrink: 0,
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--color-text-heading)',
                              textDecoration: 'none',
                              background: '#F1F5F9',
                              border: '1px solid #E2E8F0',
                              borderRadius: 5,
                              padding: '3px 8px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Official source ↗
                          </a>
                        </div>
                        {offer.expiresAt && (
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 5 }}>
                            Expires: {new Date(offer.expiresAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    );
                  })}


                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(30,58,95,0.06)' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                      Official provider sources only • Account-specific offers excluded
                    </div>
                    <a
                      href="/offers"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--color-primary, #1E3A5F)',
                        textDecoration: 'none',
                      }}
                    >
                      View all in Offers Hub →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
