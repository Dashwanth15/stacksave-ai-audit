// ============================================================
// User Routes — StackSave AI
// GET /api/user/stack, POST /api/user/stack
// ============================================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuditModel, AuditShareLinkModel, SubscriptionModel } from '../services/dbService';
import { isPremiumUser, syncUserEntitlement } from '../services/billingService';

const router = Router();

// ── GET /api/user/usage ──────────────────────────────────────
// Returns authoritative database-backed usage metrics and limits for the user
router.get('/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    let isPremium = isPremiumUser(user);

    if (isPremium) {
      const sub = await SubscriptionModel.findOne({ userId: user._id }).sort({ createdAt: -1 });
      if (sub && !isPremiumUser(user, sub)) {
        await syncUserEntitlement(user._id, sub);
        isPremium = false;
      }
    }

    const [savedAuditsCount, shareLinksCount] = await Promise.all([
      AuditModel.countDocuments({ userId: user._id, isSaved: true }),
      AuditShareLinkModel.countDocuments({ userId: user._id }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        plan: isPremium ? 'PREMIUM' : 'FREE',
        savedAudits: {
          current: savedAuditsCount,
          limit: isPremium ? null : 2,
        },
        shareLinks: {
          current: shareLinksCount,
          limit: isPremium ? null : 5,
        },
      },
    });
  } catch (err) {
    console.error('GET /api/user/usage error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve usage stats.' });
  }
});

// ── GET /api/user/stack ──────────────────────────────────────
router.get('/stack', authenticate, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    return res.status(200).json({
      success: true,
      data: user.savedStack || null,
    });
  } catch (err) {
    console.error('GET /api/user/stack error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve saved stack.' });
  }
});

// ── POST /api/user/stack ─────────────────────────────────────
router.post('/stack', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { name, domain, tools, totalMonthlySpend, recommendation } = req.body;

    user.savedStack = {
      name: typeof name === 'string' ? name : 'My AI Stack',
      domain: typeof domain === 'string' ? domain : 'general-productivity',
      tools: Array.isArray(tools) ? tools : [],
      totalMonthlySpend: typeof totalMonthlySpend === 'number' ? totalMonthlySpend : 0,
      recommendation: recommendation || user.savedStack?.recommendation,
      updatedAt: new Date(),
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Stack saved successfully.',
      data: user.savedStack,
    });
  } catch (err) {
    console.error('POST /api/user/stack error:', err);
    return res.status(500).json({ success: false, error: 'Failed to save stack.' });
  }
});

export default router;
