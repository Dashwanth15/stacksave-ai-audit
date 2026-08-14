// ============================================================
// Intelligence Routes — Express Endpoints for ADIP
// ============================================================

import { Router, Request, Response } from 'express';
import { ToolEntry, UseCase } from '../types';
import { AIStackIntelligenceService } from '../audit-engine/services/AIStackIntelligenceService';

const router = Router();

// ── POST /api/intelligence/audit-analysis ────────────────────
// Main endpoint: Generates replacement, consolidation, and removal
// intelligence for an audited tool stack in a single request.
router.post('/audit-analysis', async (req: Request, res: Response) => {
  try {
    const { tools, useCase = 'coding' } = req.body as {
      tools: ToolEntry[];
      useCase?: UseCase;
    };

    if (!Array.isArray(tools)) {
      return res.status(400).json({ success: false, error: 'Invalid tools payload' });
    }

    const intelligence = AIStackIntelligenceService.generateFullIntelligence(tools, useCase);
    return res.json({ success: true, data: intelligence });
  } catch (err) {
    console.error('POST /api/intelligence/audit-analysis error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate intelligence analysis' });
  }
});

// ── POST /api/intelligence/replace ───────────────────────────
router.post('/replace', async (req: Request, res: Response) => {
  try {
    const { tools, useCase = 'coding' } = req.body as { tools: ToolEntry[]; useCase?: UseCase };
    const replacements = AIStackIntelligenceService.analyzeReplacements(tools || [], useCase);
    return res.json({ success: true, data: replacements });
  } catch (err) {
    console.error('POST /api/intelligence/replace error:', err);
    return res.status(500).json({ success: false, error: 'Failed to run replacement analysis' });
  }
});

// ── POST /api/intelligence/consolidate ───────────────────────
router.post('/consolidate', async (req: Request, res: Response) => {
  try {
    const { tools, useCase = 'coding' } = req.body as { tools: ToolEntry[]; useCase?: UseCase };
    const consolidations = AIStackIntelligenceService.analyzeConsolidations(tools || [], useCase);
    return res.json({ success: true, data: consolidations });
  } catch (err) {
    console.error('POST /api/intelligence/consolidate error:', err);
    return res.status(500).json({ success: false, error: 'Failed to run consolidation analysis' });
  }
});

// ── POST /api/intelligence/remove ────────────────────────────
router.post('/remove', async (req: Request, res: Response) => {
  try {
    const { tools, useCase = 'coding' } = req.body as { tools: ToolEntry[]; useCase?: UseCase };
    const removals = AIStackIntelligenceService.analyzeRemovals(tools || [], useCase);
    return res.json({ success: true, data: removals });
  } catch (err) {
    console.error('POST /api/intelligence/remove error:', err);
    return res.status(500).json({ success: false, error: 'Failed to run removal analysis' });
  }
});

export default router;
