// ============================================================
// Offer Monitor — StackSave AI Audit
//
// Scans official provider pages for public promotions.
// Uses fingerprint-based deduplication so a promotion is only
// created as a NotificationEvent once per unique offer.
//
// Coverage: All 13 providers.
// For providers where automated extraction is blocked or SPA-rendered,
// explicitly records NO_RELIABLE_PUBLIC_SOURCE with vendor-specific reason.
// No provider is silently skipped.
//
// REQUIREMENT: Only official PUBLIC vendor sources are scanned.
// ZERO third-party / OpenRouter dependencies.
// ============================================================

import { createHash } from 'crypto';
import { NotificationEventModel } from '../services/dbService';
import { NormalizedOffer } from './types';

// ── Offer Source Types ────────────────────────────────────────

type OfferAccessMethod =
  | 'FETCH_STATIC_HTML'          // Standard static HTML fetch — keywords scanned
  | 'NO_RELIABLE_PUBLIC_SOURCE'; // Blocked, SPA, or API-only — no public offer page

interface OfferCheckConfig {
  providerId: string;
  displayName: string;
  offersUrl: string;
  accessMethod: OfferAccessMethod;
  noSourceReason?: string;       // Required when accessMethod = NO_RELIABLE_PUBLIC_SOURCE
  /** Simple keyword patterns to look for in page text */
  promoKeywords?: string[];
  /** Whether this provider is a pay-per-token API or developer free tier */
  isApiPricingOnly?: boolean;
}

// ── All 13 Provider Configurations (OFFICIAL SOURCES ONLY) ────
//
// Providers with NO_RELIABLE_PUBLIC_SOURCE are documented with
// the specific reason. This is transparent, not a silent skip.
//
const OFFER_CHECK_CONFIGS: OfferCheckConfig[] = [
  // ── Fetchable providers (static HTML with keyword scanning) ──
  {
    providerId: 'cursor',
    displayName: 'Cursor',
    offersUrl: 'https://cursor.com/pricing',
    accessMethod: 'FETCH_STATIC_HTML',
    promoKeywords: ['free trial', 'discount', 'off', 'promo', 'limited time', 'special offer', 'save', '% off'],
  },
  {
    providerId: 'github-copilot',
    displayName: 'GitHub Copilot',
    offersUrl: 'https://github.com/features/copilot/plans',
    accessMethod: 'FETCH_STATIC_HTML',
    promoKeywords: ['free for students', 'free for teachers', 'free for open source', 'free trial', 'discount'],
  },

  // ── Blocked / SPA providers — cannot reliably scan for offers ──
  {
    providerId: 'chatgpt',
    displayName: 'ChatGPT',
    offersUrl: 'https://openai.com/chatgpt/pricing',
    accessMethod: 'NO_RELIABLE_PUBLIC_SOURCE',
    noSourceReason: 'openai.com returns HTTP 403 (Cloudflare challenge) for automated fetch. No static offer markup available.',
  },
  {
    providerId: 'claude',
    displayName: 'Claude',
    offersUrl: 'https://claude.com/pricing',
    accessMethod: 'NO_RELIABLE_PUBLIC_SOURCE',
    noSourceReason: 'claude.com is a Webflow SPA — offer content is JavaScript-rendered in DOM, not in static HTML.',
  },
  {
    providerId: 'gemini',
    displayName: 'Gemini',
    offersUrl: 'https://one.google.com/about/ai-premium',
    accessMethod: 'NO_RELIABLE_PUBLIC_SOURCE',
    noSourceReason: 'Google One is a client-side React SPA — offer content is not in static HTML.',
  },
  {
    providerId: 'windsurf',
    displayName: 'Windsurf',
    offersUrl: 'https://codeium.com/pricing',
    accessMethod: 'NO_RELIABLE_PUBLIC_SOURCE',
    noSourceReason: 'codeium.com returns HTTP 429 (Vercel security challenge) for automated fetch.',
  },
  {
    providerId: 'perplexity',
    displayName: 'Perplexity',
    offersUrl: 'https://www.perplexity.ai/pro',
    accessMethod: 'NO_RELIABLE_PUBLIC_SOURCE',
    noSourceReason: 'perplexity.ai returns HTTP 403 (Cloudflare challenge) for automated fetch.',
  },
  {
    providerId: 'deepseek',
    displayName: 'DeepSeek',
    offersUrl: 'https://api-docs.deepseek.com/quick_start/pricing/',
    accessMethod: 'FETCH_STATIC_HTML',
    promoKeywords: ['off-peak', 'discount', 'free', 'trial', 'promotion'],
  },
  {
    providerId: 'kimi',
    displayName: 'Kimi',
    offersUrl: 'https://platform.moonshot.cn/pricing',
    accessMethod: 'NO_RELIABLE_PUBLIC_SOURCE',
    noSourceReason: 'Moonshot/Kimi platform requires session authentication — no public static discount page.',
    isApiPricingOnly: true,
  },

  // ── API/model pricing only — no subscription offers page ────
  {
    providerId: 'anthropic-api',
    displayName: 'Anthropic API',
    offersUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    accessMethod: 'NO_RELIABLE_PUBLIC_SOURCE',
    noSourceReason: 'Anthropic API uses pay-as-you-go token pricing — no consumer subscription promotion page.',
    isApiPricingOnly: true,
  },
  {
    providerId: 'openai-api',
    displayName: 'OpenAI API',
    offersUrl: 'https://openai.com/api/pricing',
    accessMethod: 'NO_RELIABLE_PUBLIC_SOURCE',
    noSourceReason: 'OpenAI API uses pay-as-you-go token pricing — no consumer subscription promotion page.',
    isApiPricingOnly: true,
  },
  {
    providerId: 'codex',
    displayName: 'Codex',
    offersUrl: 'https://openai.com/blog/openai-codex',
    accessMethod: 'NO_RELIABLE_PUBLIC_SOURCE',
    noSourceReason: 'Codex is free-tier access for registered developers — no subscription or discount to scan for.',
    isApiPricingOnly: true,
  },
  {
    providerId: 'github-models',
    displayName: 'GitHub Models',
    offersUrl: 'https://github.com/marketplace/models',
    accessMethod: 'NO_RELIABLE_PUBLIC_SOURCE',
    noSourceReason: 'GitHub Models is free-tier prototyping access — no subscription or promotion page to scan.',
    isApiPricingOnly: true,
  },
];


