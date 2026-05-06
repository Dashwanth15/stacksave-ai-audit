// ============================================================
// Audit Routes — POST /api/audits, GET /api/audits/:id
// ============================================================

import { Router, Request, Response } from 'express';
import { AuditRequest } from '../types';
import { runAudit } from '../audit-engine/engine';
import { generateAuditSummary } from '../services/aiService';
import { AuditModel } from '../services/dbService';

const router = Router();

// ── POST /api/audits ─────────────────────────────────────────
// Main audit endpoint. Runs the engine, generates AI summary,
// saves to DB, returns full result.
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as AuditRequest;

    // Basic validation
    if (!body.tools || !Array.isArray(body.tools) || body.tools.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one tool is required' });
    }
    if (!body.teamSize || body.teamSize < 1) {
      return res.status(400).json({ success: false, error: 'Team size must be at least 1' });
    }
    if (!body.useCase) {
      return res.status(400).json({ success: false, error: 'Primary use case is required' });
    }

    // Validate each tool entry
    for (const tool of body.tools) {
      if (!tool.toolId || !tool.plan || tool.monthlySpend < 0 || tool.seats < 1) {
        return res.status(400).json({
          success: false,
          error: `Invalid tool entry for ${tool.toolId || 'unknown'}`,
        });
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const publicUrlBase = frontendUrl;

    // Run deterministic audit engine
    // Pass empty AI summary first, then get it asynchronously
    const auditResult = runAudit(body, '', publicUrlBase);

    // Generate AI summary (Grok) — runs after audit, so we have real numbers
    const aiSummary = await generateAuditSummary(auditResult);
    auditResult.aiSummary = aiSummary;

    // Persist to MongoDB
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

export default router;
