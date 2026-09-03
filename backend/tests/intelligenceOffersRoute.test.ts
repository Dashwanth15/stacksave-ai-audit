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

      return {
        sort: (_sortField: any) => ({
          select: (fieldsStr: string) => {
            const fields = fieldsStr.split(/\s+/).filter(Boolean);
            return {
              lean: async () => {
                // Apply Mongoose-style projection whitelist
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
        }),
      };
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

import intelligenceRouter from '../src/routes/intelligence';

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
});
