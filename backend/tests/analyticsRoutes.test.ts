// ============================================================
// Analytics HTTP Routes Integration Tests
// StackSave AI Audit — Verification of /api/analytics endpoints
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { AddressInfo } from 'node:net';
import analyticsRouter from '../src/routes/analytics';

const TEST_SECRET = 'test-admin-secret';

async function withAnalyticsApp<T>(fn: (fetch: (path: string, options?: RequestInit) => Promise<Response>) => Promise<T>): Promise<T> {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRouter);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));

  const port = (server.address() as AddressInfo).port;

  try {
    return await fn((path, options) => fetch(`http://127.0.0.1:${port}${path}`, options));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe('Analytics HTTP Routes Integration', () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  it('rejects unauthenticated access to all analytics endpoints', async () => {
    const routes = ['/overview', '/realtime', '/historical', '/search-console', '/database', '/health'];

    await withAnalyticsApp(async (fetch) => {
      for (const route of routes) {
        const res = await fetch(`/api/analytics${route}`);
        expect(res.status).toBe(401);
      }
    });
  });

  it('allows authorized admin access to analytics endpoints', async () => {
    await withAnalyticsApp(async (fetch) => {
      const res = await fetch('/api/analytics/overview?period=7days', {
        headers: { Authorization: `Bearer ${TEST_SECRET}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.period).toBe('7days');
      expect(data.data.realtime).toBeDefined();
      expect(data.data.historical).toBeDefined();
      expect(data.data.searchConsole).toBeDefined();
      expect(data.data.database).toBeDefined();
    });
  });

  it('health diagnostics do not expose credential material', async () => {
    await withAnalyticsApp(async (fetch) => {
      const res = await fetch('/api/analytics/health', {
        headers: { Authorization: `Bearer ${TEST_SECRET}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.dependencies).toBeDefined();
      const serialized = JSON.stringify(data);
      expect(serialized).not.toContain('GOOGLE_SERVICE_ACCOUNT_KEY');
      expect(serialized).not.toContain('private_key');
      expect(serialized).not.toContain('authorization');
    });
  });
});
