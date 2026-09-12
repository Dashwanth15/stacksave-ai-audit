import { describe, it, expect } from 'vitest';
import {
  PlatformRankingEngine,
  PlatformSignals,
  RankingCategory,
} from '../src/audit-engine/services/PlatformRankingEngine';
import { ProviderDiscoveryService } from '../src/pricing/providerDiscoveryService';

describe('Platform Ranking & Intelligence Engine Tests', () => {
  describe('1. Deterministic Multi-Signal Scoring Calculation', () => {
    it('calculates score according to exact formula without hardcoded brand bias', () => {
      const signals: PlatformSignals = {
        marketAdoption: 90,
        productCapability: 90,
        ecosystemStrength: 90,
        growthMomentum: 90,
        reliabilityMaturity: 90,
        valueForMoney: 90,
        partnerOfferValue: 90,
        confidenceScore: 1.0,
      };

      // Raw = 90*(0.25+0.25+0.15+0.10+0.10+0.10+0.05) = 90*1.0 = 90
      // Weighted = 90 * (0.85 + 0.15*1.0) = 90
      const score = PlatformRankingEngine.calculateOverallScore(signals);
      expect(score).toBe(90);
    });

    it('modulates score with lower confidence when verification signals are partial', () => {
      const highConfidenceSignals: PlatformSignals = {
        marketAdoption: 80,
        productCapability: 80,
        ecosystemStrength: 80,
        growthMomentum: 80,
        reliabilityMaturity: 80,
        valueForMoney: 80,
        partnerOfferValue: 80,
        confidenceScore: 1.0,
      };

      const lowConfidenceSignals: PlatformSignals = {
        ...highConfidenceSignals,
        confidenceScore: 0.6,
      };

      const highScore = PlatformRankingEngine.calculateOverallScore(highConfidenceSignals);
      const lowScore = PlatformRankingEngine.calculateOverallScore(lowConfidenceSignals);

      expect(highScore).toBe(80);
      expect(lowScore).toBeLessThan(highScore);
    });

    it('reflects partner offer value contribution in the overall composite score', () => {
      const withoutPartnerSignals: PlatformSignals = {
        marketAdoption: 85,
        productCapability: 90,
        ecosystemStrength: 85,
        growthMomentum: 85,
        reliabilityMaturity: 85,
        valueForMoney: 85,
        partnerOfferValue: 0,
        confidenceScore: 0.95,
      };

      const withPartnerSignals: PlatformSignals = {
        ...withoutPartnerSignals,
        partnerOfferValue: 100, // e.g. 18mo free partner bundle
      };

      const scoreWithout = PlatformRankingEngine.calculateOverallScore(withoutPartnerSignals);
      const scoreWith = PlatformRankingEngine.calculateOverallScore(withPartnerSignals);

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });
  });

  describe('2. Platform Intelligence Catalog & Discovered Providers Integration', () => {
    it('ranks all platforms combining core catalog and 20 discovered missing platforms', () => {
      const allPlatforms = PlatformRankingEngine.rankAllPlatforms();
      expect(allPlatforms.length).toBeGreaterThanOrEqual(30);

      const providerIds = new Set(allPlatforms.map((p) => p.providerId));
      // Core catalog
      expect(providerIds.has('claude')).toBe(true);
      expect(providerIds.has('chatgpt')).toBe(true);
      expect(providerIds.has('cursor')).toBe(true);
      expect(providerIds.has('perplexity')).toBe(true);
      expect(providerIds.has('deepseek')).toBe(true);

      // Discovered missing platforms
      expect(providerIds.has('mistral')).toBe(true);
      expect(providerIds.has('elevenlabs')).toBe(true);
      expect(providerIds.has('midjourney')).toBe(true);
      expect(providerIds.has('runway')).toBe(true);
      expect(providerIds.has('suno')).toBe(true);
      expect(providerIds.has('replit-ai')).toBe(true);
      expect(providerIds.has('devin')).toBe(true);
      expect(providerIds.has('lovable')).toBe(true);
      expect(providerIds.has('bolt-new')).toBe(true);
      expect(providerIds.has('notebooklm')).toBe(true);
    });

    it('assigns strictly ordered ranks (1, 2, 3...) based on descending overall score', () => {
      const allPlatforms = PlatformRankingEngine.rankAllPlatforms();
      for (let i = 0; i < allPlatforms.length; i++) {
        expect(allPlatforms[i].rank).toBe(i + 1);
        if (i > 0) {
          expect(allPlatforms[i].overallScore).toBeLessThanOrEqual(allPlatforms[i - 1].overallScore);
        }
      }
    });

    it('includes explainability (whyRanked) narratives for each platform', () => {
      const allPlatforms = PlatformRankingEngine.rankAllPlatforms();
      for (const p of allPlatforms) {
        expect(p.whyRanked).toBeDefined();
        expect(p.whyRanked.primaryDriver.length).toBeGreaterThan(15);
        expect(p.whyRanked.summary.length).toBeGreaterThan(15);
        expect(p.whyRanked.valueAssessment.length).toBeGreaterThan(10);
      }
    });

    it('identifies active partner perks in whyRanked for Gemini and Perplexity', () => {
      const allPlatforms = PlatformRankingEngine.rankAllPlatforms();
      const gemini = allPlatforms.find((p) => p.providerId === 'gemini');
      const perplexity = allPlatforms.find((p) => p.providerId === 'perplexity');

      expect(gemini?.partnerOfferSummary?.hasActivePartnerOffer).toBe(true);
      expect(gemini?.whyRanked.partnerPerkHighlight).toBeDefined();

      expect(perplexity?.partnerOfferSummary?.hasActivePartnerOffer).toBe(true);
      expect(perplexity?.whyRanked.partnerPerkHighlight).toBeDefined();
    });
  });

  describe('3. Category-Specific Rankings & Domain Weighting', () => {
    it('correctly filters and weights platforms for CODING category', () => {
      const result = PlatformRankingEngine.getCategoryRankings('CODING');
      expect(result.category).toBe('CODING');
      expect(result.rankings.length).toBeGreaterThan(5);

      const codingIds = result.rankings.map((r) => r.providerId);
      expect(codingIds.includes('cursor') || codingIds.includes('github-copilot') || codingIds.includes('deepseek')).toBe(true);
    });

    it('correctly filters platforms for IMAGE and VIDEO categories', () => {
      const imageResult = PlatformRankingEngine.getCategoryRankings('IMAGE');
      const videoResult = PlatformRankingEngine.getCategoryRankings('VIDEO');

      const imageIds = imageResult.rankings.map((r) => r.providerId);
      expect(imageIds.includes('midjourney')).toBe(true);
      expect(imageIds.includes('ideogram')).toBe(true);

      const videoIds = videoResult.rankings.map((r) => r.providerId);
      expect(videoIds.includes('runway')).toBe(true);
      expect(videoIds.includes('heygen')).toBe(true);
      expect(videoIds.includes('synthesia')).toBe(true);
    });

    it('correctly filters platforms for VOICE_AUDIO and AGENTS categories', () => {
      const voiceResult = PlatformRankingEngine.getCategoryRankings('VOICE_AUDIO');
      const agentsResult = PlatformRankingEngine.getCategoryRankings('AGENTS');

      const voiceIds = voiceResult.rankings.map((r) => r.providerId);
      expect(voiceIds.includes('elevenlabs')).toBe(true);
      expect(voiceIds.includes('suno')).toBe(true);

      const agentIds = agentsResult.rankings.map((r) => r.providerId);
      expect(agentIds.includes('devin')).toBe(true);
      expect(agentIds.includes('manus')).toBe(true);
    });
  });

  describe('4. ProviderDiscoveryService Verification', () => {
    it('contains all 20 verified missing AI providers with official vendor URLs', () => {
      const missing = ProviderDiscoveryService.getAllDiscoveredProviders();
      expect(missing.length).toBe(20);

      for (const p of missing) {
        expect(p.officialUrl.startsWith('https://')).toBe(true);
        expect(p.pricingUrl.startsWith('https://')).toBe(true);
        expect(p.verifiedPlans.length).toBeGreaterThan(0);
        expect(p.status).toBe('VALIDATED');
      }
    });

    it('prevents registering duplicate providers that already exist in core catalog', () => {
      const res = ProviderDiscoveryService.ingestCandidate({
        displayName: 'ChatGPT',
        officialUrl: 'https://openai.com/chatgpt',
        category: 'assistant',
      });
      expect(res.success).toBe(false);
      expect(res.message).toContain('already exists');
    });
  });
});
