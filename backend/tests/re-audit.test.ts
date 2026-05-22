// ============================================================
// Re-Audit Engine & Diff Service Tests — StackSave AI Audit
// Run: cd backend && npm test
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import 'dotenv/config';

// Inject fallback MongoDB Atlas URI for CI/CD workflow testing when secrets are not accessible
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb+srv://dashwanth:Dashwanth%40127@cluster1.modyxw1.mongodb.net/stacksave?retryWrites=true&w=majority';
}

import { connectDB, AuditModel } from '../src/services/dbService';
import {
  recalculateInputStack,
  generateAuditDiff,
  runReAudit,
} from '../src/services/reAuditService';
import { ToolEntry, UseCase, PricingSnapshot, AuditResult } from '../src/types';
import * as emailService from '../src/services/emailService';

describe('1. recalculateInputStack pricing update', () => {
  it('updates monthly spend for seat-based plans to match current catalog pricing', () => {
    const originalTools: ToolEntry[] = [
      {
        toolId: 'cursor',
        plan: 'pro',
        monthlySpend: 15, // Outdated price (catalog is $20)
        seats: 2,
        useCase: 'coding',
      },
    ];

    const recalculated = recalculateInputStack(originalTools);
    expect(recalculated[0].monthlySpend).toBe(40); // 2 seats * $20/seat = $40
  });

  it('keeps monthly spend unchanged for pay-per-use (API) plans', () => {
    const originalTools: ToolEntry[] = [
      {
        toolId: 'openai-api',
        plan: 'pay-as-you-go',
        monthlySpend: 450, // Volumetric spend, should be kept
        seats: 1,
        useCase: 'coding',
      },
    ];

    const recalculated = recalculateInputStack(originalTools);
    expect(recalculated[0].monthlySpend).toBe(450); // Unchanged
  });

  it('handles tools not found in catalog by keeping original values', () => {
    const originalTools: ToolEntry[] = [
      {
        toolId: 'non-existent' as any,
        plan: 'pro',
        monthlySpend: 100,
        seats: 5,
        useCase: 'writing',
      },
    ];

    const recalculated = recalculateInputStack(originalTools);
    expect(recalculated[0].monthlySpend).toBe(100); // Unchanged
  });
});

describe('2. generateAuditDiff logic', () => {
  const dummySnapshot: PricingSnapshot = {
    capturedAt: new Date().toISOString(),
    catalogVersion: '1.0',
    tools: {
      cursor: {
        name: 'Cursor',
        plans: {
          pro: { monthlyPricePerSeat: 20 },
        },
      },
    },
  };

  it('calculates savings deltas accurately', () => {
    const oldAudit = {
      auditId: 'old-123',
      estimatedMonthlySavings: 50,
      insights: [],
      pricingSnapshot: dummySnapshot,
    } as any;

    const newAudit = {
      auditId: 'new-456',
      estimatedMonthlySavings: 20,
      insights: [],
      pricingSnapshot: dummySnapshot,
    } as any;

    const diff = generateAuditDiff(oldAudit, newAudit);
    expect(diff.oldSavings).toBe(50);
    expect(diff.newSavings).toBe(20);
    expect(diff.savingsDelta).toBe(-30);
  });

  it('detects added, removed, and changed recommendations', () => {
    const oldAudit = {
      auditId: 'old-123',
      estimatedMonthlySavings: 100,
      pricingSnapshot: dummySnapshot,
      insights: [
        {
          toolId: 'cursor',
          toolName: 'Cursor',
          type: 'overpaid_plan',
          severity: 'medium',
          message: 'Old overpaid message',
          suggestion: 'Downgrade',
          reason: 'Reason',
          potentialMonthlySaving: 40,
          currentMonthlySpend: 60,
          recommendedMonthlySpend: 20,
        },
        {
          toolId: 'claude',
          toolName: 'Claude',
          type: 'unused_seats',
          severity: 'high',
          message: 'Unused seats claude',
          suggestion: 'Reduce seats',
          reason: 'Reason',
          potentialMonthlySaving: 60,
          currentMonthlySpend: 100,
          recommendedMonthlySpend: 40,
        },
      ],
    } as any;

    const newAudit = {
      auditId: 'new-456',
      estimatedMonthlySavings: 110,
      pricingSnapshot: dummySnapshot,
      insights: [
        // Changed recommendation (saving changed from 40 to 50)
        {
          toolId: 'cursor',
          toolName: 'Cursor',
          type: 'overpaid_plan',
          severity: 'medium',
          message: 'Old overpaid message',
          suggestion: 'Downgrade',
          reason: 'Reason',
          potentialMonthlySaving: 50,
          currentMonthlySpend: 60,
          recommendedMonthlySpend: 10,
        },
        // Added recommendation (github-copilot)
        {
          toolId: 'github-copilot',
          toolName: 'GitHub Copilot',
          type: 'annual_discount',
          severity: 'low',
          message: 'Save on annual billing',
          suggestion: 'Switch to annual',
          reason: 'Reason',
          potentialMonthlySaving: 60,
          currentMonthlySpend: 100,
          recommendedMonthlySpend: 40,
        },
        // Note: claude unused_seats was removed in new audit
      ],
    } as any;

    const diff = generateAuditDiff(oldAudit, newAudit);

    expect(diff.recommendationsChanged).toBe(true);

    // Should have 3 diff items (1 changed, 1 added, 1 removed)
    expect(diff.recommendationDiffs.length).toBe(3);

    const added = diff.recommendationDiffs.find((d) => d.status === 'added');
    expect(added).toBeDefined();
    expect(added?.toolId).toBe('github-copilot');
    expect(added?.savingDelta).toBe(60);

    const removed = diff.recommendationDiffs.find((d) => d.status === 'removed');
    expect(removed).toBeDefined();
    expect(removed?.toolId).toBe('claude');
    expect(removed?.savingDelta).toBe(-60);

    const changed = diff.recommendationDiffs.find((d) => d.status === 'changed');
    expect(changed).toBeDefined();
    expect(changed?.toolId).toBe('cursor');
    expect(changed?.savingDelta).toBe(10); // 50 - 40
  });
});

