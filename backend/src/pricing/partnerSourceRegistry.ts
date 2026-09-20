// ============================================================
// Partner Source Registry — StackSave AI Spend & Intelligence
//
// Layer 1 & Layer 2 Official Partner & Domain Allowlist Registry
// Covers 10 Discovery Categories:
// 1. Telecom (Jio, Airtel, Vi, BSNL, Verizon, AT&T, T-Mobile, Vodafone, etc.)
// 2. Broadband (JioFiber, Airtel Xstream, Comcast, Spectrum, etc.)
// 3. Device Manufacturers (Samsung, Apple, Google Pixel, OnePlus, Xiaomi, Dell, Lenovo, HP, Asus)
// 4. Banking & Fintech (American Express, Chase, HDFC, HSBC, Revolut)
// 5. Education & Student Hubs (GitHub Student Pack, UNiDAYS, Student Beans, SheerID)
// 6. Cloud & Hosting (AWS Activate, Microsoft Founders Hub, Google Cloud for Startups, DigitalOcean)
// 7. Developer Programs (GitHub, GitLab, NVIDIA Inception/Developer, JetBrains)
// 8. Software Platforms (Notion, Figma, Canva, Adobe, Slack, Miro)
// 9. Memberships & Subscriptions (Amazon Prime, Flipkart Plus, Uber One)
// 10. Other Strategic Partnerships
// ============================================================

export type PartnerCategory =
  | 'telecom'
  | 'broadband'
  | 'devices'
  | 'banking'
  | 'credit_card'
  | 'education'
  | 'cloud'
  | 'developer'
  | 'software'
  | 'membership'
  | 'other';

export interface OfficialPartnerConfig {
  partnerId: string;
  name: string;
  category: PartnerCategory;
  officialDomain: string;
  officialDomains: string[];
  offersUrl: string;
  secondaryUrls?: string[];
  country?: string;
  region?: string;
  isRegistered?: boolean;
}

// ── Canonical AI Provider Mapping ─────────────────────────────

export interface CanonicalAiProviderResolution {
  providerId: string;
  displayName: string;
  isKnown: boolean;
}

