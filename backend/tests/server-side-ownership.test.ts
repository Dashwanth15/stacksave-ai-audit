// ============================================================
// Server-Side Audit Ownership & Data Isolation Tests
// StackSave AI Audit
//
// Verifies that:
// 1. User A creates Audit A and receives a private ownerToken.
// 2. User B (with only auditId) CANNOT:
//    - Re-audit Audit A (POST /api/audits/:id/re-audit -> 403 Forbidden)
//    - Access private audit fields (GET /api/audits/:id/full -> 403 Forbidden)
//    - Modify or delete Audit A (no mutation endpoints exist)
// 3. User B CAN access public shared view (GET /api/audits/:id -> 200 OK),
//    which strictly omits private fields like email and companyName.
// 4. User A (with X-Audit-Token) CAN:
//    - Retrieve full private data (GET /api/audits/:id/full -> 200 OK)
//    - Trigger re-audit (POST /api/audits/:id/re-audit -> 200 OK)
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import http from 'http';
import 'dotenv/config';

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://dashwanth:Dashwanth%40127@ac-j9i00sk-shard-00-00.modyxw1.mongodb.net:27017,ac-j9i00sk-shard-00-01.modyxw1.mongodb.net:27017,ac-j9i00sk-shard-00-02.modyxw1.mongodb.net:27017/stacksave?ssl=true&replicaSet=atlas-kluysc-shard-0&authSource=admin&retryWrites=true&w=majority';
}

import { connectDB } from '../src/services/dbService';
import auditRouter from '../src/routes/audit';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  await connectDB();

  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/audits', auditRouter);

  await new Promise<void>((resolve) => {
    server = testApp.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Server-Side Audit Ownership & Data Isolation Verification', () => {
  let userAAuditId: string;
  let userAOwnerToken: string;

  it('Step 1: User A creates Audit A and receives a unique ownerToken', async () => {
    const payload = {
      tools: [
        {
          toolId: 'cursor',
          plan: 'pro',
          monthlySpend: 20,
          seats: 5,
          useCase: 'coding',
        },
      ],
      teamSize: 5,
      companyName: 'User A Secret Enterprise',
      email: 'userA@private-corp.com',
      useCase: 'coding',
      optimizationGoal: 'savings',
      billingCycle: 'monthly',
    };

    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.auditId).toBeDefined();
    expect(json.data.ownerToken).toBeDefined();
    expect(typeof json.data.ownerToken).toBe('string');
    expect(json.data.ownerToken.length).toBe(64); // 32-byte hex

    userAAuditId = json.data.auditId;
    userAOwnerToken = json.data.ownerToken;
  });

  it('Step 2: User B obtains audit A identifier and attempts re-audit WITHOUT token -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/audits/${userAAuditId}/re-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('Forbidden');
  });

  it('Step 3: User B attempts re-audit with an INVALID token -> 403 Forbidden', async () => {
    const fakeToken = '0000000000000000000000000000000000000000000000000000000000000000';
    const res = await fetch(`${baseUrl}/api/audits/${userAAuditId}/re-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Audit-Token': fakeToken,
      },
    });

    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('Forbidden');
  });

  it('Step 4: User B attempts to access private data via /full WITHOUT token -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/audits/${userAAuditId}/full`, {
      method: 'GET',
    });

    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('Forbidden');
  });

  it('Step 5: User B attempts to access private data via /full with WRONG token -> 403 Forbidden', async () => {
    const fakeToken = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const res = await fetch(`${baseUrl}/api/audits/${userAAuditId}/full`, {
      method: 'GET',
      headers: { 'X-Audit-Token': fakeToken },
    });

    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('Forbidden');
  });

  it('Step 6: User B accesses public shared view (GET /:id) -> 200 OK, but private fields (email, companyName) are stripped', async () => {
    const res = await fetch(`${baseUrl}/api/audits/${userAAuditId}`, {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.auditId).toBe(userAAuditId);

    // Verify private data is NOT exposed to public viewers
    expect(json.data.email).toBeUndefined();
    expect(json.data.companyName).toBeUndefined();
    expect(json.data.ownerToken).toBeUndefined();
  });

  it('Step 7: User B attempts to DELETE or PUT audit A -> Fails (no modification routes exist)', async () => {
    const deleteRes = await fetch(`${baseUrl}/api/audits/${userAAuditId}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(404);

    const putRes = await fetch(`${baseUrl}/api/audits/${userAAuditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName: 'Hacked Corp' }),
    });
    expect(putRes.status).toBe(404);
  });

  it('Step 8: User A accesses /full WITH valid X-Audit-Token -> 200 OK with full details', async () => {
    const res = await fetch(`${baseUrl}/api/audits/${userAAuditId}/full`, {
      method: 'GET',
      headers: { 'X-Audit-Token': userAOwnerToken },
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.auditId).toBe(userAAuditId);
    expect(json.data.email).toBe('userA@private-corp.com');
    expect(json.data.companyName).toBe('User A Secret Enterprise');
    expect(json.data.pricingSnapshot).toBeDefined();
  });

  it('Step 9: User A triggers re-audit WITH valid X-Audit-Token -> 200 OK and receives fresh token', async () => {
    const res = await fetch(`${baseUrl}/api/audits/${userAAuditId}/re-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Audit-Token': userAOwnerToken,
      },
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.newAuditId).toBeDefined();
    expect(json.data.diff).toBeDefined();
    expect(json.data.ownerToken).toBeDefined();
    expect(json.data.ownerToken).not.toBe(userAOwnerToken); // Rotated / distinct per version
  });
});
