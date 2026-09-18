// ============================================================
// End-to-End Auth, Session Security & Audit Ownership Tests
// StackSave AI
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from '../src/app';
import { UserModel, AuditModel, connectDB } from '../src/services/dbService';
import { generateSessionToken, SESSION_COOKIE_NAME } from '../src/utils/session';

let server: http.Server;
let baseUrl: string;

let userA: any;
let userB: any;
let userAToken: string;
let userBToken: string;

beforeAll(async () => {
  await connectDB();

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  // Create two distinct test users in DB
  userA = await UserModel.create({
    googleId: `test-google-a-${Date.now()}`,
    email: `usera-${Date.now()}@stacksave.test`,
    name: 'User A Test',
    plan: 'FREE',
    subscriptionStatus: 'NONE',
    sessionVersion: 1,
  });

  userB = await UserModel.create({
    googleId: `test-google-b-${Date.now()}`,
    email: `userb-${Date.now()}@stacksave.test`,
    name: 'User B Test',
    plan: 'FREE',
    subscriptionStatus: 'NONE',
    sessionVersion: 1,
  });

  userAToken = generateSessionToken(userA);
  userBToken = generateSessionToken(userB);
}, 40000);

afterAll(async () => {
  if (userA?._id) await UserModel.deleteOne({ _id: userA._id });
  if (userB?._id) await UserModel.deleteOne({ _id: userB._id });
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('E2E Authentication, Session Revocation, and Audit Ownership', () => {
  it('1. Rejects unauthenticated request to /api/auth/me with 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('2. Authenticates valid user session cookie and returns safe user profile', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${userAToken}`,
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.id).toBe(userA._id.toString());
    expect(json.data.user.email).toBe(userA.email);
    expect(json.data.user.name).toBe('User A Test');
    expect(json.data.user.plan).toBe('FREE');
    // Ensure internal secrets like sessionVersion are never leaked to client
    expect(json.data.user.sessionVersion).toBeUndefined();
  });

  it('3. Runs audit as a guest: isSaved is FALSE and userId is undefined (Correction 1 & 5)', async () => {
    const auditPayload = {
      tools: [
        { toolId: 'chatgpt', plan: 'plus', monthlySpend: 20, seats: 1 },
        { toolId: 'cursor', plan: 'pro', monthlySpend: 20, seats: 1 },
      ],
      teamSize: 1,
      useCase: 'coding',
      optimizationGoal: 'balanced',
    };

    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditPayload),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.auditId).toBeDefined();
    expect(json.data.isSaved).toBe(false);

    // Verify in MongoDB that isSaved is false and userId is not set
    const dbAudit = await AuditModel.findOne({ auditId: json.data.auditId });
    expect(dbAudit).not.toBeNull();
    expect(dbAudit?.isSaved).toBe(false);
    expect(dbAudit?.userId).toBeUndefined();
  });

  it('4. User A explicitly saves the audit: isSaved becomes TRUE and userId is attached (Correction 5)', async () => {
    // Create an initial temporary audit
    const tempAudit = await AuditModel.create({
      auditId: `test-audit-${Date.now()}`,
      totalMonthlySpend: 100,
      optimizedMonthlySpend: 70,
      estimatedMonthlySavings: 30,
      estimatedAnnualSavings: 360,
      savingsPercentage: 30,
      teamSize: 2,
      tools: [{ toolId: 'cursor', plan: 'pro', monthlySpend: 40, seats: 2 }],
      publicUrl: 'http://localhost:5173/audit/test',
      isSaved: false,
    });

    // User A saves it
    const saveRes = await fetch(`${baseUrl}/api/audits/${tempAudit.auditId}/save`, {
      method: 'POST',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${userAToken}`,
      },
    });

    expect(saveRes.status).toBe(200);
    const saveJson = await saveRes.json();
    expect(saveJson.success).toBe(true);
    expect(saveJson.data.isSaved).toBe(true);
    expect(saveJson.data.userId).toBe(userA._id.toString());

    // Verify in DB
    const updated = await AuditModel.findOne({ auditId: tempAudit.auditId });
    expect(updated?.isSaved).toBe(true);
    expect(updated?.userId?.toString()).toBe(userA._id.toString());

    // Clean up
    await AuditModel.deleteOne({ auditId: tempAudit.auditId });
  });

  it('5. User A retrieves saved audits: returns ONLY audits where isSaved = true (Correction 1)', async () => {
    // Audit 1: Owned by User A, isSaved = true
    const savedAudit = await AuditModel.create({
      auditId: `test-saved-a-${Date.now()}`,
      totalMonthlySpend: 120,
      optimizedMonthlySpend: 80,
      estimatedMonthlySavings: 40,
      estimatedAnnualSavings: 480,
      savingsPercentage: 33,
      teamSize: 1,
      tools: [{ toolId: 'chatgpt', plan: 'plus', monthlySpend: 20, seats: 1 }],
      publicUrl: 'http://localhost:5173/audit/saved-a',
      userId: userA._id,
      isSaved: true,
    });

    // Audit 2: Owned by User A, but temporary (isSaved = false)
    const tempAudit = await AuditModel.create({
      auditId: `test-temp-a-${Date.now()}`,
      totalMonthlySpend: 200,
      optimizedMonthlySpend: 150,
      estimatedMonthlySavings: 50,
      estimatedAnnualSavings: 600,
      savingsPercentage: 25,
      teamSize: 1,
      tools: [{ toolId: 'claude', plan: 'pro', monthlySpend: 20, seats: 1 }],
      publicUrl: 'http://localhost:5173/audit/temp-a',
      userId: userA._id,
      isSaved: false,
    });

    const res = await fetch(`${baseUrl}/api/audits`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${userAToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    const auditIds = json.data.map((a: any) => a.auditId);
    expect(auditIds).toContain(savedAudit.auditId);
    expect(auditIds).not.toContain(tempAudit.auditId); // Temporary audit MUST NOT appear

    // Clean up
    await AuditModel.deleteMany({ auditId: { $in: [savedAudit.auditId, tempAudit.auditId] } });
  });

  it('6. Strict Authorization: User B CANNOT save, overwrite, or delete User A audit (Section 11)', async () => {
    const auditA = await AuditModel.create({
      auditId: `test-audit-a-owned-${Date.now()}`,
      totalMonthlySpend: 80,
      optimizedMonthlySpend: 50,
      estimatedMonthlySavings: 30,
      estimatedAnnualSavings: 360,
      savingsPercentage: 37,
      teamSize: 1,
      tools: [],
      publicUrl: 'http://localhost:5173/audit/owned-a',
      userId: userA._id,
      isSaved: true,
    });

    // User B attempts to overwrite/claim User A's audit
    const overwriteRes = await fetch(`${baseUrl}/api/audits/${auditA.auditId}/save`, {
      method: 'POST',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${userBToken}`,
      },
    });
    expect(overwriteRes.status).toBe(403);

    // User B attempts to delete User A's audit
    const deleteRes = await fetch(`${baseUrl}/api/audits/${auditA.auditId}`, {
      method: 'DELETE',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${userBToken}`,
      },
    });
    expect(deleteRes.status).toBe(403);

    // Verify audit is still intact
    const stillExists = await AuditModel.findOne({ auditId: auditA.auditId });
    expect(stillExists?.isSaved).toBe(true);
    expect(stillExists?.userId?.toString()).toBe(userA._id.toString());

    // User A successfully deletes their own audit
    const validDeleteRes = await fetch(`${baseUrl}/api/audits/${auditA.auditId}`, {
      method: 'DELETE',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${userAToken}`,
      },
    });
    expect(validDeleteRes.status).toBe(200);

    // Verify it is no longer marked saved
    const afterDelete = await AuditModel.findOne({ auditId: auditA.auditId });
    expect(afterDelete?.isSaved).toBe(false);

    await AuditModel.deleteOne({ auditId: auditA.auditId });
  });

  it('7. Session Invalidation / Revocation: Incrementing sessionVersion revokes active sessions (Correction 2)', async () => {
    // Before increment: userAToken is valid
    const validRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${userAToken}`,
      },
    });
    expect(validRes.status).toBe(200);

    // Revoke all sessions for User A by incrementing sessionVersion in DB
    await UserModel.updateOne({ _id: userA._id }, { $inc: { sessionVersion: 1 } });

    // After increment: userAToken must be rejected
    const revokedRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${userAToken}`,
      },
    });
    expect(revokedRes.status).toBe(401);
    const revokedJson = await revokedRes.json();
    expect(revokedJson.error).toContain('revoked');
  });
});