const CANONICAL_PROVIDER_ALIAS_MAP: Record<string, { providerId: string; displayName: string }> = {
  gemini: { providerId: 'gemini', displayName: 'Google Gemini' },
  'google gemini': { providerId: 'gemini', displayName: 'Google Gemini' },
  'google ai': { providerId: 'gemini', displayName: 'Google Gemini' },
  'google ai pro': { providerId: 'gemini', displayName: 'Google Gemini' },
  'google one ai': { providerId: 'gemini', displayName: 'Google Gemini' },
  'google one ai premium': { providerId: 'gemini', displayName: 'Google Gemini' },
  'google one': { providerId: 'gemini', displayName: 'Google Gemini' },

  perplexity: { providerId: 'perplexity', displayName: 'Perplexity' },
  'perplexity pro': { providerId: 'perplexity', displayName: 'Perplexity' },
  'perplexity ai': { providerId: 'perplexity', displayName: 'Perplexity' },

  chatgpt: { providerId: 'chatgpt', displayName: 'ChatGPT' },
  'chatgpt plus': { providerId: 'chatgpt', displayName: 'ChatGPT' },
  'chatgpt team': { providerId: 'chatgpt', displayName: 'ChatGPT' },
  'chatgpt pro': { providerId: 'chatgpt', displayName: 'ChatGPT' },
  openai: { providerId: 'chatgpt', displayName: 'ChatGPT' },

  claude: { providerId: 'claude', displayName: 'Claude' },
  'claude pro': { providerId: 'claude', displayName: 'Claude' },
  'claude team': { providerId: 'claude', displayName: 'Claude' },
  anthropic: { providerId: 'claude', displayName: 'Claude' },

  cursor: { providerId: 'cursor', displayName: 'Cursor' },
  'cursor pro': { providerId: 'cursor', displayName: 'Cursor' },

  'github copilot': { providerId: 'github-copilot', displayName: 'GitHub Copilot' },
  'github-copilot': { providerId: 'github-copilot', displayName: 'GitHub Copilot' },
  copilot: { providerId: 'github-copilot', displayName: 'GitHub Copilot' },

  deepseek: { providerId: 'deepseek', displayName: 'DeepSeek' },
  'deepseek pro': { providerId: 'deepseek', displayName: 'DeepSeek' },

  windsurf: { providerId: 'windsurf', displayName: 'Windsurf' },
  codeium: { providerId: 'windsurf', displayName: 'Windsurf' },

  grok: { providerId: 'grok', displayName: 'Grok' },
  xai: { providerId: 'grok', displayName: 'Grok' },
  'supergrok': { providerId: 'grok', displayName: 'Grok' },

  antigravity: { providerId: 'antigravity', displayName: 'Google Antigravity' },
  glm: { providerId: 'glm', displayName: 'GLM (Z.ai)' },
  'z.ai': { providerId: 'glm', displayName: 'GLM (Z.ai)' },
  muse: { providerId: 'muse', displayName: 'Muse (Meta)' },
  meta: { providerId: 'muse', displayName: 'Muse (Meta)' },

  // Phase 2 Expansion Provider Aliases
  notion: { providerId: 'notion-ai', displayName: 'Notion AI' },
  'notion ai': { providerId: 'notion-ai', displayName: 'Notion AI' },
  canva: { providerId: 'canva-ai', displayName: 'Canva AI' },
  'canva ai': { providerId: 'canva-ai', displayName: 'Canva AI' },
  figma: { providerId: 'figma-ai', displayName: 'Figma AI' },
  'figma ai': { providerId: 'figma-ai', displayName: 'Figma AI' },
  elevenlabs: { providerId: 'elevenlabs', displayName: 'ElevenLabs' },
  groq: { providerId: 'groq', displayName: 'Groq' },
  together: { providerId: 'together-ai', displayName: 'Together AI' },
  'together ai': { providerId: 'together-ai', displayName: 'Together AI' },
  fireworks: { providerId: 'fireworks-ai', displayName: 'Fireworks AI' },
  'fireworks ai': { providerId: 'fireworks-ai', displayName: 'Fireworks AI' },
  cohere: { providerId: 'cohere', displayName: 'Cohere' },
  grammarly: { providerId: 'grammarly', displayName: 'Grammarly AI' },
  'grammarly ai': { providerId: 'grammarly', displayName: 'Grammarly AI' },
  otter: { providerId: 'otter-ai', displayName: 'Otter.ai' },
  'otter.ai': { providerId: 'otter-ai', displayName: 'Otter.ai' },
  deepl: { providerId: 'deepl', displayName: 'DeepL Pro' },
  'deepl pro': { providerId: 'deepl', displayName: 'DeepL Pro' },
  descript: { providerId: 'descript', displayName: 'Descript' },
  synthesia: { providerId: 'synthesia', displayName: 'Synthesia' },
  ideogram: { providerId: 'ideogram', displayName: 'Ideogram' },
  leonardo: { providerId: 'leonardo-ai', displayName: 'Leonardo AI' },
  'leonardo ai': { providerId: 'leonardo-ai', displayName: 'Leonardo AI' },
  suno: { providerId: 'suno', displayName: 'Suno' },
  gamma: { providerId: 'gamma', displayName: 'Gamma' },
  bolt: { providerId: 'bolt-new', displayName: 'Bolt.new' },
  'bolt.new': { providerId: 'bolt-new', displayName: 'Bolt.new' },
  notebooklm: { providerId: 'notebooklm', displayName: 'Google NotebookLM' },
  'google notebooklm': { providerId: 'notebooklm', displayName: 'Google NotebookLM' },
  v0: { providerId: 'v0', displayName: 'v0 by Vercel' },
  wandb: { providerId: 'wandb', displayName: 'Weights & Biases' },
  'weights & biases': { providerId: 'wandb', displayName: 'Weights & Biases' },
  huggingface: { providerId: 'huggingface', displayName: 'Hugging Face' },
  'hugging face': { providerId: 'huggingface', displayName: 'Hugging Face' },
  lovable: { providerId: 'lovable', displayName: 'Lovable' },
  replit: { providerId: 'replit-ai', displayName: 'Replit AI' },
  'replit ai': { providerId: 'replit-ai', displayName: 'Replit AI' },
  framer: { providerId: 'framer', displayName: 'Framer' },
  kling: { providerId: 'kling-ai', displayName: 'Kling AI' },
  'kling ai': { providerId: 'kling-ai', displayName: 'Kling AI' },
  'kling-ai': { providerId: 'kling-ai', displayName: 'Kling AI' },
  luma: { providerId: 'luma-ai', displayName: 'Luma AI' },
  'luma ai': { providerId: 'luma-ai', displayName: 'Luma AI' },
  'luma-ai': { providerId: 'luma-ai', displayName: 'Luma AI' },
  udio: { providerId: 'udio', displayName: 'Udio' },
  speechify: { providerId: 'speechify', displayName: 'Speechify' },
  mistral: { providerId: 'mistral', displayName: 'Mistral AI' },
  'mistral ai': { providerId: 'mistral', displayName: 'Mistral AI' },
  cerebras: { providerId: 'cerebras', displayName: 'Cerebras' },
  sambanova: { providerId: 'sambanova', displayName: 'SambaNova' },
  beautiful: { providerId: 'beautiful-ai', displayName: 'Beautiful.ai' },
  'beautiful.ai': { providerId: 'beautiful-ai', displayName: 'Beautiful.ai' },
  'beautiful-ai': { providerId: 'beautiful-ai', displayName: 'Beautiful.ai' },
  consensus: { providerId: 'consensus', displayName: 'Consensus' },
  'consensus ai': { providerId: 'consensus', displayName: 'Consensus' },
  'amazon q': { providerId: 'amazon-q', displayName: 'Amazon Q Developer' },
  'amazon-q': { providerId: 'amazon-q', displayName: 'Amazon Q Developer' },
  'amazon q developer': { providerId: 'amazon-q', displayName: 'Amazon Q Developer' },
  jasper: { providerId: 'jasper', displayName: 'Jasper' },
  'jasper ai': { providerId: 'jasper', displayName: 'Jasper' },
  'copy.ai': { providerId: 'copy-ai', displayName: 'Copy.ai' },
  'copy-ai': { providerId: 'copy-ai', displayName: 'Copy.ai' },
  copyai: { providerId: 'copy-ai', displayName: 'Copy.ai' },
  writesonic: { providerId: 'writesonic', displayName: 'Writesonic' },
  uizard: { providerId: 'uizard', displayName: 'Uizard' },
  elicit: { providerId: 'elicit', displayName: 'Elicit' },
  'elicit ai': { providerId: 'elicit', displayName: 'Elicit' },
  scite: { providerId: 'scite', displayName: 'Scite' },
  'scite ai': { providerId: 'scite', displayName: 'Scite' },
};