describe('3. runReAudit integration tests with MongoDB', () => {
  let originalAuditId = 'test-audit-' + Date.now();
  let rootAuditId = originalAuditId;
  let reAuditId1 = '';
  let reAuditId2 = '';

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Cleanup test audit documents
    await AuditModel.deleteMany({
      $or: [{ auditId: rootAuditId }, { reAuditOf: rootAuditId }],
    });
  });

  it('runs first re-audit, preserves history, creates version 2 and generates diff', async () => {
    // 1. Create a mock original audit (version 1)
    const oldSnapshot: PricingSnapshot = {
      capturedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      catalogVersion: '1.0',
      tools: {
        cursor: {
          name: 'Cursor',
          plans: {
            pro: { monthlyPricePerSeat: 15 }, // Old price was $15/seat
          },
        },
      },
    };

    const originalAudit = await AuditModel.create({
      auditId: originalAuditId,
      totalMonthlySpend: 30, // 2 seats * $15
      optimizedMonthlySpend: 20,
      estimatedMonthlySavings: 10,
      estimatedAnnualSavings: 120,
      savingsPercentage: 33,
      insights: [
        {
          toolId: 'cursor',
          toolName: 'Cursor',
          type: 'overpaid_plan',
          severity: 'medium',
          message: 'Mock warning',
          suggestion: 'Downgrade',
          reason: 'Reason',
          potentialMonthlySaving: 10,
          currentMonthlySpend: 30,
          recommendedMonthlySpend: 20,
        },
      ],
      publicUrl: `http://localhost:5173/audit/${originalAuditId}`,
      teamSize: 2,
      tools: [
        {
          toolId: 'cursor',
          plan: 'pro',
          monthlySpend: 30,
          seats: 2,
          useCase: 'coding',
        },
      ],
      inputStack: [
        {
          toolId: 'cursor',
          plan: 'pro',
          monthlySpend: 30,
          seats: 2,
          useCase: 'coding',
        },
      ],
      pricingSnapshot: oldSnapshot,
      isLatestVersion: true,
      auditVersion: 1,
      email: 'test@stacksave.ai',
    });

    expect(originalAudit).toBeDefined();

    // 2. Perform re-audit
    const baseUrl = 'http://localhost:5173';
    const result = await runReAudit(originalAuditId, baseUrl);

    expect(result).toBeDefined();
    expect(result.newAudit).toBeDefined();
    expect(result.diff).toBeDefined();

    reAuditId1 = result.newAudit.auditId;

    // Verify version 2 audit properties
    expect(result.newAudit.auditVersion).toBe(2);
    expect(result.newAudit.reAuditOf).toBe(rootAuditId);
    expect(result.newAudit.isLatestVersion).toBe(true);
    
    // Check recalculated tools pricing: Cursor Pro is currently $20 in catalog
    // Total spend should now be 2 * $20 = $40
    expect(result.newAudit.totalMonthlySpend).toBe(40);

    // Verify original version 1 audit was updated to isLatestVersion: false
    const updatedOriginal = await AuditModel.findOne({ auditId: originalAuditId });
    expect(updatedOriginal?.isLatestVersion).toBe(false);
    // Verify it remained otherwise immutable
    expect(updatedOriginal?.auditVersion).toBe(1);
    expect(updatedOriginal?.totalMonthlySpend).toBe(30);

    // Verify diff details
    expect(result.diff.oldAuditId).toBe(originalAuditId);
    expect(result.diff.newAuditId).toBe(reAuditId1);
    expect(result.diff.changedTools).toContain('cursor');
  });

  it('runs a repeated re-audit (multi-version chain), increments to version 3, and updates latest version flag', async () => {
    const baseUrl = 'http://localhost:5173';
    
    // Perform second re-audit using the second version's ID
    const result = await runReAudit(reAuditId1, baseUrl);

    expect(result).toBeDefined();
    expect(result.newAudit).toBeDefined();
    reAuditId2 = result.newAudit.auditId;

    // Verify version 3 audit properties
    expect(result.newAudit.auditVersion).toBe(3);
    expect(result.newAudit.reAuditOf).toBe(rootAuditId); // Points to root
    expect(result.newAudit.isLatestVersion).toBe(true);

    // Verify original and v2 are now not latest
    const v1 = await AuditModel.findOne({ auditId: originalAuditId });
    const v2 = await AuditModel.findOne({ auditId: reAuditId1 });

    expect(v1?.isLatestVersion).toBe(false);
    expect(v2?.isLatestVersion).toBe(false);
  });
});

