// ============================================================
// Audit Routes — POST /api/audits, GET /api/audits/:id
// ============================================================

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { AuditRequest } from '../types';
import { runAudit } from '../audit-engine/engine';
import { generateAuditSummary } from '../services/aiService';
import { AuditModel, getFrontendUrl } from '../services/dbService';
import { validateAuditRequest } from '../middleware/validation';
import { capturePricingSnapshot } from '../services/pricingService';
import { scanAuditsForPricingChanges } from '../services/pricingChangeDetectionService';
import { runReAudit, generateAuditDiff } from '../services/reAuditService';
import { auditLimiter } from '../middleware/rateLimit';

const router = Router();

// ── Ownership token helper ─────────────────────────────────────
// Generates a 32-byte (64 hex char) random token for audit creator identification.
function generateOwnerToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verifies that the X-Audit-Token header in the request matches the
 * ownerToken stored in the DB for this audit.
 *
 * Returns true if the token matches (caller is the owner).
 * Returns false if missing, wrong, or the audit has no token stored.
 *
 * NOTE: Constant-time comparison via timingSafeEqual prevents timing attacks.
 */
async function verifyOwnerToken(auditId: string, req: Request): Promise<boolean> {
  const provided = req.headers['x-audit-token'];
  if (!provided || typeof provided !== 'string') return false;

  // Explicitly select the ownerToken field (excluded from queries by default via select:false)
  const audit = await AuditModel.findOne({ auditId }).select('+ownerToken').lean();
  if (!audit || !audit.ownerToken) return false;

  try {
    const a = Buffer.from(audit.ownerToken, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    // Buffers must be the same length for timingSafeEqual
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ── POST /api/audits ─────────────────────────────────────────
// Main audit endpoint. Runs the engine, generates AI summary,
// saves to DB with pricing snapshot, returns full result.
// Batch 1: Persistent audit storage with pricing snapshot
router.post('/', auditLimiter, async (req: Request, res: Response) => {
  try {
    const body = req.body as AuditRequest & { email?: string };

    // Centralized validation (bounds checking, duplicate detection, use case validation)
    const validation = validateAuditRequest(body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    // Resolve version chaining if reAuditOf is provided
    let reAuditOf: string | undefined;
    let auditVersion = 1;

    if (body.reAuditOf) {
      const parentAudit = await AuditModel.findOne({ auditId: body.reAuditOf });
      if (!parentAudit) {
        return res.status(404).json({ success: false, error: `Parent audit not found: ${body.reAuditOf}` });
      }

      reAuditOf = parentAudit.reAuditOf || parentAudit.auditId;

      // Query database to find the maximum version in this audit chain
      const latestAuditInChain = await AuditModel.findOne({
        $or: [{ auditId: reAuditOf }, { reAuditOf }],
      })
        .sort({ auditVersion: -1 })
        .exec();

      auditVersion = (latestAuditInChain?.auditVersion || parentAudit.auditVersion || 1) + 1;

      // Invalidate all previous versions in the chain
      await AuditModel.updateMany(
        { $or: [{ auditId: reAuditOf }, { reAuditOf }] },
        { isLatestVersion: false }
      );

      // Carry over parent metadata if not provided in the new request
      if (!body.email && parentAudit.email) body.email = parentAudit.email;
      if (!body.companyName && parentAudit.companyName) body.companyName = parentAudit.companyName;
    }

    const frontendUrl = getFrontendUrl();
    const publicUrlBase = frontendUrl;

    // Run deterministic audit engine
    // Pass empty AI summary first, then get it asynchronously
    const auditResult = runAudit(body, '', publicUrlBase);

    // Generate AI summaries (Grok) — runs after audit, so we have real numbers
    const aiSummary = await generateAuditSummary(auditResult, 'performance');
    const aiSummarySavings = await generateAuditSummary(auditResult, 'savings');
    auditResult.aiSummary = aiSummary;
    auditResult.aiSummarySavings = aiSummarySavings;

    // ── Generate a one-time ownership token ───────────────────
    // Returned ONCE to the creator. Used to authorize owner-only
    // operations (re-audit, private data retrieval) without requiring auth.
    const ownerToken = generateOwnerToken();

    // ── Batch 1: Capture Pricing Snapshot ────────────────────────
    const pricingSnapshot = capturePricingSnapshot();

    // Persist to MongoDB with Batch 1 fields
    await AuditModel.create({
      auditId: auditResult.auditId,
      totalMonthlySpend: auditResult.totalMonthlySpend,
      optimizedMonthlySpend: auditResult.optimizedMonthlySpend,
      estimatedMonthlySavings: auditResult.estimatedMonthlySavings,
      estimatedAnnualSavings: auditResult.estimatedAnnualSavings,
      savingsPercentage: auditResult.savingsPercentage,
      isAlreadyOptimal: auditResult.isAlreadyOptimal,
      isHighSavings: auditResult.isHighSavings,
      insights: auditResult.insights,
      aiSummary: auditResult.aiSummary,
      aiSummarySavings: auditResult.aiSummarySavings,
      publicUrl: auditResult.publicUrl,
      companyName: body.companyName || auditResult.companyName,
      teamSize: auditResult.teamSize,
      tools: auditResult.tools,
      useCase: body.useCase,
      optimizationGoal: body.optimizationGoal || 'balanced',
      
      // Batch 1: New fields
      email: body.email,                    // User email for notifications
      inputStack: body.tools,               // Original tools submitted by user
      pricingSnapshot,                      // Pricing at time of audit
      isLatestVersion: true,                // This is the latest version
      auditVersion,                         // Version in the chain
      reAuditOf,                            // Parent audit link
      billingCycle: body.billingCycle || 'monthly', // Billing period selected by user
      ownerToken,                           // One-time creation token (select:false in schema)
    });

    // Return the audit result plus the ownerToken (returned ONLY once at creation).
    // The frontend stores this token in user-scoped localStorage and sends it
    // as X-Audit-Token on subsequent owner-only requests.
    return res.status(201).json({ success: true, data: { ...auditResult, ownerToken } });
  } catch (err) {
    console.error('POST /api/audits error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process audit' });
  }
});

// ── GET /api/audits/:id ──────────────────────────────────────
// Public share endpoint. Strips private info (email, companyName).
// Always re-runs the audit engine so fresh optimization logic is applied.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const audit = await AuditModel.findOne({ auditId: id });

    if (!audit) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    // Fetch version timeline for the audit chain
    const rootAuditId = audit.reAuditOf || audit.auditId;
    const allVersionsDocs = await AuditModel.find({
      $or: [{ auditId: rootAuditId }, { reAuditOf: rootAuditId }],
    })
      .select('auditId auditVersion createdAt estimatedMonthlySavings isLatestVersion')
      .sort({ auditVersion: 1 })
      .exec();

    const allVersions = allVersionsDocs.map(v => ({
      auditId: v.auditId,
      auditVersion: v.auditVersion || 1,
      createdAt: v.createdAt,
      estimatedMonthlySavings: v.estimatedMonthlySavings,
      isLatestVersion: !!v.isLatestVersion
    }));

    // Re-run the audit engine using the stored input tools so that any
    // improvements to the optimization logic are always reflected — even
    // for audits that were saved before a fix was deployed.
    let freshInsights = audit.insights;
    let freshTotalMonthlySpend = audit.totalMonthlySpend;
    let freshOptimizedMonthlySpend = audit.optimizedMonthlySpend;
    let freshEstimatedMonthlySavings = audit.estimatedMonthlySavings;
    let freshEstimatedAnnualSavings = audit.estimatedAnnualSavings;
    let freshSavingsPercentage = audit.savingsPercentage;
    let freshIsAlreadyOptimal = audit.isAlreadyOptimal;

    const inputTools = (audit as any).inputStack || audit.tools;
    if (inputTools && inputTools.length > 0) {
      try {
        const frontendUrl = getFrontendUrl();
        const auditUseCase = ((audit.useCase as string) || 'coding') as any;
        const auditGoal = (((audit as any).optimizationGoal as string) || 'balanced') as any;

        // Normalize stored tools: strip per-tool useCase (the engine takes it at the top level)
        // and ensure all numeric fields are present with defaults
        const normalizedTools = (inputTools as any[]).map((t: any) => ({
          toolId: t.toolId,
          plan: t.plan || 'free',
          monthlySpend: typeof t.monthlySpend === 'number' ? t.monthlySpend : 0,
          seats: typeof t.seats === 'number' && t.seats >= 1 ? t.seats : 1,
          modelId: t.modelId,
          versionName: t.versionName,
        }));

        const freshAuditBody = {
          tools: normalizedTools,
          teamSize: audit.teamSize || 1,
          useCase: auditUseCase,
          optimizationGoal: auditGoal,
          billingCycle: ((audit as any).billingCycle as 'monthly' | 'annual') || 'monthly',
        };
        const recomputed = runAudit(freshAuditBody as any, audit.aiSummary || '', frontendUrl);
        freshInsights = recomputed.insights;
        freshTotalMonthlySpend = recomputed.totalMonthlySpend;
        freshOptimizedMonthlySpend = recomputed.optimizedMonthlySpend;
        freshEstimatedMonthlySavings = recomputed.estimatedMonthlySavings;
        freshEstimatedAnnualSavings = recomputed.estimatedAnnualSavings;
        freshSavingsPercentage = recomputed.savingsPercentage;
        freshIsAlreadyOptimal = recomputed.isAlreadyOptimal;
      } catch (engineErr) {
        // Fallback to stored insights if engine throws for any reason
        console.error('Engine re-run failed, using stored insights:', engineErr);
      }
    }

    // Strip private fields from public response
    const publicAudit = {
      auditId: audit.auditId,
      createdAt: audit.createdAt,
      totalMonthlySpend: freshTotalMonthlySpend,
      optimizedMonthlySpend: freshOptimizedMonthlySpend,
      estimatedMonthlySavings: freshEstimatedMonthlySavings,
      estimatedAnnualSavings: freshEstimatedAnnualSavings,
      savingsPercentage: freshSavingsPercentage,
      isAlreadyOptimal: freshIsAlreadyOptimal,
      isHighSavings: freshEstimatedMonthlySavings > 500,
      insights: freshInsights,
      aiSummary: audit.aiSummary,
      publicUrl: audit.publicUrl,
      teamSize: audit.teamSize,
      tools: audit.tools,
      // companyName and email intentionally omitted

      // Batch 4 living-audit and version-aware fields
      pricingChanged: audit.pricingChanged,
      isLatestVersion: audit.isLatestVersion,
      auditVersion: audit.auditVersion,
      reAuditOf: audit.reAuditOf,
      outdatedReason: audit.outdatedReason,
      allVersions,
      useCase: audit.useCase,
      optimizationGoal: audit.optimizationGoal,
      billingCycle: (audit as any).billingCycle || 'monthly',
      aiSummarySavings: audit.aiSummarySavings,
    };

    return res.json({ success: true, data: publicAudit });
  } catch (err) {
    console.error('GET /api/audits/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit' });
  }
});


