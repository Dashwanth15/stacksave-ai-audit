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
    const body = req.body as StackBuilderRequest;

    // Validate required fields
    if (typeof body.teamSize !== 'number' || body.teamSize < 1) {
      return res.status(400).json({
        success: false,
        error: 'teamSize must be a positive number.'
      });
    }

    if (typeof body.primaryWorkflow !== 'string' || !body.primaryWorkflow) {
      return res.status(400).json({
        success: false,
        error: 'primaryWorkflow is required.'
      });
    }

    if (!Array.isArray(body.mustHaveFeatures)) {
      return res.status(400).json({
        success: false,
        error: 'mustHaveFeatures must be an array.'
      });
    }

    if (!body.preferences || typeof body.preferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'preferences object is required.'
      });
    }

    // Ensure teamSize is reasonable
    const teamSize = Math.min(Math.max(1, Math.round(body.teamSize)), 10000);
    const monthlyBudget = body.monthlyBudget !== null && body.monthlyBudget !== undefined
      ? Math.max(0, body.monthlyBudget)
      : null;

    const normalizedReq: StackBuilderRequest = {
      monthlyBudget,
      teamSize,
      engineeringFocus: Array.isArray(body.engineeringFocus) ? body.engineeringFocus : [],
      primaryWorkflow: body.primaryWorkflow,
      mustHaveFeatures: body.mustHaveFeatures,
      preferences: {
        preferOpenSource: Boolean(body.preferences.preferOpenSource),
        avoidLockIn: Boolean(body.preferences.avoidLockIn),
        maximizeSavings: Boolean(body.preferences.maximizeSavings),
        preferEstablishedVendors: Boolean(body.preferences.preferEstablishedVendors)
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