export function canonicalizeAiProvider(nameOrId: string): CanonicalAiProviderResolution {
  if (!nameOrId || typeof nameOrId !== 'string') {
    return { providerId: 'unresolved-ai', displayName: 'AI Service', isKnown: false };
  }
  const clean = nameOrId.toLowerCase().trim();
  const match = CANONICAL_PROVIDER_ALIAS_MAP[clean];
  if (match) {
    return { providerId: match.providerId, displayName: match.displayName, isKnown: true };
  }

  // Partial search
  for (const [alias, canonical] of Object.entries(CANONICAL_PROVIDER_ALIAS_MAP)) {
    if (clean.includes(alias) || alias.includes(clean)) {
      return { providerId: canonical.providerId, displayName: canonical.displayName, isKnown: true };
    }
  }

  // Unknown AI provider — preserve name without mutating core catalog
  return {
    providerId: clean.replace(/[^a-z0-9-]/g, '-'),
    displayName: nameOrId.trim(),
    isKnown: false,
  };
}

// ── Known Official Partners (Layer 1) ──────────────────────────

export const INITIAL_REGISTERED_PARTNERS: OfficialPartnerConfig[] = [
  // ── 1. Telecom ───────────────────────────────────────────────
  {
    partnerId: 'jio',
    name: 'Jio',
    category: 'telecom',
    officialDomain: 'jio.com',
    officialDomains: ['jio.com', 'relianceretail.com', 'ril.com'],
    offersUrl: 'https://www.jio.com/google-gemini-offer/',
    secondaryUrls: ['https://www.jio.com/5g', 'https://www.jio.com/google-gemini-offer/'],
    country: 'IN',
    region: 'India',
    isRegistered: true,
  },
  {
    partnerId: 'airtel',
    name: 'Airtel',
    category: 'telecom',
    officialDomain: 'airtel.in',
    officialDomains: ['airtel.in', 'airtel.com', 'bharti.com'],
    offersUrl: 'https://www.airtel.in/prepaid-plans',
    secondaryUrls: ['https://www.airtel.in/thanks-rewards', 'https://www.airtel.in/perplexity-pro'],
    country: 'IN',
    region: 'India',
    isRegistered: true,
  },
  {
    partnerId: 'vi',
    name: 'Vodafone Idea (Vi)',
    category: 'telecom',
    officialDomain: 'myvi.in',
    officialDomains: ['myvi.in', 'vodafoneidea.com'],
    offersUrl: 'https://www.myvi.in/prepaid/best-prepaid-plans',
    country: 'IN',
    region: 'India',
    isRegistered: true,
  },
  {
    partnerId: 'bsnl',
    name: 'BSNL',
    category: 'telecom',
    officialDomain: 'bsnl.co.in',
    officialDomains: ['bsnl.co.in', 'bsnl.in'],
    offersUrl: 'https://portal.bsnl.in/myportal/',
    country: 'IN',
    region: 'India',
    isRegistered: true,
  },
  {
    partnerId: 'verizon',
    name: 'Verizon',
    category: 'telecom',
    officialDomain: 'verizon.com',
    officialDomains: ['verizon.com', 'verizonwireless.com'],
    offersUrl: 'https://www.verizon.com/plans/',
    country: 'US',
    region: 'North America',
    isRegistered: true,
  },
  {
    partnerId: 't-mobile',
    name: 'T-Mobile',
    category: 'telecom',
    officialDomain: 't-mobile.com',
    officialDomains: ['t-mobile.com'],
    offersUrl: 'https://www.t-mobile.com/cell-phone-plans',
    country: 'US',
    region: 'North America',
    isRegistered: true,
  },
  {
    partnerId: 'deutsche-telekom',
    name: 'Deutsche Telekom',
    category: 'telecom',
    officialDomain: 'telekom.com',
    officialDomains: ['telekom.com', 'telekom.de'],
    offersUrl: 'https://www.telekom.com/en/newsroom/latest-updates/media-information/2024/11/ai-for-everyone',
    country: 'DE',
    region: 'Europe',
    isRegistered: true,
  },

  // ── 2. Broadband & ISPs ───────────────────────────────────────
  {
    partnerId: 'jiofiber',
    name: 'JioFiber',
    category: 'broadband',
    officialDomain: 'jio.com',
    officialDomains: ['jio.com'],
    offersUrl: 'https://www.jio.com/fiber/',
    country: 'IN',
    region: 'India',
    isRegistered: true,
  },
  {
    partnerId: 'airtel-xstream',
    name: 'Airtel Xstream Fiber',
    category: 'broadband',
    officialDomain: 'airtel.in',
    officialDomains: ['airtel.in'],
    offersUrl: 'https://www.airtel.in/broadband/',
    country: 'IN',
    region: 'India',
    isRegistered: true,
  },

  // ── 3. Device OEMs ───────────────────────────────────────────
  {
    partnerId: 'samsung',
    name: 'Samsung',
    category: 'devices',
    officialDomain: 'samsung.com',
    officialDomains: ['samsung.com', 'samsungmobilepress.com'],
    offersUrl: 'https://www.samsung.com/galaxy-ai/',
    secondaryUrls: ['https://www.samsung.com/us/smartphones/galaxy-s24-ultra/offers/'],
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
  {
    partnerId: 'google-pixel',
    name: 'Google Pixel',
    category: 'devices',
    officialDomain: 'store.google.com',
    officialDomains: ['store.google.com', 'google.com'],
    offersUrl: 'https://store.google.com/category/phones',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
  {
    partnerId: 'oneplus',
    name: 'OnePlus',
    category: 'devices',
    officialDomain: 'oneplus.com',
    officialDomains: ['oneplus.com', 'oneplus.in'],
    offersUrl: 'https://www.oneplus.com/',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
  {
    partnerId: 'xiaomi',
    name: 'Xiaomi',
    category: 'devices',
    officialDomain: 'mi.com',
    officialDomains: ['mi.com', 'xiaomi.com'],
    offersUrl: 'https://www.mi.com/global/event',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
  {
    partnerId: 'asus',
    name: 'ASUS',
    category: 'devices',
    officialDomain: 'asus.com',
    officialDomains: ['asus.com', 'rog.asus.com', 'press.asus.com'],
    offersUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
    secondaryUrls: [
      'https://www.asus.com/business/resources/news/asus-chromebook-plus-with-google-one-ai-premium/',
      'https://www.asus.com/content/google-one/',
      'https://www.asus.com/us/deals/',
    ],
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
  {
    partnerId: 'nothing',
    name: 'Nothing Technology',
    category: 'devices',
    officialDomain: 'nothing.tech',
    officialDomains: ['nothing.tech'],
    offersUrl: 'https://nothing.tech/pages/news',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
  {
    partnerId: 'softbank',
    name: 'SoftBank',
    category: 'telecom',
    officialDomain: 'softbank.jp',
    officialDomains: ['softbank.jp', 'ymobile.jp', 'linemo.jp'],
    offersUrl: 'https://www.softbank.jp/mobile/special/perplexity/',
    country: 'JP',
    region: 'Japan',
    isRegistered: true,
  },
  {
    partnerId: 'dell',
    name: 'Dell Technologies',
    category: 'devices',
    officialDomain: 'dell.com',
    officialDomains: ['dell.com'],
    offersUrl: 'https://www.dell.com/en-us/shop/deals',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
  {
    partnerId: 'lenovo',
    name: 'Lenovo',
    category: 'devices',
    officialDomain: 'lenovo.com',
    officialDomains: ['lenovo.com'],
    offersUrl: 'https://www.lenovo.com/deals',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },

  // ── 4. Banking & Fintech ─────────────────────────────────────
  {
    partnerId: 'amex',
    name: 'American Express',
    category: 'banking',
    officialDomain: 'americanexpress.com',
    officialDomains: ['americanexpress.com', 'amex.co', 'global.americanexpress.com'],
    offersUrl: 'https://global.americanexpress.com/card-benefits/detail/chatgpt-business-credit/business-platinum',
    secondaryUrls: [
      'https://www.americanexpress.com/us/credit-cards/business-cards/business-platinum-credit-card-amex/',
      'https://www.americanexpress.com/en-us/benefits/',
    ],
    country: 'US',
    region: 'United States',
    isRegistered: true,
  },
  {
    partnerId: 'hdfc',
    name: 'HDFC Bank',
    category: 'banking',
    officialDomain: 'hdfcbank.com',
    officialDomains: ['hdfcbank.com'],
    offersUrl: 'https://www.hdfcbank.com/personal/pay/cards/credit-cards',
    country: 'IN',
    region: 'India',
    isRegistered: true,
  },

  // ── 5. Education & Student Hubs ──────────────────────────────
  {
    partnerId: 'github-education',
    name: 'GitHub Student Developer Pack',
    category: 'education',
    officialDomain: 'education.github.com',
    officialDomains: ['education.github.com', 'github.com'],
    offersUrl: 'https://education.github.com/pack',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
  {
    partnerId: 'unidays',
    name: 'UNiDAYS',
    category: 'education',
    officialDomain: 'myunidays.com',
    officialDomains: ['myunidays.com'],
    offersUrl: 'https://www.myunidays.com/US/en-US/category/tech',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },

  // ── 6. Cloud & Startup Programs ──────────────────────────────
  {
    partnerId: 'aws-activate',
    name: 'AWS Activate',
    category: 'cloud',
    officialDomain: 'aws.amazon.com',
    officialDomains: ['aws.amazon.com', 'amazon.com'],
    offersUrl: 'https://aws.amazon.com/activate/',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
  {
    partnerId: 'msft-founders-hub',
    name: 'Microsoft for Startups Founders Hub',
    category: 'cloud',
    officialDomain: 'microsoft.com',
    officialDomains: ['microsoft.com', 'azure.com'],
    offersUrl: 'https://www.microsoft.com/en-us/startups',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },

  // ── 7. Developer Ecosystems ──────────────────────────────────
  {
    partnerId: 'nvidia-developer',
    name: 'NVIDIA Developer & Inception',
    category: 'developer',
    officialDomain: 'nvidia.com',
    officialDomains: ['nvidia.com', 'developer.nvidia.com'],
    offersUrl: 'https://www.nvidia.com/en-us/startups/',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
  {
    partnerId: 'jetbrains',
    name: 'JetBrains',
    category: 'developer',
    officialDomain: 'jetbrains.com',
    officialDomains: ['jetbrains.com'],
    offersUrl: 'https://www.jetbrains.com/ai/',
    country: 'GLOBAL',
    region: 'Global',
    isRegistered: true,
  },
];

// In-memory registry with dynamic registration capabilities (Layer 2)
const registeredPartnersMap = new Map<string, OfficialPartnerConfig>(
  INITIAL_REGISTERED_PARTNERS.map((p) => [p.partnerId, p])
);

// Dynamic domain allowlist
const allowlistedDomainsSet = new Set<string>();
for (const p of INITIAL_REGISTERED_PARTNERS) {
  for (const d of p.officialDomains) {
    allowlistedDomainsSet.add(d.toLowerCase().trim());
  }
}

/**
 * Extracts normalized hostname / root domain from URL or domain string.
 */
export function extractRootDomain(inputUrlOrDomain: string): string {
  if (!inputUrlOrDomain) return '';
  let domain = inputUrlOrDomain.toLowerCase().trim();
  try {
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      const parsed = new URL(domain);
      domain = parsed.hostname;
    } else {
      // If it contains path, strip it
      domain = domain.split('/')[0].split(':')[0];
    }
  } catch {
    domain = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
  return domain.replace(/^www\./, '').trim();
}

/**
 * Checks if a domain is allowlisted as an official partner domain.
 */
export function isAllowlistedPartnerDomain(domainOrUrl: string): boolean {
  if (!domainOrUrl) return false;
  const host = extractRootDomain(domainOrUrl);
  if (!host) return false;

  // Exact domain match
  if (allowlistedDomainsSet.has(host)) return true;

  // Subdomain match (e.g., promotions.jio.com -> matches jio.com)
  for (const allowed of allowlistedDomainsSet) {
    if (host === allowed || host.endsWith(`.${allowed}`)) {
      return true;
    }
  }

  return false;
}

/**
 * Look up registered partner by partnerId
 */
export function getRegisteredPartnerSource(partnerId: string): OfficialPartnerConfig | undefined {
  return registeredPartnersMap.get(partnerId);
}

/**
 * Find partner by matching domain
 */
export function findPartnerByDomain(domainOrUrl: string): OfficialPartnerConfig | undefined {
  const host = extractRootDomain(domainOrUrl);
  if (!host) return undefined;

  for (const partner of registeredPartnersMap.values()) {
    if (
      partner.officialDomains.some(
        (d) => host === d.toLowerCase() || host.endsWith(`.${d.toLowerCase()}`)
      )
    ) {
      return partner;
    }
  }
  return undefined;
}

/**
 * Layer 2 Registration Helper:
 * Dynamically registers a newly discovered official partner into runtime memory.
 */
export function registerDiscoveredPartner(partner: OfficialPartnerConfig): void {
  registeredPartnersMap.set(partner.partnerId, {
    ...partner,
    isRegistered: true,
  });
  for (const domain of partner.officialDomains) {
    allowlistedDomainsSet.add(domain.toLowerCase().trim());
  }
}

/**
 * Get all registered partners (Layer 1 + Layer 2 runtime discovered)
 */
export function getAllRegisteredPartners(): OfficialPartnerConfig[] {
  return Array.from(registeredPartnersMap.values());
}

/**
 * Mapping of legacy or decommissioned promotional URLs to active official destinations.
 * Protects users from encountering 404s when viewing older ingested offers.
 */
export const KNOWN_OFFER_URL_FIXES: Record<string, string> = {
  'https://www.asus.com/campaign/google-one-ai-premium/': 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
  'https://asus.com/campaign/google-one-ai-premium/': 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
  'https://www.asus.com/campaign/google-one-ai-premium': 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
  'https://asus.com/campaign/google-one-ai-premium': 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
  'https://www.telekom.com/en/media/media-information/archive-news-details/telekom-and-perplexity-bring-ai-to-smartphones': 'https://www.telekom.com/en/newsroom/latest-updates/media-information/2024/11/ai-for-everyone',
  'https://www.jio.com/en-in/google-one-offer': 'https://www.jio.com/google-gemini-offer/',
  'https://www.jio.com/en-in/google-one-offer/': 'https://www.jio.com/google-gemini-offer/',
  'https://www.jio.com/en-in/fiber': 'https://www.jio.com/fiber/',
  'https://www.jio.com/en-in/fiber/': 'https://www.jio.com/fiber/',
  'https://character.ai/c-ai+': 'https://character.ai/',
  'https://bolt.new/pricing': 'https://bolt.new/',
  'https://platform.moonshot.cn/docs/pricing/chat': 'https://platform.moonshot.cn/pricing',
  'https://about.fb.com/news/2026/09/meta-muse-ai/': 'https://ai.meta.com/',
  'https://www.oneplus.com/offers': 'https://www.oneplus.com/',
};

/**
 * Resolves canonical verified destination URL, correcting any legacy 404 URLs to official pages.
 */
export function resolveCanonicalOfferUrl(sourceUrl?: string | null): string {
  if (!sourceUrl || typeof sourceUrl !== 'string') return '';
  const trimmed = sourceUrl.trim();
  if (KNOWN_OFFER_URL_FIXES[trimmed]) {
    return KNOWN_OFFER_URL_FIXES[trimmed];
  }
  for (const [bad, good] of Object.entries(KNOWN_OFFER_URL_FIXES)) {
    if (trimmed.includes(bad) || (bad.endsWith('/') && trimmed === bad.slice(0, -1)) || (!bad.endsWith('/') && trimmed === bad + '/')) {
      return good;
    }
  }
  return trimmed;
}