// ── GET /api/audits/:id/full ──────────────────────────────
// Internal endpoint for retrieving private audit details including
// email, companyName, inputStack, and pricingSnapshot.
// SECURITY: Requires X-Audit-Token matching the owner's stored token.
// Without it, returns 403 — does NOT fall back to a partial response.
router.get('/:id/full', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ── Server-side ownership enforcement ─────────────────────
    // Private fields (email, companyName, inputStack, pricingSnapshot)
    // are ONLY returned when the correct ownerToken is provided.
    const isOwner = await verifyOwnerToken(id, req);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: owner token required to access private audit data.',
      });
    }
    const audit = await AuditModel.findOne({ auditId: id });

    if (!audit) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    // Fetch version timeline for the audit chain
    const rootAuditId = audit.reAuditOf || audit.auditId;
    const allVersionsDocs = await AuditModel.find({
      $or: [{ auditId: rootAuditId }, { reAuditOf: rootAuditId }],
    })
      .select('auditId auditVersion createdAt estimatedMonthlySavings isLatestVersion')
      .sort({ auditVersion: 1 })
      .exec();

    const allVersions = allVersionsDocs.map(v => ({
      auditId: v.auditId,
      auditVersion: v.auditVersion || 1,
      createdAt: v.createdAt,
      estimatedMonthlySavings: v.estimatedMonthlySavings,
      isLatestVersion: !!v.isLatestVersion
    }));

    // Return full audit including pricing snapshot and input stack
    // This data is used by re-audit flow (Batch 2)
    return res.json({
      success: true,
      data: {
        auditId: audit.auditId,
        createdAt: audit.createdAt,
        email: audit.email,
        companyName: audit.companyName,
        teamSize: audit.teamSize,
        totalMonthlySpend: audit.totalMonthlySpend,
        optimizedMonthlySpend: audit.optimizedMonthlySpend,
        estimatedMonthlySavings: audit.estimatedMonthlySavings,
        estimatedAnnualSavings: audit.estimatedAnnualSavings,
        savingsPercentage: audit.savingsPercentage,
        insights: audit.insights,
        aiSummary: audit.aiSummary,
        publicUrl: audit.publicUrl,
        tools: audit.tools,
        
        // Batch 1 fields
        inputStack: audit.inputStack,
        pricingSnapshot: audit.pricingSnapshot,
        isLatestVersion: audit.isLatestVersion,
        auditVersion: audit.auditVersion,
        reAuditOf: audit.reAuditOf,
        pricingChanged: audit.pricingChanged,
        outdatedReason: audit.outdatedReason,
        allVersions,
      },
    });
  } catch (err) {
    console.error('GET /api/audits/:id/full error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit' });
  }
});

