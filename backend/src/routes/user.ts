// ============================================================
// User Routes — StackSave AI
// GET /api/user/stack, POST /api/user/stack
// Free Plan Stack Limit: 3 saved stacks. Premium: unlimited.
// ============================================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuditModel, AuditShareLinkModel, SavedUserStackModel, SubscriptionModel } from '../services/dbService';
import { isPremiumUser, syncUserEntitlement } from '../services/billingService';

const router = Router();

// Free plan limit: 3 saved stacks
const FREE_STACK_LIMIT = 3;

// Helper: auto-migrate legacy embedded savedStack on user document to SavedUserStackModel collection
async function ensureLegacyStackMigrated(user: any): Promise<number> {
  let count = await SavedUserStackModel.countDocuments({ userId: user._id });
  if (count === 0 && user.savedStack && Array.isArray(user.savedStack.tools) && user.savedStack.tools.length > 0) {
    try {
      await SavedUserStackModel.create({
        userId: user._id,
        name: user.savedStack.name || 'Software Engineering AI Stack',
        domain: user.savedStack.domain || 'software-engineering',
        tools: user.savedStack.tools,
        totalMonthlySpend: user.savedStack.totalMonthlySpend || 0,
        recommendation: user.savedStack.recommendation,
        createdAt: user.savedStack.updatedAt || new Date(),
      });
      count = 1;
    } catch (err) {
      console.error('Error auto-migrating legacy stack:', err);
    }
  }
  return count;
}

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

    const [savedAuditsCount, shareLinksCount, savedStacksCount] = await Promise.all([
      AuditModel.countDocuments({ userId: user._id, isSaved: true }),
      AuditShareLinkModel.countDocuments({ userId: user._id }),
      ensureLegacyStackMigrated(user),
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
        savedStacks: {
          current: savedStacksCount,
          limit: isPremium ? null : FREE_STACK_LIMIT,
        },
      },
    });
  } catch (err) {
    console.error('GET /api/user/usage error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve usage stats.' });
  }
});

// ── GET /api/user/stack ──────────────────────────────────────
// Returns the user's most recently saved stack + all saved stacks list
router.get('/stack', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    // Ensure legacy stack is migrated if needed
    await ensureLegacyStackMigrated(user);

    // Fetch all saved stacks for this user (newest first)
    const stacks = await SavedUserStackModel.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    // For backward compat: return the most recent stack as `data`, plus full list in `stacks`
    const latest = stacks[0] || user.savedStack || null;

    return res.status(200).json({
      success: true,
      data: latest,
      stacks,
    });
  } catch (err) {
    console.error('GET /api/user/stack error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve saved stack.' });
  }
});

// ── POST /api/user/stack ─────────────────────────────────────
// Saves a new AI stack for the user. Free plan: max 3. Premium: unlimited.
router.post('/stack', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { name, domain, tools, totalMonthlySpend, recommendation } = req.body;

    // Free Plan Limit Enforcement: Maximum 3 saved stacks
    const isPremium = isPremiumUser(user);
    if (!isPremium) {
      const savedStackCount = await ensureLegacyStackMigrated(user);
      if (savedStackCount >= FREE_STACK_LIMIT) {
        return res.status(403).json({
          success: false,
          error: `Your Free plan includes ${FREE_STACK_LIMIT} saved stacks. Upgrade to Premium for unlimited stack history.`,
          code: 'FREE_STACK_LIMIT_REACHED',
          limit: FREE_STACK_LIMIT,
          current: savedStackCount,
          upgradeRequired: true,
        });
      }
    }

    // Create new stack document in the SavedUserStack collection
    const newStack = await SavedUserStackModel.create({
      userId: user._id,
      name: typeof name === 'string' ? name : 'My AI Stack',
      domain: typeof domain === 'string' ? domain : 'general-productivity',
      tools: Array.isArray(tools) ? tools : [],
      totalMonthlySpend: typeof totalMonthlySpend === 'number' ? totalMonthlySpend : 0,
      recommendation: recommendation || undefined,
    });

    // Also keep the user's embedded savedStack in sync for backward compat
    user.savedStack = {
      name: newStack.name,
      domain: newStack.domain,
      tools: newStack.tools,
      totalMonthlySpend: newStack.totalMonthlySpend,
      recommendation: newStack.recommendation,
      updatedAt: new Date(),
    };
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Stack saved successfully.',
      data: newStack,
    });
  } catch (err) {
    console.error('POST /api/user/stack error:', err);
    return res.status(500).json({ success: false, error: 'Failed to save stack.' });
  }
});

export default router;