describe('4. pricingChangeDetectionService notifications & duplicate protection', () => {
  let originalAuditId = 'test-notify-audit-' + Date.now();
  let rootAuditId = originalAuditId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Cleanup
    await AuditModel.deleteMany({
      $or: [{ auditId: rootAuditId }, { reAuditOf: rootAuditId }],
    });
    await mongoose.connection.close();
  });

  it('detects changes, triggers a background re-audit, sends email, and prevents duplicate notification', async () => {
    // 1. Mock email sending
    const sendEmailSpy = vi.spyOn(emailService, 'sendReAuditNotification').mockResolvedValue(undefined);

    // 2. Create an audit document with outdated pricing
    const oldSnapshot: PricingSnapshot = {
      capturedAt: new Date(Date.now() - 86400000).toISOString(),
      catalogVersion: '1.0',
      tools: {
        cursor: {
          name: 'Cursor',
          plans: {
            pro: { monthlyPricePerSeat: 10 }, // Outdated catalog price ($10 vs current $20)
          },
        },
      },
    };

    await AuditModel.create({
      auditId: originalAuditId,
      totalMonthlySpend: 20, // 2 seats * $10
      optimizedMonthlySpend: 20,
      estimatedMonthlySavings: 0,
      estimatedAnnualSavings: 0,
      savingsPercentage: 0,
      insights: [],
      publicUrl: `http://localhost:5173/audit/${originalAuditId}`,
      teamSize: 2,
      tools: [
        {
          toolId: 'cursor',
          plan: 'pro',
          monthlySpend: 20,
          seats: 2,
          useCase: 'coding',
        },
      ],
      inputStack: [
        {
          toolId: 'cursor',
          plan: 'pro',
          monthlySpend: 20,
          seats: 2,
          useCase: 'coding',
        },
      ],
      pricingSnapshot: oldSnapshot,
      isLatestVersion: true,
      auditVersion: 1,
      email: 'user-to-notify@stacksave.ai',
    });

    // 3. Scan first time: Should trigger re-audit and send email
    const { scanAuditsForPricingChanges } = await import('../src/services/pricingChangeDetectionService');
    const result1 = await scanAuditsForPricingChanges();

    expect(result1.success).toBe(true);
    expect(result1.auditsWithChanges).toBe(1);

    // Verify re-audit was run (which invalidates v1 as latest)
    const updatedOriginal = await AuditModel.findOne({ auditId: originalAuditId });
    expect(updatedOriginal?.pricingChanged).toBe(true);
    expect(updatedOriginal?.lastNotificationSentAt).toBeDefined();

    // Verify spy was called once
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);

    // Reset spy history
    sendEmailSpy.mockClear();

    // 4. Scan second time immediately: Should NOT send duplicate notification email
    const result2 = await scanAuditsForPricingChanges();
    expect(result2.success).toBe(true);
    // Original is no longer latest (v1 isLatestVersion = false), and the new latest is v2 which is up-to-date.
    // So there shouldn't be any active updates or duplicate emails sent.
    expect(sendEmailSpy).not.toHaveBeenCalled();

    sendEmailSpy.mockRestore();
  }, 20000);
});

