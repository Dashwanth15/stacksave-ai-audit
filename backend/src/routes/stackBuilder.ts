// ============================================================
// Stack Builder Route — POST /api/stack-builder
// Flow 2: Build AI Stack From Scratch
// Stateless endpoint — no MongoDB persistence required.
// ============================================================

import { Router, Request, Response } from 'express';
import { AIStackRecommendationEngine } from '../audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../types/stackBuilder';
import { auditLimiter } from '../middleware/rateLimit';

const router = Router();

// ── POST /api/stack-builder ────────────────────────────────────
router.post('/', auditLimiter, (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<StackBuilderRequest>;

    // Validate teamSize
    const rawTeamSize = typeof body.teamSize === 'number' ? body.teamSize : 1;
    const teamSize = Math.min(Math.max(1, Math.round(rawTeamSize)), 10000);

    // Validate domain / workflow
    const domain = body.domain || body.primaryWorkflow || (body.engineeringFocus && body.engineeringFocus[0]) || 'general-productivity';

    // Validate requirements
    const requirements = Array.isArray(body.requirements)
      ? body.requirements
      : Array.isArray(body.mustHaveFeatures)
      ? body.mustHaveFeatures
      : [];

    const strategy = body.strategy || (body.preferences?.maximizeSavings ? 'best-value' : 'balanced');

    // Validate budget
    const monthlyBudget = body.monthlyBudget !== null && body.monthlyBudget !== undefined && !isNaN(Number(body.monthlyBudget))
      ? Math.max(0, Number(body.monthlyBudget))
      : null;

    const prefs = body.preferences && typeof body.preferences === 'object' ? body.preferences : {
      preferOpenSource: false,
      avoidLockIn: false,
      maximizeSavings: strategy === 'best-value',
      preferEstablishedVendors: false,
      requireZeroRetention: strategy === 'enterprise-security'
    };

    const normalizedReq: StackBuilderRequest = {
      domain,
      requirements,
      strategy,
      teamSize,
      monthlyBudget,
      engineeringFocus: [domain],
      primaryWorkflow: domain,
      mustHaveFeatures: requirements,
      preferences: {
        preferOpenSource: Boolean(prefs.preferOpenSource),
        avoidLockIn: Boolean(prefs.avoidLockIn),
        maximizeSavings: Boolean(prefs.maximizeSavings || strategy === 'best-value'),
        preferEstablishedVendors: Boolean(prefs.preferEstablishedVendors),
        requireZeroRetention: Boolean(prefs.requireZeroRetention || strategy === 'enterprise-security')
      },
      constraints: body.constraints || {},
      debug: body.debug === true
    };

    const result = AIStackRecommendationEngine.run(normalizedReq);

    return res.status(200).json({ success: true, data: result });

  } catch (err) {
    console.error('❌ Stack builder error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during stack recommendation.' });
  }
});

export default router;
