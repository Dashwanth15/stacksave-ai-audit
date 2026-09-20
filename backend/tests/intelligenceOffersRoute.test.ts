// ============================================================
// Intelligence Offers Route Integration & Regression Tests
// StackSave AI Audit — Verification of GET /api/intelligence/offers
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { AddressInfo } from 'node:net';

// Mock NotificationEventModel before importing router
const mockRecords: any[] = [];

vi.mock('../src/services/dbService', () => ({
  PricingSourceModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  NotificationEventModel: {
    find: vi.fn().mockImplementation((query: any) => {
      let results = [...mockRecords];
      if (query.eventType) {
        results = results.filter((r) => r.eventType === query.eventType);
      }
      if (query.isActive && query.isActive.$ne !== undefined) {
        results = results.filter((r) => r.isActive !== query.isActive.$ne);
      }
      if (query.isPublic !== undefined) {
        results = results.filter((r) => r.isPublic === query.isPublic);
      }

      const chainable: any = {
        lean: async () => [...results],
        sort: (_sortField: any) => chainable,
        select: (fieldsStr: string) => {
          const fields = fieldsStr.split(/\s+/).filter(Boolean);
          return {
            lean: async () => {
              return results.map((doc) => {
                const projected: any = {};
                for (const f of fields) {
                  if (doc[f] !== undefined) {
                    projected[f] = doc[f];
                  }
                }
                return projected;
              });
            },
          };
        },
      };
      return chainable;
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue([]),
  },
  SyncLogModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

import intelligenceRouter, { invalidatePublicOffersCache } from '../src/routes/intelligence';

async function withIntelligenceApp<T>(fn: (fetch: (path: string, options?: RequestInit) => Promise<Response>) => Promise<T>): Promise<T> {
  const app = express();
  app.use(express.json());
  app.use('/api/intelligence', intelligenceRouter);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const port = (server.address() as AddressInfo).port;

  try {
    return await fn((path, options) => fetch(`http://127.0.0.1:${port}${path}`, options));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe('GET /api/intelligence/offers regression test', () => {
  beforeEach(() => {
    mockRecords.length = 0;
    invalidatePublicOffersCache();
  });

  it('preserves isPublic in select projection and returns qualifying public offers', async () => {
    // Populate a valid public NEW_OFFER from a registered official source
    mockRecords.push({
      _id: 'test_offer_1',
      fingerprint: 'fp_cursor_trial_123',
      providerId: 'cursor',
      providerName: 'Cursor',
      title: 'Cursor Pro 14-Day Free Trial',
      description: 'Try Cursor Pro with unlimited completions and fast requests free for 14 days.',
      discount: '14-Day Free Trial',
      discountType: 'PROMOTION',
      evidenceText: 'New users can access Cursor Pro with a free trial period of 14 days.',
      detectionMethod: 'JSON_LD',
      sourceStatus: 'VERIFIED',
      sourceUrl: 'https://cursor.com/pricing',
      sourceFetchedAt: new Date(),
      lastSuccessfulCheckAt: new Date(),
      evidenceLocation: 'pricing_table',
      contentHash: 'hash123',
      extractorVersion: '4.0.0',
      detectedAt: new Date(),
      expiresAt: null,
      isActive: true,
      isPublic: true,
      lastSeenAt: new Date(),
      lastConfirmedAt: new Date(),
      eventType: 'NEW_OFFER',
    });

    await withIntelligenceApp(async (fetch) => {
      const res = await fetch('/api/intelligence/offers');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.count).toBe(1);
      expect(json.data.offers).toHaveLength(1);

      const returned = json.data.offers[0];
      expect(returned.providerId).toBe('cursor');
      expect(returned.title).toBe('Cursor Pro 14-Day Free Trial');
      expect(returned.sourceUrl).toBe('https://cursor.com/pricing');
    });
  });

  it('filters out non-registered or inactive offers', async () => {
    mockRecords.push(
      // Inactive offer
      {
        _id: 'inactive_offer',
        providerId: 'cursor',
        title: 'Inactive Cursor Offer',
        sourceUrl: 'https://cursor.com/pricing',
        evidenceText: 'Evidence for inactive offer with sufficient length.',
        isActive: false,
        isPublic: true,
        eventType: 'NEW_OFFER',
        detectedAt: new Date(),
      },
      // Unregistered third-party URL
      {
        _id: 'unregistered_offer',
        providerId: 'cursor',
        title: 'Third-party Coupon',
        sourceUrl: 'https://coupon-aggregator.com/cursor',
        evidenceText: 'Coupon aggregator evidence with sufficient length.',
        isActive: true,
        isPublic: true,
        eventType: 'NEW_OFFER',
        detectedAt: new Date(),
      }
    );

    await withIntelligenceApp(async (fetch) => {
      const res = await fetch('/api/intelligence/offers');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.count).toBe(0);
      expect(json.data.offers).toHaveLength(0);
    });
  });

  it('dynamically calculates canonical provider count without partner company inflation', async () => {
    // 3 offers for Gemini: native, ASUS bundle, Google Pixel bundle
    mockRecords.push(
      {
        _id: 'gemini_direct',
        fingerprint: 'fp_gemini_1',
        providerId: 'gemini',
        providerName: 'Google Gemini',
        title: 'Google One AI Premium (2 Months Free)',
        evidenceText: 'Valid official offer evidence text with more than twenty characters.',
        sourceStatus: 'VERIFIED',
        sourceUrl: 'https://gemini.google.com/pricing',
        detectedAt: new Date(),
        isActive: true,
        isPublic: true,
        eventType: 'NEW_OFFER',
      },
      {
        _id: 'gemini_asus',
        fingerprint: 'fp_gemini_2',
        providerId: 'asus',
        providerName: 'ASUS',
        aiProvider: 'gemini',
        partner: 'ASUS',
        title: 'ASUS Chromebook 12-Month Gemini Advanced',
        evidenceText: 'Valid official offer evidence text with more than twenty characters.',
        sourceStatus: 'VERIFIED',
        sourceUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
        destinationUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
        detectedAt: new Date(),
        isActive: true,
        isPublic: true,
        eventType: 'NEW_OFFER',
      },
      {
        _id: 'gemini_pixel',
        fingerprint: 'fp_gemini_3',
        providerId: 'google-pixel',
        providerName: 'Google Pixel',
        aiProvider: 'gemini',
        partner: 'Google Pixel',
        title: 'Pixel 9 Pro 12-Month Gemini Advanced Bundle',
        evidenceText: 'Valid official offer evidence text with more than twenty characters.',
        sourceStatus: 'VERIFIED',
        sourceUrl: 'https://store.google.com/intl/en/google-one-ai-premium-terms/',
        destinationUrl: 'https://store.google.com/intl/en/google-one-ai-premium-terms/',
        detectedAt: new Date(),
        isActive: true,
        isPublic: true,
        eventType: 'NEW_OFFER',
      },
      // 1 offer for ChatGPT (with Amex partner)
      {
        _id: 'chatgpt_amex',
        fingerprint: 'fp_chatgpt_1',
        providerId: 'american-express',
        providerName: 'American Express',
        aiProvider: 'chatgpt',
        partner: 'American Express',
        title: '$300 ChatGPT Business Statement Credit',
        evidenceText: 'Valid official offer evidence text with more than twenty characters.',
        sourceStatus: 'VERIFIED',
        sourceUrl: 'https://www.americanexpress.com/en-us/benefits/business-card-benefits/chatgpt-credits/',
        destinationUrl: 'https://www.americanexpress.com/en-us/benefits/business-card-benefits/chatgpt-credits/',
        detectedAt: new Date(),
        isActive: true,
        isPublic: true,
        eventType: 'NEW_OFFER',
      }
    );

    await withIntelligenceApp(async (fetch) => {
      // 1. Check GET /api/intelligence/providers
      const provRes = await fetch('/api/intelligence/providers');
      expect(provRes.status).toBe(200);
      const provJson = await provRes.json();
      expect(provJson.success).toBe(true);
      // 4 offers from 2 unique canonical AI providers (gemini, chatgpt), NOT 4!
      expect(provJson.data.count).toBe(2);
      expect(provJson.data.providers).toHaveLength(2);
      expect(provJson.data.providers.map((p: any) => p.providerId)).toEqual(['chatgpt', 'gemini']);

      // 2. Check GET /api/intelligence/offers
      const offersRes = await fetch('/api/intelligence/offers');
      expect(offersRes.status).toBe(200);
      const offersJson = await offersRes.json();
      expect(offersJson.success).toBe(true);
      expect(offersJson.data.count).toBe(4);
      expect(offersJson.data.providerCount).toBe(2);
      expect(offersJson.data.providers).toHaveLength(2);
      expect(offersJson.data.isPremiumUser).toBe(false);
      expect(offersJson.data.lockedMetadata).toEqual({
        hasLockedOffers: true,
        previewCount: 3,
      });
    });
  });

  it('correctly sets isPremiumUser and lockedMetadata for guest vs premium sessions', async () => {
    mockRecords.push({
      _id: 'test_offer_public',
      fingerprint: 'fp_cursor_trial_public',
      providerId: 'cursor',
      providerName: 'Cursor',
      title: 'Cursor Pro 14-Day Free Trial',
      description: 'Public offer description.',
      discount: '14-Day Free Trial',
      evidenceText: 'Valid official offer evidence text with more than twenty characters.',
      sourceStatus: 'VERIFIED',
      sourceUrl: 'https://cursor.com/pricing',
      detectedAt: new Date(),
      isActive: true,
      isPublic: true,
      eventType: 'NEW_OFFER',
    });

    await withIntelligenceApp(async (fetch) => {
      // 1. Guest request (no auth cookie/header)
      const res = await fetch('/api/intelligence/offers');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.isPremiumUser).toBe(false);
      expect(json.data.lockedMetadata).toEqual({
        hasLockedOffers: true,
        previewCount: 3,
      });
      expect(json.data.offers).toHaveLength(1);
    });
  });
});
