// ============================================================
// Leads Route — POST /api/leads
// Email capture with honeypot abuse protection + Resend email
// ============================================================

import { Router, Request, Response } from 'express';
import { LeadCaptureRequest } from '../types';
import { LeadModel, AuditModel } from '../services/dbService';
import { sendAuditConfirmation } from '../services/emailService';

const router = Router();

// ── POST /api/leads ───────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as LeadCaptureRequest;

    // ── Honeypot check ────────────────────────────────────────
    // The _hp field is hidden from real users (CSS display:none).
    // Bots fill all fields, humans don't touch hidden ones.
    // If it's non-empty, silently succeed (don't reveal the trap).
    if (body._hp && body._hp.length > 0) {
      console.warn('🤖 Honeypot triggered — bot submission blocked');
      return res.status(200).json({ success: true }); // silent success
    }

    // ── Validation ────────────────────────────────────────────
    if (!body.email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!body.auditId) {
      return res.status(400).json({ success: false, error: 'Audit ID is required' });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
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
