// ============================================================
// Audit Routes — POST /api/audits, GET /api/audits/:id
// ============================================================

import { Router, Request, Response } from 'express';
import { AuditRequest } from '../types';
import { runAudit } from '../audit-engine/engine';
import { generateAuditSummary } from '../services/aiService';
import { AuditModel } from '../services/dbService';
import { validateAuditRequest } from '../middleware/validation';
import { capturePricingSnapshot } from '../services/pricingService';

const router = Router();

// ── POST /api/audits ─────────────────────────────────────────
// Main audit endpoint. Runs the engine, generates AI summary,
// saves to DB with pricing snapshot, returns full result.
// Batch 1: Persistent audit storage with pricing snapshot
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as AuditRequest & { email?: string };

    // Centralized validation (bounds checking, duplicate detection, use case validation)
    const validation = validateAuditRequest(body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const publicUrlBase = frontendUrl;

    // Run deterministic audit engine
    // Pass empty AI summary first, then get it asynchronously
    const auditResult = runAudit(body, '', publicUrlBase);

    // Generate AI summary (Grok) — runs after audit, so we have real numbers
    const aiSummary = await generateAuditSummary(auditResult);
    auditResult.aiSummary = aiSummary;

    // ── Batch 1: Capture Pricing Snapshot ────────────────────
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
      publicUrl: auditResult.publicUrl,
      companyName: auditResult.companyName,
      teamSize: auditResult.teamSize,
      tools: auditResult.tools,
      
      // Batch 1: New fields
      email: body.email,                    // User email for notifications
      inputStack: body.tools,               // Original tools submitted by user
      pricingSnapshot,                      // Pricing at time of audit
      isLatestVersion: true,                // This is the latest version
      auditVersion: 1,                      // First version
    });

    return res.status(201).json({ success: true, data: auditResult });
  } catch (err) {
    console.error('POST /api/audits error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process audit' });
  }
});

// ── GET /api/audits/:id ──────────────────────────────────────
// Public share endpoint. Strips private info (email, companyName).
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const audit = await AuditModel.findOne({ auditId: id });

    if (!audit) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    // Strip private fields from public response
    const publicAudit = {
      auditId: audit.auditId,
      createdAt: audit.createdAt,
      totalMonthlySpend: audit.totalMonthlySpend,
      optimizedMonthlySpend: audit.optimizedMonthlySpend,
      estimatedMonthlySavings: audit.estimatedMonthlySavings,
      estimatedAnnualSavings: audit.estimatedAnnualSavings,
      savingsPercentage: audit.savingsPercentage,
      isAlreadyOptimal: audit.isAlreadyOptimal,
      isHighSavings: audit.isHighSavings,
      insights: audit.insights,
      aiSummary: audit.aiSummary,
      publicUrl: audit.publicUrl,
      teamSize: audit.teamSize,
      tools: audit.tools,
      // companyName and email intentionally omitted
    };

    return res.json({ success: true, data: publicAudit });
  } catch (err) {
    console.error('GET /api/audits/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit' });
  }
});

// ── GET /api/audits/:id/full ────────────────────────────────
// Batch 1: Internal endpoint for retrieving full audit details
// including pricing snapshot (used for re-audits in Batch 2)
// Note: Should add auth/permission checks in production
router.get('/:id/full', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const audit = await AuditModel.findOne({ auditId: id });

    if (!audit) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

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
      },
    });
  } catch (err) {
    console.error('GET /api/audits/:id/full error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit' });
  }
});

export default router;
