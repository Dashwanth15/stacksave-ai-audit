// ============================================================
// Free-Plan Usage Limits & Share Semantics Tests — StackSave AI
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from '../src/app';
import { UserModel, AuditModel, AuditShareLinkModel, SavedUserStackModel, connectDB } from '../src/services/dbService';
import { generateSessionToken, SESSION_COOKIE_NAME } from '../src/utils/session';

let server: http.Server;
let baseUrl: string;

let freeUser: any;
let premiumUser: any;
let freeToken: string;
let premiumToken: string;

const createdAuditIds: string[] = [];

beforeAll(async () => {
  await connectDB();

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const timestamp = Date.now();

  // Create Free user
  freeUser = await UserModel.create({
    googleId: `free-user-${timestamp}`,
    email: `free-${timestamp}@stacksave.test`,
    name: 'Free Plan User',
    plan: 'FREE',
    subscriptionStatus: 'NONE',
    sessionVersion: 1,
  });

  // Create Premium user
  premiumUser = await UserModel.create({
    googleId: `premium-user-${timestamp}`,
    email: `premium-${timestamp}@stacksave.test`,
    name: 'Premium Plan User',
    plan: 'PREMIUM',
    subscriptionStatus: 'ACTIVE',
    sessionVersion: 1,
  });

  freeToken = generateSessionToken(freeUser);
  premiumToken = generateSessionToken(premiumUser);
}, 40000);

