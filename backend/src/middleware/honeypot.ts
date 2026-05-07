// ============================================================
// Honeypot Middleware — StackSave AI Audit
//
// Abuse protection: a hidden form field (_hp) that bots fill
// but real users never see. If it's non-empty, silently reject.
// This avoids UX friction that CAPTCHA solutions introduce.
//
// Documented choice in README: "Chose honeypot over hCaptcha
// to avoid friction at the lead capture step."
// ============================================================

import { Request, Response, NextFunction } from 'express';

/**
 * Honeypot middleware — checks for the _hp field.
 * If present and non-empty, returns a silent 200 (looks like success to the bot).
 * Real users never see this field (it's hidden via CSS/positioning).
 */
export function honeypotCheck(req: Request, res: Response, next: NextFunction): void {
  const honeypotValue = req.body?._hp;

  if (honeypotValue && honeypotValue.length > 0) {
    console.warn('🤖 Honeypot triggered — bot submission blocked');
    // Silent success — don't reveal the trap
    res.status(200).json({ success: true });
    return;
  }

  next();
}