// ── POST /api/audits/:id/re-audit ──────────────────────────
// Batch 3: Re-audit generation endpoint.
// SECURITY: Requires X-Audit-Token header matching the ownerToken stored
// in DB for this audit. Token was issued once at creation to the submitter.
// Without it, any anonymous caller who knows an auditId could trigger
// a re-audit, modifying the audit chain and wasting server/AI resources.
router.post('/:id/re-audit', auditLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ── Server-side ownership enforcement ─────────────────────
    // Verify that the caller presents the correct ownerToken.
    // This is not frontend hiding — the check happens in the DB.
    const isOwner = await verifyOwnerToken(id, req);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: you are not the owner of this audit.',
      });
    }

    // Verify original audit exists
    const originalAudit = await AuditModel.findOne({ auditId: id });
    if (!originalAudit) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const frontendUrl = getFrontendUrl();
    const publicUrlBase = frontendUrl;

    const { newAudit, diff } = await runReAudit(id, publicUrlBase);

    // The new audit inherits the same owner — generate a fresh token for the
    // new auditId so the owner can perform future re-audits from the new version.
    const newOwnerToken = generateOwnerToken();
    await AuditModel.updateOne({ auditId: newAudit.auditId }, { ownerToken: newOwnerToken });

    return res.status(200).json({
      success: true,
      data: {
        newAuditId: newAudit.auditId,
        newAudit,
        diff,
        ownerToken: newOwnerToken, // returned once so the client can store it
      },
    });
  } catch (err) {
    console.error(`POST /api/audits/${req.params.id}/re-audit error:`, err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to re-audit',
    });
  }
});

