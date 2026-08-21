// ============================================================
// Pricing Sync — Shared Types
// StackSave AI Audit
// ============================================================

// ── Sync Status ───────────────────────────────────────────────
export type SyncStatus =
  | 'VERIFIED'                  // Live price extracted & validated this cycle
  | 'STALE'                     // Last verified >24 h ago; previous price retained
  | 'FETCH_BLOCKED'             // Server returned 403 / 429 / network error
  | 'PARSE_FAILED'              // Page fetched but pricing not found in markup
  | 'NO_RELIABLE_PUBLIC_SOURCE' // SPA-rendered; no static extraction possible
  | 'VALIDATION_SUSPICIOUS';    // Price change >200% — flagged for manual review

// ── Extraction Strategy ──────────────────────────────────────
export type ExtractionStrategy =
  | 'JSON_LD'           // application/ld+json structured data (Cursor)
  | 'NEXTJS_EMBEDDED'   // Next.js / Contentful data payload (GitHub Copilot)
  | 'HTML_TABLE'        // Official documentation HTML pricing table (DeepSeek)
  | 'PLAYWRIGHT_DOM'    // Headless browser hydrated DOM (Claude, Gemini, ChatGPT, Windsurf, Perplexity, API docs)
  | 'STATIC_BASELINE'   // Verified free tier or static reference baseline (Codex, GitHub Models)
  | 'REST_API'          // Public REST API endpoint (optional reference only)
  | 'STATIC_FALLBACK';  // Server-side fallback probe when browser is unavailable

// ── Normalized Plan ───────────────────────────────────────────
export interface NormalizedPlan {
  id: string;
  label: string;
  monthlyPricePerSeat: number;   // 0 = free / pay-as-you-go
  annualPricePerSeat?: number;
  isPayPerUse?: boolean;
  minSeats?: number;
  currency: string;              // ISO 4217, default 'USD'
}

// ── Adapter Result ────────────────────────────────────────────
export interface ProviderPricingResult {
  providerId: string;
  status: SyncStatus;
  strategy: ExtractionStrategy;
  sourceUrl: string;
  fetchedAt: Date;
  plans: NormalizedPlan[];
  /** Raw text/object from source for audit trail */
  rawExtract?: unknown;
  /** Human-readable reason when status !== 'VERIFIED' */
  failureReason?: string;
}

// ── Offer Detection ───────────────────────────────────────────
export interface NormalizedOffer {
  offerId?: string;
  providerId: string;
  title: string;
  description: string;
  discount?: string | number;
  normalPrice?: number;
  promotionalPrice?: number;
  currency?: string;
  duration?: string;
  eligibility?: string;
  /** Deterministic fingerprint for deduplication */
  fingerprint: string;
  sourceUrl: string;
  detectedAt: Date;
  expiresAt?: Date;
  discountPercent?: number;
  promoCode?: string;
  isVerified?: boolean;
}


// ── Runner Ingestion Payload Types ────────────────────────────
export interface OfficialExtractedProviderData {
  providerId: string;
  displayName?: string;
  sourceUrl: string;
  extractionStrategy: ExtractionStrategy;
  status: SyncStatus;
  authorityStatus?: string;
  plans: NormalizedPlan[];
  offers?: NormalizedOffer[];
  failureReason?: string;
  checkedAt: string | Date;
}

export interface OfficialIngestPayload {
  runnerVersion: string;
  executedAt: string | Date;
  providers: OfficialExtractedProviderData[];
}

// ── Validation Result ─────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  isSuspicious: boolean;
  errors: string[];
  warnings: string[];
}

// ── Price Change Record ───────────────────────────────────────
export interface PriceChange {
  planId: string;
  planLabel: string;
  previousPrice: number;
  newPrice: number;
  changePercent: number;
  currency: string;
}
