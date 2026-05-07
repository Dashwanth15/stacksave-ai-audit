// ============================================================
// Leads Route — POST /api/leads
// Email capture with honeypot abuse protection + Resend email
// ============================================================

import { Router, Request, Response } from 'express';
import { LeadCaptureRequest } from '../types';
import { LeadModel, AuditModel } from '../services/dbService';
import { sendAuditConfirmation } from '../services/emailService';
import { honeypotCheck } from '../middleware/honeypot';
import { validateEmail } from '../middleware/validation';

const router = Router();

// ── POST /api/leads ───────────────────────────────────────────
// Honeypot middleware runs first, silently blocks bots
router.post('/', honeypotCheck, async (req: Request, res: Response) => {
  try {
    const body = req.body as LeadCaptureRequest;

    // ── Validation ────────────────────────────────────────────
    const emailCheck = validateEmail(body.email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, error: emailCheck.error });
    }
    if (!body.auditId || typeof body.auditId !== 'string') {
      return res.status(400).json({ success: false, error: 'Audit ID is required' });
    }

    // ── Find the audit ────────────────────────────────────────
    const audit = await AuditModel.findOne({ auditId: body.auditId });
    if (!audit) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    // ── Save lead (idempotent — same email + auditId is fine) ─
    try {
      await LeadModel.create({
        email: body.email.toLowerCase().trim(),
        auditId: body.auditId,
        companyName: body.companyName,
        role: body.role,
        teamSize: body.teamSize,
        isHighSavings: audit.isHighSavings,
      });

      // Update audit with email for internal tracking
      await AuditModel.updateOne({ auditId: body.auditId }, { email: body.email.toLowerCase() });
    } catch (err: unknown) {
      // Duplicate key = same email submitted twice for same audit → that's fine
      const mongoErr = err as { code?: number };
      if (mongoErr.code === 11000) {
        return res.status(200).json({ success: true, message: 'Already captured' });
      }
      throw err;
    }

    // ── Send transactional confirmation email ─────────────────
    try {
      await sendAuditConfirmation({
        email: body.email,
        auditId: body.auditId,
        publicUrl: audit.publicUrl,
        monthlySavings: audit.estimatedMonthlySavings,
        annualSavings: audit.estimatedAnnualSavings,
        isHighSavings: audit.isHighSavings,
        companyName: body.companyName,
      });
    } catch (emailErr) {
      // Email failure doesn't block the response — lead is already saved
      console.error('⚠️  Resend email failed:', (emailErr as Error).message);
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('POST /api/leads error:', err);
    return res.status(500).json({ success: false, error: 'Failed to capture lead' });
  }
});

export default router;