// ── GET /api/audits/:id/diff ─────────────────────────────────
// Batch 3: Diff retrieval endpoint
// Compares the requested audit against the previous version in its chain.
// Supports ?compareWith=root to force comparison against the v1 baseline.
router.get('/:id/diff', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const compareWith = (req.query.compareWith as string) || 'previous';
    const audit = await AuditModel.findOne({ auditId: id });

    if (!audit) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    let oldAudit = null;
    let newAudit = null;

    // Resolve the root audit ID for this chain
    const rootAuditId = audit.reAuditOf || audit.auditId;

    if (audit.reAuditOf) {
      // The requested ID is a re-audit (v2+). It's the "new" side of the comparison.
      newAudit = audit;

      if (compareWith === 'root') {
        // Force comparison against the v1 baseline
        oldAudit = await AuditModel.findOne({ auditId: audit.reAuditOf });
      } else {
        // Default: compare against the PREVIOUS version (v(n-1))
        const currentVersion = audit.auditVersion || 2;
        oldAudit = await AuditModel.findOne({
          $or: [{ auditId: rootAuditId }, { reAuditOf: rootAuditId }],
          auditVersion: currentVersion - 1,
        });
        // Fallback: if previous version not found, compare against root
        if (!oldAudit) {
          oldAudit = await AuditModel.findOne({ auditId: audit.reAuditOf });
        }
      }
    } else {
      // The requested ID is the root original audit.
      oldAudit = audit;
      
      // Automatically find the latest version in the chain (v_latest) to compare with
      const latestVersion = await AuditModel.findOne({
        reAuditOf: audit.auditId,
        isLatestVersion: true,
      });
      if (latestVersion) {
        newAudit = latestVersion;
      } else {
        newAudit = audit;
      }
    }

    if (!oldAudit || !newAudit) {
      return res.status(404).json({
        success: false,
        error: 'Comparison versions not found. Ensure this audit has been re-audited.',
      });
    }

    const diff = generateAuditDiff(oldAudit, newAudit);

    // Fetch the FULL version chain for the timeline
    const allVersionsDocs = await AuditModel.find({
      $or: [{ auditId: rootAuditId }, { reAuditOf: rootAuditId }],
    })
      .select('auditId auditVersion createdAt estimatedMonthlySavings isLatestVersion')
      .sort({ auditVersion: 1 })
      .exec();

    return res.json({
      success: true,
      data: {
        oldAuditId: oldAudit.auditId,
        newAuditId: newAudit.auditId,
        oldAudit,
        newAudit,
        diff,
        allVersions: allVersionsDocs.map(v => ({
          auditId: v.auditId,
          auditVersion: v.auditVersion || 1,
          createdAt: v.createdAt,
          estimatedMonthlySavings: v.estimatedMonthlySavings,
          isLatestVersion: !!v.isLatestVersion
        }))
      },
    });
  } catch (err) {
    console.error(`GET /api/audits/${req.params.id}/diff error:`, err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve diff' });
  }
});

// ── POST /api/audits/detect-pricing-changes ──────────────────
// Batch 2: Manual detection endpoint
// Scans all audits and detects which ones are affected by pricing changes
// Compares each audit's pricing snapshot against current catalog pricing
// Note: Called manually (no cron job) for simplicity and easier debugging
router.post('/detect-pricing-changes', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Starting pricing change detection...');
    const result = await scanAuditsForPricingChanges();
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Detection failed',
      });
    }
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('POST /api/audits/detect-pricing-changes error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to detect pricing changes',
    });
  }
});

// GET alias for manual browser triggering/easier curls
router.get('/detect-pricing-changes', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Starting pricing change detection via GET...');
    const result = await scanAuditsForPricingChanges();
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Detection failed',
      });
    }
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/audits/detect-pricing-changes error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to detect pricing changes',
    });
  }
});

export default router;
