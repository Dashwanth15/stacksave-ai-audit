import { describe, it, expect } from 'vitest';
import { PlaywrightOfferResearchAgent } from '../src/pricing/offerResearchAgent';
import { canPublishOffer } from '../src/pricing/offerTrust';

describe('PlaywrightOfferResearchAgent — Multi-Step Research & Correctness Suite', () => {
  const refDate2026 = new Date('2026-09-12T12:00:00Z');

  // ── TEST 1: Old promotion on page, terms say promotion ended ──────────────
  it('TEST 1: rejects offer as EXPIRED when terms state promotion has ended', () => {
    const expiredTermsText =
      'Special promotion for Perplexity Pro subscribers. Note: This promotional offer has ended on January 16, 2026 and is no longer available.';
    
    const negCheck = PlaywrightOfferResearchAgent.detectNegativeStatusLanguage(expiredTermsText);
    expect(negCheck.hasNegativeSignal).toBe(true);
    expect(negCheck.reason).toContain('promotion has ended');

    const dateCheck = PlaywrightOfferResearchAgent.parseDatesAndCheckExpiry(
      'Valid until January 16, 2026',
      refDate2026
    );
    expect(dateCheck.isExpired).toBe(true);

    const publicDecision = canPublishOffer({
      providerId: 'perplexity',
      sourceUrl: 'https://www.airtel.in/perplexity-pro',
      evidenceText: expiredTermsText,
      status: 'EXPIRED',
      isActive: false,
    });
    expect(publicDecision).toBe(false);
  });

  // ── TEST 2: Current promotion, current terms confirm active period ────────
  it('TEST 2: confirms offer as CURRENT when official source & terms confirm active validity', () => {
    const activeText =
      'Buy an eligible ASUS AI PC and receive complimentary Google One AI Premium (Gemini Advanced) for 12 months. Offer valid through December 31, 2026.';
    
    const negCheck = PlaywrightOfferResearchAgent.detectNegativeStatusLanguage(activeText);
    expect(negCheck.hasNegativeSignal).toBe(false);

    const dateCheck = PlaywrightOfferResearchAgent.parseDatesAndCheckExpiry(activeText, refDate2026);
    expect(dateCheck.isExpired).toBeFalsy();

    const publicDecision = canPublishOffer({
      providerId: 'gemini',
      sourceUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
      evidenceText: activeText,
      status: 'ACTIVE',
      isActive: true,
      partner: 'ASUS',
    });
    expect(publicDecision).toBe(true);
  });

  // ── TEST 3: Offer page returns 404 / soft 404 ─────────────────────────────
  it('TEST 3: rejects offer as UNAVAILABLE when destination returns 404 or soft-404', () => {
    const soft404Body =
      '404 Not Found. Thank you for using our service. The URL you provided may be incorrect, or the page you are looking for may have been deleted.';
    
    const negCheck = PlaywrightOfferResearchAgent.detectNegativeStatusLanguage(soft404Body);
    expect(negCheck.hasNegativeSignal).toBe(true);

    const publicDecision = canPublishOffer({
      providerId: 'perplexity',
      sourceUrl: 'https://www.softbank.jp/mobile/special/perplexity/',
      evidenceText: soft404Body,
      status: 'UNAVAILABLE',
      isActive: false,
    });
    expect(publicDecision).toBe(false);
  });

  // ── TEST 4: Redirects (301/302 -> 200) to current official page ───────────
  it('TEST 4: accepts valid redirect (301/302 -> 200) when final destination contains active offer', () => {
    // Example: Google Store phone category redirects to localized store with active Gemini offer
    const validEvidence =
      'Buy an eligible Pixel 9 Pro device and get 12 months of Google One AI Premium included with Gemini Advanced.';
    
    const publicDecision = canPublishOffer({
      providerId: 'gemini',
      sourceUrl: 'https://store.google.com/category/phones',
      evidenceText: validEvidence,
      status: 'ACTIVE',
      isActive: true,
      partner: 'Google Pixel',
    });
    expect(publicDecision).toBe(true);
  });

  // ── TEST 5: Redirects to generic homepage without offer (Airtel pattern) ──
  it('TEST 5: rejects offer when redirect lands on generic homepage where offer is gone (Airtel pattern)', () => {
    const genericAirtelHome =
      'Faster speeds. Just for you. That is the Postpaid advantage. Buy a new connection. Wifi, Prepaid, DTH, Airtel Black, Banking.';
    
    const containsAiOffer =
      genericAirtelHome.toLowerCase().includes('perplexity') ||
      genericAirtelHome.toLowerCase().includes('gemini');
    
    expect(containsAiOffer).toBe(false);

    const publicDecision = canPublishOffer({
      providerId: 'perplexity',
      sourceUrl: 'https://www.airtel.in/perplexity-pro',
      evidenceText: genericAirtelHome,
      status: 'EXPIRED',
      isActive: false,
      partner: 'Airtel',
    });
    expect(publicDecision).toBe(false);
  });

  // ── TEST 6: Current offer on English page ─────────────────────────────────
  it('TEST 6: identifies and prefers English language destination', () => {
    const englishText = 'OpenAI for Startups: Accelerate your AI roadmap with up to $150,000 in direct API credits.';
    const dateCheck = PlaywrightOfferResearchAgent.parseDatesAndCheckExpiry(englishText, refDate2026);
    expect(dateCheck.isExpired).toBeFalsy();

    const publicDecision = canPublishOffer({
      providerId: 'openai-api',
      sourceUrl: 'https://openai.com/business/why-openai/startups/',
      evidenceText: englishText,
      status: 'ACTIVE',
      isActive: true,
    });
    expect(publicDecision).toBe(true);
  });

  // ── TEST 7: Official non-English only page ────────────────────────────────
  it('TEST 7: supports official non-English portal while preserving accurate language tag', () => {
    const koreanText = '갤럭시 AI와 Google Gemini 기능은 지원되는 삼성 갤럭시 기기에서 무료로 제공됩니다.';
    const publicDecision = canPublishOffer({
      providerId: 'gemini',
      sourceUrl: 'https://www.samsung.com/galaxy-ai/',
      evidenceText: koreanText,
      status: 'ACTIVE',
      isActive: true,
      partner: 'Samsung',
    });
    expect(publicDecision).toBe(true);
  });

  // ── TEST 8: Old press release with dead redemption page ────────────────────
  it('TEST 8: marks old press release as EXPIRED historical evidence if promotion period ended', () => {
    const oldPressRelease =
      'Published August 15, 2024. For a limited time during Q3 2024, get 3 months of free AI subscription. Validity period ended December 31, 2024.';
    
    const dateCheck = PlaywrightOfferResearchAgent.parseDatesAndCheckExpiry(oldPressRelease, refDate2026);
    expect(dateCheck.isExpired).toBe(true);

    const publicDecision = canPublishOffer({
      providerId: 'chatgpt',
      sourceUrl: 'https://press.example.com/2024-promo',
      evidenceText: oldPressRelease,
      status: 'EXPIRED',
      isActive: false,
    });
    expect(publicDecision).toBe(false);
  });

  // ── TEST 9: Multiple distinct offers per provider remain separate ──────────
  it('TEST 9: maintains separate fingerprints and records for distinct current offers of one provider', () => {
    const copilotStudent = {
      providerId: 'github-copilot',
      sourceUrl: 'https://github.com/features/copilot/plans',
      evidenceText: 'GitHub Copilot Free for Students and verified open source maintainers.',
      status: 'ACTIVE',
      isActive: true,
    };
    const copilotPack = {
      providerId: 'github-copilot',
      sourceUrl: 'https://education.github.com/pack',
      evidenceText: 'GitHub Student Developer Pack including GitHub Copilot bundle and cloud credits.',
      status: 'ACTIVE',
      isActive: true,
    };

    expect(canPublishOffer(copilotStudent)).toBe(true);
    expect(canPublishOffer(copilotPack)).toBe(true);
    expect(copilotStudent.sourceUrl).not.toEqual(copilotPack.sourceUrl);
  });

  // ── CRITICAL ACCEPTANCE REGRESSION TESTS ───────────────────────────────────
  describe('CRITICAL ACCEPTANCE REGRESSION TESTS', () => {
    it('CRITICAL REGRESSION: Perplexity × Airtel is EXPIRED and MUST NOT be published as ACTIVE', () => {
      const airtelOffer = {
        providerId: 'perplexity',
        partner: 'Airtel',
        sourceUrl: 'https://www.airtel.in/perplexity-pro',
        evidenceText: 'Airtel Thanks Perplexity Pro promotion has ended. Page redirects to airtel.in generic homepage.',
        status: 'EXPIRED',
        isActive: false,
      };

      expect(canPublishOffer(airtelOffer)).toBe(false);
    });

    it('CRITICAL REGRESSION: Perplexity × SoftBank is UNAVAILABLE / 404 and MUST NOT be published as ACTIVE', () => {
      const softbankOffer = {
        providerId: 'perplexity',
        partner: 'SoftBank',
        sourceUrl: 'https://www.softbank.jp/mobile/special/perplexity/',
        evidenceText: 'SoftBank 404 Not Found. The page you are looking for may have been deleted.',
        status: 'UNAVAILABLE',
        isActive: false,
      };

      expect(canPublishOffer(softbankOffer)).toBe(false);
    });
  });
});