afterAll(async () => {
  if (freeUser?._id) {
    await UserModel.deleteOne({ _id: freeUser._id });
    await AuditShareLinkModel.deleteMany({ userId: freeUser._id });
    await SavedUserStackModel.deleteMany({ userId: freeUser._id });
  }
  if (premiumUser?._id) {
    await UserModel.deleteOne({ _id: premiumUser._id });
    await AuditShareLinkModel.deleteMany({ userId: premiumUser._id });
    await SavedUserStackModel.deleteMany({ userId: premiumUser._id });
  }
  if (createdAuditIds.length > 0) {
    await AuditModel.deleteMany({ auditId: { $in: createdAuditIds } });
  }
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

// Helper to create test audits
async function createTestAudit(auditId: string): Promise<any> {
  createdAuditIds.push(auditId);
  return AuditModel.create({
    auditId,
    totalMonthlySpend: 250,
    optimizedMonthlySpend: 150,
    estimatedMonthlySavings: 100,
    estimatedAnnualSavings: 1200,
    savingsPercentage: 40,
    teamSize: 3,
    tools: [],
    publicUrl: `https://stacksaveai.com/audit/${auditId}`,
    isSaved: false,
  });
}

describe('StackSave Free-Plan Saved Audits Limits (Max 2)', () => {
  it('allows a Free user to save their 1st audit (0/2 -> 1/2)', async () => {
    const audit1 = await createTestAudit(`audit-free-1-${Date.now()}`);

    const res = await fetch(`${baseUrl}/api/audits/${audit1.auditId}/save`, {
      method: 'POST',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.isSaved).toBe(true);

    const count = await AuditModel.countDocuments({ userId: freeUser._id, isSaved: true });
    expect(count).toBe(1);
  });

  it('allows a Free user to save their 2nd audit (1/2 -> 2/2)', async () => {
    const audit2 = await createTestAudit(`audit-free-2-${Date.now()}`);

    const res = await fetch(`${baseUrl}/api/audits/${audit2.auditId}/save`, {
      method: 'POST',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.isSaved).toBe(true);

    const count = await AuditModel.countDocuments({ userId: freeUser._id, isSaved: true });
    expect(count).toBe(2);
  });

  it('rejects a Free user attempting to save a 3rd audit with FREE_AUDIT_LIMIT_REACHED', async () => {
    const audit3 = await createTestAudit(`audit-free-3-${Date.now()}`);

    const res = await fetch(`${baseUrl}/api/audits/${audit3.auditId}/save`, {
      method: 'POST',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
      },
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('FREE_AUDIT_LIMIT_REACHED');
    expect(json.limit).toBe(2);
    expect(json.current).toBe(2);
    expect(json.upgradeRequired).toBe(true);

    // Verify audit3 was NOT saved
    const doc = await AuditModel.findOne({ auditId: audit3.auditId });
    expect(doc?.isSaved).toBe(false);

    // Total saved audits for this user remains strictly 2
    const count = await AuditModel.countDocuments({ userId: freeUser._id, isSaved: true });
    expect(count).toBe(2);
  });

  it('allows saving an already saved audit idempotently without error or consuming extra quota', async () => {
    const existingAudits = await AuditModel.find({ userId: freeUser._id, isSaved: true });
    expect(existingAudits.length).toBe(2);

    const res = await fetch(`${baseUrl}/api/audits/${existingAudits[0].auditId}/save`, {
      method: 'POST',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.isSaved).toBe(true);
  });

  it('allows a Premium user to save beyond 2 audits with no restrictions', async () => {
    // Save 3 audits for Premium user
    for (let i = 1; i <= 3; i++) {
      const pAudit = await createTestAudit(`audit-prem-${i}-${Date.now()}`);
      const res = await fetch(`${baseUrl}/api/audits/${pAudit.auditId}/save`, {
        method: 'POST',
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}`,
        },
      });
      expect(res.status).toBe(200);
    }

    const count = await AuditModel.countDocuments({ userId: premiumUser._id, isSaved: true });
    expect(count).toBe(3);
  });
});

describe('StackSave Free-Plan Share Links Limits (Max 5, NO 5-minute timer)', () => {
  it('allows a Free user to create share links up to 5 times (0/5 through 4/5)', async () => {
    const audit = await createTestAudit(`audit-share-test-${Date.now()}`);

    for (let i = 1; i <= 5; i++) {
      const res = await fetch(`${baseUrl}/api/audits/${audit.auditId}/share`, {
        method: 'POST',
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.shareUrl).toBeDefined();
      expect(json.data.shareLinkCount).toBe(i);

      // Verify NO 5-minute timer or expiration field exists
      expect((json.data as any).expiresAt).toBeUndefined();
      expect((json.data as any).expiresIn).toBeUndefined();
    }

    const totalShares = await AuditShareLinkModel.countDocuments({ userId: freeUser._id });
    expect(totalShares).toBe(5);
  });

  it('rejects a Free user attempting to create a 6th share link with FREE_SHARE_LIMIT_REACHED', async () => {
    const audit = await createTestAudit(`audit-share-6th-${Date.now()}`);

    const res = await fetch(`${baseUrl}/api/audits/${audit.auditId}/share`, {
      method: 'POST',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
      },
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('FREE_SHARE_LIMIT_REACHED');
    expect(json.limit).toBe(5);
    expect(json.current).toBe(5);
    expect(json.upgradeRequired).toBe(true);

    // Share link count remains strictly 5
    const totalShares = await AuditShareLinkModel.countDocuments({ userId: freeUser._id });
    expect(totalShares).toBe(5);

    // Underlying audit is completely intact
    const auditDoc = await AuditModel.findOne({ auditId: audit.auditId });
    expect(auditDoc).not.toBeNull();
    expect(auditDoc?.totalMonthlySpend).toBe(250);
  });

  it('allows a Premium user to create unlimited share links beyond 5', async () => {
    const audit = await createTestAudit(`audit-prem-share-${Date.now()}`);

    for (let i = 1; i <= 6; i++) {
      const res = await fetch(`${baseUrl}/api/audits/${audit.auditId}/share`, {
        method: 'POST',
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}`,
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    }

    const count = await AuditShareLinkModel.countDocuments({ userId: premiumUser._id });
    expect(count).toBe(6);
  });
});

describe('StackSave Free-Plan Saved Stacks Limits (Max 3)', () => {
  it('allows a Free user to save their 1st AI stack (0/3 -> 1/3)', async () => {
    const res = await fetch(`${baseUrl}/api/user/stack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
      },
      body: JSON.stringify({
        name: 'Stack 1',
        domain: 'marketing',
        tools: [{ toolId: 'claude', toolName: 'Claude Pro', monthlyCost: 20 }],
        totalMonthlySpend: 20,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Stack 1');

    const count = await SavedUserStackModel.countDocuments({ userId: freeUser._id });
    expect(count).toBe(1);
  });

  it('allows a Free user to save their 2nd AI stack (1/3 -> 2/3)', async () => {
    const res = await fetch(`${baseUrl}/api/user/stack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
      },
      body: JSON.stringify({
        name: 'Stack 2',
        domain: 'engineering',
        tools: [{ toolId: 'cursor', toolName: 'Cursor Pro', monthlyCost: 20 }],
        totalMonthlySpend: 20,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const count = await SavedUserStackModel.countDocuments({ userId: freeUser._id });
    expect(count).toBe(2);
  });

  it('allows a Free user to save their 3rd AI stack (2/3 -> 3/3)', async () => {
    const res = await fetch(`${baseUrl}/api/user/stack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
      },
      body: JSON.stringify({
        name: 'Stack 3',
        domain: 'design',
        tools: [{ toolId: 'midjourney', toolName: 'Midjourney Standard', monthlyCost: 30 }],
        totalMonthlySpend: 30,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const count = await SavedUserStackModel.countDocuments({ userId: freeUser._id });
    expect(count).toBe(3);
  });

  it('rejects a Free user attempting to save a 4th stack with FREE_STACK_LIMIT_REACHED', async () => {
    const res = await fetch(`${baseUrl}/api/user/stack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
      },
      body: JSON.stringify({
        name: 'Stack 4 (Over Limit)',
        domain: 'sales',
        tools: [{ toolId: 'chatgpt', toolName: 'ChatGPT Plus', monthlyCost: 20 }],
        totalMonthlySpend: 20,
      }),
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('FREE_STACK_LIMIT_REACHED');
    expect(json.limit).toBe(3);
    expect(json.current).toBe(3);
    expect(json.upgradeRequired).toBe(true);

    const count = await SavedUserStackModel.countDocuments({ userId: freeUser._id });
    expect(count).toBe(3);
  });

  it('allows a Premium user to save unlimited AI stacks beyond 3', async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await fetch(`${baseUrl}/api/user/stack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}`,
        },
        body: JSON.stringify({
          name: `Premium Stack ${i}`,
          domain: 'enterprise',
          tools: [{ toolId: `tool-${i}`, toolName: `Tool ${i}`, monthlyCost: 30 }],
          totalMonthlySpend: 30,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    }

    const count = await SavedUserStackModel.countDocuments({ userId: premiumUser._id });
    expect(count).toBe(5);
  });
});

describe('StackSave User Usage API (GET /api/user/usage)', () => {
  it('returns real database usage stats for Free user including savedStacks', async () => {
    const res = await fetch(`${baseUrl}/api/user/usage`, {
      method: 'GET',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${freeToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.plan).toBe('FREE');
    expect(json.data.savedAudits.current).toBe(2);
    expect(json.data.savedAudits.limit).toBe(2);
    expect(json.data.shareLinks.current).toBe(5);
    expect(json.data.shareLinks.limit).toBe(5);
    expect(json.data.savedStacks.current).toBe(3);
    expect(json.data.savedStacks.limit).toBe(3);
  });

  it('returns unlimited limits (null) for Premium user including savedStacks', async () => {
    const res = await fetch(`${baseUrl}/api/user/usage`, {
      method: 'GET',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.plan).toBe('PREMIUM');
    expect(json.data.savedAudits.current).toBe(3);
    expect(json.data.savedAudits.limit).toBeNull();
    expect(json.data.shareLinks.current).toBe(6);
    expect(json.data.shareLinks.limit).toBeNull();
    expect(json.data.savedStacks.current).toBe(5);
    expect(json.data.savedStacks.limit).toBeNull();
  });
});