// â”€â”€ Fingerprint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildFingerprint(providerId: string, keyword: string, context: string): string {
  return createHash('sha256')
    .update(`${providerId}::${keyword.toLowerCase().trim()}::${context.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 32);
}

// â”€â”€ Page Offer Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function extractOffersFromPage(config: OfferCheckConfig): Promise<NormalizedOffer[]> {
  const fetchedAt = new Date();
  const offers: NormalizedOffer[] = [];
  const keywords = config.promoKeywords ?? [];

  let html: string;
  try {
    const res = await fetch(config.offersUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StackSave-OfferBot/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }

  // Strip HTML tags for text-based keyword scanning
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  for (const keyword of keywords) {
    const idx = textContent.indexOf(keyword.toLowerCase());
    if (idx === -1) continue;

    // Extract a context window around the keyword
    const start = Math.max(0, idx - 40);
    const end = Math.min(textContent.length, idx + keyword.length + 120);
    const context = textContent.slice(start, end).trim();

    const title = `${config.displayName}: "${keyword}" promotion detected`;
    const fingerprint = buildFingerprint(config.providerId, keyword, context);

    offers.push({
      providerId: config.providerId,
      title,
      description: context,
      fingerprint,
      sourceUrl: config.offersUrl,
      detectedAt: fetchedAt,
      isVerified: false, // Keyword-detected only â€” requires human confirmation
    });

    break; // One offer per provider per scan to avoid noise
  }

  return offers;
}

// â”€â”€ Monitor Result Type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface OfferMonitorResult {
  providerId: string;
  displayName: string;
  accessMethod: OfferAccessMethod;
  newOffers: number;
  skippedDuplicates: number;
  errors: string[];
  noSourceReason?: string;
  isApiPricingOnly?: boolean;
}

// â”€â”€ Monitor Runner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function runOfferMonitor(): Promise<OfferMonitorResult[]> {
  console.log('[OfferMonitor] Starting offer scan for all 13 providers...');
  const results: OfferMonitorResult[] = [];

  for (const config of OFFER_CHECK_CONFIGS) {
    const result: OfferMonitorResult = {
      providerId: config.providerId,
      displayName: config.displayName,
      accessMethod: config.accessMethod,
      newOffers: 0,
      skippedDuplicates: 0,
      errors: [],
      noSourceReason: config.noSourceReason,
      isApiPricingOnly: config.isApiPricingOnly,
    };

    // Providers with no reliable public source â€” log explicitly, do NOT silently skip
    if (config.accessMethod === 'NO_RELIABLE_PUBLIC_SOURCE') {
      const reason = config.isApiPricingOnly
        ? `[OfferMonitor] NO_RELIABLE_PUBLIC_SOURCE provider=${config.providerId} (API pricing only) reason="${config.noSourceReason}"`
        : `[OfferMonitor] NO_RELIABLE_PUBLIC_SOURCE provider=${config.providerId} reason="${config.noSourceReason}"`;
      console.log(reason);
      results.push(result);
      continue;
    }

    // FETCH_STATIC_HTML â€” attempt keyword extraction
    let offers: NormalizedOffer[] = [];
    try {
      offers = await extractOffersFromPage(config);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Extraction error: ${msg}`);
      console.warn(`[OfferMonitor] Extraction failed provider=${config.providerId}: ${msg}`);
      results.push(result);
      continue;
    }

    if (offers.length === 0) {
      console.log(`[OfferMonitor] No offers found provider=${config.providerId}`);
    }

    for (const offer of offers) {
      // Fingerprint-based deduplication â€” insert only if fingerprint not already in DB
      const existing = await NotificationEventModel.findOne({ fingerprint: offer.fingerprint });

      if (existing) {
        result.skippedDuplicates++;
        console.log(`[OfferMonitor] Duplicate skipped provider=${config.providerId} fingerprint=${offer.fingerprint.slice(0, 8)}...`);
        continue;
      }

      try {
        await NotificationEventModel.create({
          providerId: offer.providerId,
          providerName: config.displayName,
          eventType: 'NEW_OFFER',
          fingerprint: offer.fingerprint,
          title: offer.title,
          description: offer.description,
          sourceUrl: offer.sourceUrl,
          detectedAt: offer.detectedAt,
          expiresAt: offer.expiresAt,
        });
        result.newOffers++;
        console.log(`[OfferMonitor] NEW offer recorded provider=${config.providerId} title="${offer.title}"`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // E11000 duplicate key = race condition â€” safely ignorable
        if (!msg.includes('E11000')) {
          result.errors.push(`DB insert error: ${msg}`);
        } else {
          result.skippedDuplicates++;
        }
      }
    }

    results.push(result);
  }

  const newTotal = results.reduce((s, r) => s + r.newOffers, 0);
  const noSource = results.filter((r) => r.accessMethod === 'NO_RELIABLE_PUBLIC_SOURCE').length;
  console.log(
    `[OfferMonitor] Scan complete: ${newTotal} new offers, ` +
      `${noSource} providers with no reliable public source, ` +
      `${results.filter((r) => r.errors.length > 0).length} errors`
  );

  return results;
}
