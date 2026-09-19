// ============================================================
// Email Service — StackSave AI Audit
// Production Transactional Email Delivery via Resend SDK
// Premium SaaS Design System (Linear / Stripe / Vercel Aesthetic)
// ============================================================

import { Resend } from 'resend';
import crypto from 'crypto';
import { getFrontendUrl } from './dbService';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new Resend(apiKey.trim());
}

/**
 * Resolve the sender email address.
 * Precedence:
 * 1. process.env.EMAIL_FROM (e.g. "StackSave <notifications@stacksaveai.com>")
 * 2. process.env.RESEND_FROM
 * 3. Default: "StackSave <notifications@stacksaveai.com>"
 */
export function getSenderAddress(): string {
  if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) {
    return process.env.EMAIL_FROM.trim();
  }
  if (process.env.RESEND_FROM && process.env.RESEND_FROM.trim()) {
    return process.env.RESEND_FROM.trim();
  }
  return 'StackSave <notifications@stacksaveai.com>';
}

/**
 * Resolve the Reply-To email address.
 * Precedence:
 * 1. process.env.EMAIL_REPLY_TO
 * 2. process.env.SUPPORT_EMAIL
 * 3. Default: "StackSave Support <support@stacksaveai.com>"
 */
export function getReplyToAddress(): string {
  if (process.env.EMAIL_REPLY_TO && process.env.EMAIL_REPLY_TO.trim()) {
    return process.env.EMAIL_REPLY_TO.trim();
  }
  if (process.env.SUPPORT_EMAIL && process.env.SUPPORT_EMAIL.trim()) {
    return process.env.SUPPORT_EMAIL.trim();
  }
  return 'StackSave Support <support@stacksaveai.com>';
}

/**
 * Production dispatch via Resend SDK using the verified stacksaveai.com domain.
 */
async function sendWithDomainFallback(
  resend: Resend,
  payload: { from: string; to: string; subject: string; text: string; html: string; reply_to?: string }
): Promise<{ data: { id?: string } | null; error: { message: string } | null }> {
  const result = await resend.emails.send(payload);
  return result as { data: { id?: string } | null; error: { message: string } | null };
}

// ── Shared Email Design System ───────────────────────────────

const FONT_STACK = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

function renderEmailHeader(eyebrowBadgeHtml: string): string {
  return `
    <tr>
      <td style="padding: 0; background: linear-gradient(90deg, #10B981 0%, #00E599 100%); height: 3px; line-height: 3px; font-size: 3px;">&nbsp;</td>
    </tr>
    <tr>
      <td class="header-cell" style="padding: 24px 32px 20px 32px; border-bottom: 1px solid #F1F5F9; background-color: #FFFFFF;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td valign="middle" align="left">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle">
                    <div style="font-size: 19px; font-weight: 800; color: #0A0D14; letter-spacing: -0.03em; font-family: ${FONT_STACK}; line-height: 1.1;">
                      Stack<span style="color: #10B981; font-weight: 800;">Save</span>
                    </div>
                    <div style="font-size: 9px; font-weight: 700; color: #059669; letter-spacing: 0.1em; text-transform: uppercase; font-family: ${FONT_STACK}; margin-top: 3px;">
                      AI Spend Intelligence
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td valign="middle" align="right" style="white-space: nowrap; padding-left: 12px;">
              ${eyebrowBadgeHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `.trim();
}

function renderEmailFooter(appUrl: string, unsubLinkHtml = ''): string {
  return `
    <tr>
      <td style="background-color: #FAFAFA; border-top: 1px solid #F1F5F9; padding: 24px 32px; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">
          Stack<span style="color: #10B981;">Save</span> &middot; AI Spend Intelligence &amp; Optimization
        </p>
        <p style="margin: 0 0 10px 0; font-size: 11px; color: #94A3B8; line-height: 1.4; font-family: ${FONT_STACK};">
          Continuous monitoring across official vendor pricing feeds and subscription tiers.
        </p>
        <p style="margin: 0; font-size: 11px; color: #94A3B8; font-family: ${FONT_STACK};">
          <a href="${appUrl}/privacy" target="_blank" rel="noopener noreferrer" style="color: #64748B; text-decoration: underline;">Privacy Policy</a>
          &nbsp;&middot;&nbsp;
          <a href="${appUrl}/terms" target="_blank" rel="noopener noreferrer" style="color: #64748B; text-decoration: underline;">Terms of Service</a>
          ${unsubLinkHtml ? `&nbsp;&middot;&nbsp;${unsubLinkHtml}` : ''}
          &nbsp;&middot;&nbsp;
          <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="color: #64748B; text-decoration: underline;">stacksaveai.com</a>
        </p>
      </td>
    </tr>
  `.trim();
}

function renderPremiumUpgradeSection(appUrl: string): string {
  return `
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; margin-top: 28px; margin-bottom: 8px;">
      <tr>
        <td style="padding: 20px 24px;">
          <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 6px;">
            <tr>
              <td valign="middle">
                <span style="display: inline-block; background-color: #DCFCE7; border: 1px solid #86EFAC; color: #166534; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 2px 7px; border-radius: 9999px; font-family: ${FONT_STACK}; margin-right: 8px;">
                  PREMIUM
                </span>
              </td>
              <td valign="middle">
                <span style="font-size: 13px; font-weight: 700; color: #065F46; font-family: ${FONT_STACK};">
                  Unlock More with StackSave Premium
                </span>
              </td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #047857; line-height: 1.5; margin: 0 0 14px 0; font-family: ${FONT_STACK};">
            Get access to additional verified AI savings opportunities, deeper audit history, and shareable team reports.
          </p>
          <table role="presentation" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="border-radius: 6px; background-color: #0A0D14;">
                <a href="${appUrl}/#pricing" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 9px 18px; font-family: ${FONT_STACK}; font-size: 12px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 6px; letter-spacing: -0.01em; border: 1px solid #1E293B;">
                  Explore Premium <span style="color: #10B981; font-weight: 700; margin-left: 2px;">&rarr;</span>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `.trim();
}

function renderPremiumActiveClosingSection(): string {
  return `
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-top: 24px; margin-bottom: 8px;">
      <tr>
        <td style="padding: 16px 20px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5; font-family: ${FONT_STACK};">
            <strong style="color: #0A0D14;">StackSave Continuous Intelligence</strong> &middot; More verified AI opportunities are being monitored for you.
          </p>
        </td>
      </tr>
    </table>
  `.trim();
}

// ── Unsubscribe Token Helpers ─────────────────────────────────
// Authenticated encryption (AES-256-GCM) so internal user IDs are never exposed in the URL,
// and tokens cannot be forged or tampered with.

const UNKNOWN_SECRET = 'stacksave_email_unsub_fallback_key';

function getUnsubKey(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || UNKNOWN_SECRET;
  return crypto.createHash('sha256').update(secret).digest();
}

export function generateUnsubscribeToken(userId: string): string {
  const key = getUnsubKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const payload = JSON.stringify({ u: userId, t: Date.now() });
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Packed format: 12-byte IV + 16-byte AuthTag + encrypted payload
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64url');
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const combined = Buffer.from(token, 'base64url');
    if (combined.length < 29) return null; // 12 IV + 16 Tag + >=1 byte ciphertext

    const iv = combined.subarray(0, 12);
    const tag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);

    const key = getUnsubKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8'));
    return parsed.u || null;
  } catch {
    return null;
  }
}

// ── 1. Welcome Email ──────────────────────────────────────────

export interface SendWelcomeEmailParams {
  email: string;
  name?: string;
}

export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { email, name } = params;

  if (!email || !email.includes('@')) {
    console.warn(`[EmailService] Invalid or missing recipient email: "${email}". Skipping.`);
    return { success: false, error: 'Invalid recipient email' };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn('[EmailService] RESEND_API_KEY is not configured in environment. Skipping email dispatch.');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const from = getSenderAddress();
  const firstName = name ? name.trim().split(' ')[0] : 'there';
  const appUrl = getFrontendUrl();

  const subject = 'Welcome to StackSave — Smarter AI Spend Starts Here';

  const textContent = `
Hi ${firstName},

Welcome to StackSave.

StackSave gives you continuous intelligence on AI model and tooling pricing, helping you optimize spend, discover verified partner deals, and eliminate wasted software subscriptions.

Key capabilities in your account:
1. Live AI Pricing Intelligence: Real-time pricing benchmarks across models, tokens, and seats for 25+ providers.
2. Verified AI Deals & Promotions: Authentic promo codes, academic discounts, and partner perks.
3. Build My AI Stack: Intelligent stack recommendations tailored to your team's workflow and budget.
4. Instant Stack Audits: Upload your tool list for overlap detection, alternative evaluations, and migration savings.
5. StackSave Premium: Unlimited audit history, shareable reports, and curated AI savings briefs.

Launch your dashboard:
${appUrl}

Unlock more with StackSave Premium:
Get access to additional verified AI savings opportunities, deeper audit history, and Premium features as they become available.
${appUrl}/#pricing

---
StackSave · AI Spend Intelligence & Optimization
https://stacksaveai.com
`.trim();

  const eyebrowBadge = `<span style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 11px; border-radius: 9999px; font-family: ${FONT_STACK};">Welcome</span>`;

  const htmlContent = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${subject}</title>
  <style type="text/css">
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-content { padding: 24px 18px !important; }
      .header-cell { padding: 20px 18px 16px 18px !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; color: #0F172A;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (580px max) -->
        <table role="presentation" class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
          
          <!-- Header -->
          ${renderEmailHeader(eyebrowBadge)}

          <!-- Body Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #0A0D14; line-height: 1.3; letter-spacing: -0.02em; font-family: ${FONT_STACK};">
                Welcome to StackSave, ${firstName}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6; font-family: ${FONT_STACK};">
                Your intelligent copilot for AI spend management, continuous pricing benchmarks, and verified vendor deals.
              </p>

              <!-- Features Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; font-family: ${FONT_STACK};">
                      What You Can Do on StackSave
                    </div>

                    <!-- Item 1 -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                      <tr>
                        <td width="26" valign="top" style="padding-top: 1px;">
                          <div style="width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50%; color: #059669; font-size: 11px; font-weight: 800; font-family: ${FONT_STACK};">&#10003;</div>
                        </td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">Live AI Pricing Intelligence</div>
                          <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-top: 2px; font-family: ${FONT_STACK};">Real-time benchmarks across models, tokens, and seat tiers for 25+ providers.</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Item 2 -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                      <tr>
                        <td width="26" valign="top" style="padding-top: 1px;">
                          <div style="width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50%; color: #059669; font-size: 11px; font-weight: 800; font-family: ${FONT_STACK};">&#10003;</div>
                        </td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">Verified AI Deals &amp; Discounts</div>
                          <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-top: 2px; font-family: ${FONT_STACK};">Curated promo codes, academic discounts, and verified partner promotions.</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Item 3 -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                      <tr>
                        <td width="26" valign="top" style="padding-top: 1px;">
                          <div style="width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50%; color: #059669; font-size: 11px; font-weight: 800; font-family: ${FONT_STACK};">&#10003;</div>
                        </td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">Instant Stack Audits</div>
                          <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-top: 2px; font-family: ${FONT_STACK};">Evaluate your team's tool list for overlaps, alternatives, and migration savings.</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Item 4 -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="26" valign="top" style="padding-top: 1px;">
                          <div style="width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50%; color: #059669; font-size: 11px; font-weight: 800; font-family: ${FONT_STACK};">&#10003;</div>
                        </td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">StackSave Premium</div>
                          <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-top: 2px; font-family: ${FONT_STACK};">Unlimited audit history, shareable team reports, and curated AI savings briefs.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0D14; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; border: 1px solid #1E293B; letter-spacing: -0.01em; font-family: ${FONT_STACK}; box-shadow: 0 2px 6px rgba(10, 13, 20, 0.2);">
                      Launch StackSave Dashboard <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Premium Upgrade Section (Free Users) -->
              ${renderPremiumUpgradeSection(appUrl)}
            </td>
          </tr>

          <!-- Footer -->
          ${renderEmailFooter(appUrl)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  try {
    const { data, error } = await sendWithDomainFallback(resend, {
      from,
      to: email,
      reply_to: getReplyToAddress(),
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error('[EmailService] Resend API error sending welcome email:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] ✅ Welcome email sent to ${email} (Resend ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] Unexpected error sending welcome email:', msg);
    return { success: false, error: msg };
  }
}

// ── 2. Premium Activation Email ───────────────────────────────

export interface SendPremiumActivationEmailParams {
  email: string;
  name?: string;
  plan?: string;
}

export async function sendPremiumActivationEmail(
  params: SendPremiumActivationEmailParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { email, name, plan } = params;

  if (!email || !email.includes('@')) {
    console.warn(`[EmailService] Invalid or missing recipient email: "${email}". Skipping.`);
    return { success: false, error: 'Invalid recipient email' };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn('[EmailService] RESEND_API_KEY is not configured in environment. Skipping email dispatch.');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const from = getSenderAddress();
  const firstName = name ? name.trim().split(' ')[0] : 'there';
  const planName = plan ? (plan.toUpperCase().includes('YEAR') ? 'Annual' : 'Quarterly') : 'Premium';
  const appUrl = getFrontendUrl();

  const subject = 'You are now on StackSave Premium';

  const textContent = `
Hi ${firstName},

Your StackSave Premium subscription (${planName} Plan) is now active.

All account limits have been lifted, and you now have unrestricted access to:
- Unlimited Saved Audits: Track, compare, and manage your AI stacks indefinitely.
- Unlimited Shareable Reports: Generate public or private links to share audit breakdowns with your team.
- Curated AI Deals & Promo Codes: Full access to verified provider promotions and exclusive discounts.
- AI Savings Brief: Receive curated email updates with newly verified deals, sent every 2 days.
- Priority Intelligence: Early access to new benchmarking tools and cost calculators.

Explore your Premium benefits:
${appUrl}/offers

---
StackSave Continuous Intelligence · More verified AI opportunities are being tracked for you.
https://stacksaveai.com
`.trim();

  const eyebrowBadge = `<span style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 11px; border-radius: 9999px; font-family: ${FONT_STACK};">Premium Active</span>`;

  const htmlContent = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${subject}</title>
  <style type="text/css">
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-content { padding: 24px 18px !important; }
      .header-cell { padding: 20px 18px 16px 18px !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; color: #0F172A;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (580px max) -->
        <table role="presentation" class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
          
          <!-- Header -->
          ${renderEmailHeader(eyebrowBadge)}

          <!-- Body Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #0A0D14; line-height: 1.3; letter-spacing: -0.02em; font-family: ${FONT_STACK};">
                You're now on StackSave Premium
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6; font-family: ${FONT_STACK};">
                Your payment was confirmed and your account is upgraded to the <strong>${planName} Plan</strong>. All usage limits have been lifted.
              </p>

              <!-- Feature List Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; font-family: ${FONT_STACK};">
                      Active Premium Capabilities
                    </div>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                      <tr>
                        <td width="26" valign="top" style="padding-top: 1px;">
                          <div style="width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50%; color: #059669; font-size: 11px; font-weight: 800; font-family: ${FONT_STACK};">&#10003;</div>
                        </td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">Unlimited Saved Audits</div>
                          <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-top: 2px; font-family: ${FONT_STACK};">Save, track, and compare unlimited AI audits without plan restrictions.</div>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                      <tr>
                        <td width="26" valign="top" style="padding-top: 1px;">
                          <div style="width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50%; color: #059669; font-size: 11px; font-weight: 800; font-family: ${FONT_STACK};">&#10003;</div>
                        </td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">Unlimited Shareable Reports</div>
                          <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-top: 2px; font-family: ${FONT_STACK};">Generate permanent public or private report links for stakeholders and teammates.</div>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                      <tr>
                        <td width="26" valign="top" style="padding-top: 1px;">
                          <div style="width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50%; color: #059669; font-size: 11px; font-weight: 800; font-family: ${FONT_STACK};">&#10003;</div>
                        </td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">Verified AI Deals &amp; Promo Codes</div>
                          <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-top: 2px; font-family: ${FONT_STACK};">Unrestricted access to verified AI offers, promo codes, and partner bundles.</div>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="26" valign="top" style="padding-top: 1px;">
                          <div style="width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50%; color: #059669; font-size: 11px; font-weight: 800; font-family: ${FONT_STACK};">&#10003;</div>
                        </td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">AI Savings Brief</div>
                          <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-top: 2px; font-family: ${FONT_STACK};">Direct email alerts whenever newly confirmed AI discounts and partner deals go live.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/offers" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0D14; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; border: 1px solid #1E293B; letter-spacing: -0.01em; font-family: ${FONT_STACK}; box-shadow: 0 2px 6px rgba(10, 13, 20, 0.2);">
                      Explore Verified AI Offers <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Premium Status Banner (No Upgrade CTA for Premium Users) -->
              ${renderPremiumActiveClosingSection()}
            </td>
          </tr>

          <!-- Footer -->
          ${renderEmailFooter(appUrl)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  try {
    const { data, error } = await sendWithDomainFallback(resend, {
      from,
      to: email,
      reply_to: getReplyToAddress(),
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error('[EmailService] Resend API error sending premium activation email:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] ✅ Premium activation email sent to ${email} (Resend ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] Unexpected error sending premium activation email:', msg);
    return { success: false, error: msg };
  }
}

// ── 3. Daily AI Offers Digest Email ───────────────────────────

export interface OfferDigestItem {
  title: string;
  description?: string;
  discount?: string;
  category?: string;
  provider?: string;
  partner?: string;
  url?: string;
  expiresAt?: Date | string;
  isNew?: boolean;
  isUpdated?: boolean;
  isMissed?: boolean;   // Resurfaced: was available but not previously selected; waiting 7-10+ days
  value?: string | number;
}

export interface SendOfferDigestEmailParams {
  email: string;
  name?: string;
  userId: string;
  offers: OfferDigestItem[];
}

export async function sendOfferDigestEmail(
  params: SendOfferDigestEmailParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { email, name, userId, offers } = params;

  if (!email || !email.includes('@')) {
    console.warn(`[EmailService] Invalid or missing recipient email: "${email}". Skipping.`);
    return { success: false, error: 'Invalid recipient email' };
  }

  if (!offers || offers.length === 0) {
    console.warn(`[EmailService] No offers provided for digest to "${email}". Skipping.`);
    return { success: false, error: 'No offers for digest' };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn('[EmailService] RESEND_API_KEY is not configured in environment. Skipping email dispatch.');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const from = getSenderAddress();
  const firstName = name ? name.trim().split(' ')[0] : 'there';
  const appUrl = getFrontendUrl();
  const unsubToken = generateUnsubscribeToken(userId);
  const unsubUrl = `${appUrl}/api/user/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

  const subject = `StackSave AI Savings Brief: ${offers.length} Verified AI Opportunities`;

  const offersTextList = offers
    .map((o, idx) => {
      const badge = o.isNew ? '[NEW] ' : o.isUpdated ? '[UPDATED] ' : o.isMissed ? '[STILL AVAILABLE] ' : '';
      const discount = o.discount ? ` (${o.discount})` : o.value ? ` (${o.value})` : '';
      const desc = o.description ? `\n   ${o.description}` : '';
      const link = o.url ? `\n   Link: ${o.url}` : '';
      return `${idx + 1}. ${badge}${o.title}${discount}${desc}${link}`;
    })
    .join('\n\n');

  const textContent = `
Hi ${firstName},

Here is your StackSave AI Savings Brief with ${offers.length} verified opportunities:

${offersTextList}

View and claim all verified AI offers:
${appUrl}/offers

---
You are receiving this digest because you are an active StackSave Premium member.
To unsubscribe from offer digests:
${unsubUrl}

StackSave Continuous Intelligence · More verified AI opportunities are being tracked for you.
https://stacksaveai.com
`.trim();

  // HTML Offers rows with clean SaaS card design
  const offersHtmlRows = offers
    .map((o) => {
      const badgeHtml = o.isNew
        ? `<span style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 9999px; font-family: ${FONT_STACK};">New</span>`
        : o.isUpdated
        ? `<span style="display: inline-block; background-color: #F0FDF4; border: 1px solid #86EFAC; color: #166534; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 9999px; font-family: ${FONT_STACK};">Updated</span>`
        : o.isMissed
        ? `<span style="display: inline-block; background-color: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 9999px; font-family: ${FONT_STACK};">Still available</span>`
        : `<span style="display: inline-block; background-color: #F8FAFC; border: 1px solid #E2E8F0; color: #64748B; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 9999px; font-family: ${FONT_STACK};">Verified</span>`;

      const discountHtml = o.discount || o.value
        ? `<span style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-family: ${FONT_STACK}; margin-left: 8px;">${o.discount || o.value}</span>`
        : '';

      const partnerOrProvider = o.partner || o.provider || '';
      const category = o.category || '';

      return `
        <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 6px;">
            <tr>
              <td valign="middle">
                ${partnerOrProvider ? `<span style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; font-family: ${FONT_STACK};">${partnerOrProvider}</span>` : ''}
                ${category ? `<span style="font-size: 11px; color: #94A3B8; font-family: ${FONT_STACK}; margin-left: 6px;">&middot; ${category}</span>` : ''}
              </td>
              <td align="right" valign="middle">
                ${badgeHtml}
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 6px;">
            <tr>
              <td valign="baseline">
                <span style="font-size: 14px; font-weight: 700; color: #0A0D14; line-height: 1.35; font-family: ${FONT_STACK};">${o.title}</span>
              </td>
              <td align="right" valign="baseline" style="white-space: nowrap;">
                ${discountHtml}
              </td>
            </tr>
          </table>

          ${o.description ? `<p style="margin: 0 0 12px 0; color: #475569; font-size: 12px; line-height: 1.5; font-family: ${FONT_STACK};">${o.description}</p>` : ''}

          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="right">
                <a href="${o.url || `${appUrl}/offers`}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; font-weight: 700; color: #059669; text-decoration: none; font-family: ${FONT_STACK};">
                  View Offer &rarr;
                </a>
              </td>
            </tr>
          </table>
        </div>
      `;
    })
    .join('');

  const eyebrowBadge = `<span style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 11px; border-radius: 9999px; font-family: ${FONT_STACK};">Savings Brief</span>`;

  const htmlContent = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${subject}</title>
  <style type="text/css">
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-content { padding: 24px 18px !important; }
      .header-cell { padding: 20px 18px 16px 18px !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; color: #0F172A;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (580px max) -->
        <table role="presentation" class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
          
          <!-- Header -->
          ${renderEmailHeader(eyebrowBadge)}

          <!-- Body Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #0A0D14; line-height: 1.3; letter-spacing: -0.02em; font-family: ${FONT_STACK};">
                Your StackSave AI Savings Brief
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6; font-family: ${FONT_STACK};">
                Hi ${firstName}, here are the latest <strong>${offers.length} verified AI savings opportunities</strong> tracked for your stack:
              </p>

              <!-- Offers List -->
              <div style="margin-bottom: 20px;">
                ${offersHtmlRows}
              </div>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/offers" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0D14; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; border: 1px solid #1E293B; letter-spacing: -0.01em; font-family: ${FONT_STACK}; box-shadow: 0 2px 6px rgba(10, 13, 20, 0.2);">
                      View All Offers in Dashboard <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Closing Note (No Upgrade CTA for Premium Users) -->
              ${renderPremiumActiveClosingSection()}
            </td>
          </tr>

          <!-- Footer with Unsubscribe -->
          ${renderEmailFooter(appUrl, `<a href="${unsubUrl}" target="_blank" rel="noopener noreferrer" style="color: #64748B; text-decoration: underline;">Unsubscribe from offer digests</a>`)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  try {
    const { data, error } = await sendWithDomainFallback(resend, {
      from,
      to: email,
      reply_to: getReplyToAddress(),
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error('[EmailService] Resend API error sending offer digest:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] ✅ Offer digest sent to ${email} (Resend ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] Unexpected error sending offer digest:', msg);
    return { success: false, error: msg };
  }
}

// ── 4. Audit Confirmation Email ───────────────────────────────

export interface SendAuditConfirmationParams {
  email: string;
  auditId: string;
  publicUrl: string;
  monthlySavings: number;
  annualSavings: number;
  isHighSavings: boolean;
  companyName?: string;
  totalMonthlySpend?: number;
  optimizedMonthlySpend?: number;
  savingsPercentage?: number;
  teamSize?: number;
  toolCount?: number;
}

export async function sendAuditConfirmation(
  params: SendAuditConfirmationParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const {
    email,
    auditId,
    publicUrl,
    monthlySavings,
    annualSavings,
    isHighSavings,
    companyName,
    totalMonthlySpend,
    optimizedMonthlySpend,
    savingsPercentage,
    teamSize,
    toolCount,
  } = params;

  if (!email || !email.includes('@')) {
    console.warn(`[EmailService] Invalid or missing recipient email: "${email}". Skipping.`);
    return { success: false, error: 'Invalid recipient email' };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn('[EmailService] RESEND_API_KEY is not configured in environment. Skipping email dispatch.');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const from = getSenderAddress();
  const appUrl = getFrontendUrl();
  const formattedMonthly = monthlySavings > 0 ? `$${Math.round(monthlySavings).toLocaleString()}` : '$0';
  const formattedAnnual = annualSavings > 0 ? `$${Math.round(annualSavings).toLocaleString()}` : '$0';
  const formattedTotal = totalMonthlySpend && totalMonthlySpend > 0 ? `$${Math.round(totalMonthlySpend).toLocaleString()}/mo` : null;
  const formattedOptimized = optimizedMonthlySpend && optimizedMonthlySpend > 0 ? `$${Math.round(optimizedMonthlySpend).toLocaleString()}/mo` : null;
  const pct = savingsPercentage ? Math.round(savingsPercentage) : (totalMonthlySpend && monthlySavings ? Math.round((monthlySavings / totalMonthlySpend) * 100) : 0);

  const subject = monthlySavings > 0
    ? `Your StackSave AI Audit: ${formattedMonthly}/mo in Potential Savings Detected`
    : 'Your StackSave AI Audit Report is Ready';

  const textContent = `
StackSave AI Audit Report
==================================================
${companyName ? `Prepared for: ${companyName}\n` : ''}Audit ID: ${auditId}

EXECUTIVE FINANCIAL SUMMARY
--------------------------------------------------
Potential Monthly Savings: ${formattedMonthly}/mo
Projected Annual Value:   ${formattedAnnual}/yr
${formattedTotal ? `Current Monthly Spend:    ${formattedTotal}\n` : ''}${formattedOptimized ? `Optimized Monthly Spend:  ${formattedOptimized}\n` : ''}${pct > 0 ? `Spend Reduction:          ${pct}%\n` : ''}${teamSize ? `Team Seats:               ${teamSize}\n` : ''}${toolCount ? `Tools Evaluated:          ${toolCount}\n` : ''}
VIEW YOUR INTERACTIVE AUDIT REPORT
--------------------------------------------------
${publicUrl}

Unlock more with StackSave Premium:
Get access to additional verified AI savings opportunities, deeper audit history, and Premium features as they become available.
${appUrl}/#pricing

---
StackSave · AI Spend Intelligence & Optimization
https://stacksaveai.com
`.trim();

  const eyebrowBadge = `<span style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 11px; border-radius: 9999px; font-family: ${FONT_STACK};">Audit Report</span>`;

  const htmlContent = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${subject}</title>
  <style type="text/css">
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-content { padding: 24px 18px !important; }
      .header-cell { padding: 20px 18px 16px 18px !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; color: #0F172A;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (580px max) -->
        <table role="presentation" class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
          
          <!-- Header -->
          ${renderEmailHeader(eyebrowBadge)}

          <!-- Body Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #0A0D14; line-height: 1.3; letter-spacing: -0.02em; font-family: ${FONT_STACK};">
                Your AI Stack Audit is Complete${companyName ? `, ${companyName}` : ''}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6; font-family: ${FONT_STACK};">
                We evaluated your AI subscriptions against official vendor pricing models, workflow overlap benchmarks, and optimization candidates.
              </p>

              <!-- Highlight Metric Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 22px 20px; text-align: center;">
                    <span style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 6px; font-family: ${FONT_STACK};">
                      ${monthlySavings > 0 ? 'Potential Monthly Spend Recovery' : 'Stack Efficiency Status'}
                    </span>
                    <div style="font-size: 34px; font-weight: 800; color: #047857; line-height: 1.1; letter-spacing: -0.03em; margin: 0 0 6px 0; font-family: ${FONT_STACK};">
                      ${monthlySavings > 0 ? `${formattedMonthly}<span style="font-size: 16px; font-weight: 600; color: #059669;">/mo</span>` : 'Optimally Configured'}
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #065F46; font-family: ${FONT_STACK};">
                      ${monthlySavings > 0 ? `≈ ${formattedAnnual} / year projected savings${pct > 0 ? ` (${pct}% spend reduction)` : ''}` : 'Zero redundant subscriptions detected in your evaluated stack.'}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Multi-metric Summary Table -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  ${formattedTotal ? `
                  <td style="padding: 14px 16px; border-right: 1px solid #E2E8F0; text-align: center; width: 33%;">
                    <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-family: ${FONT_STACK};">Current Spend</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">${formattedTotal}</div>
                  </td>` : ''}
                  ${formattedOptimized ? `
                  <td style="padding: 14px 16px; ${toolCount ? 'border-right: 1px solid #E2E8F0;' : ''} text-align: center; width: 33%;">
                    <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-family: ${FONT_STACK};">Optimized Spend</div>
                    <div style="font-size: 14px; font-weight: 700; color: #047857; font-family: ${FONT_STACK};">${formattedOptimized}</div>
                  </td>` : ''}
                  <td style="padding: 14px 16px; text-align: center; width: 33%;">
                    <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-family: ${FONT_STACK};">Audit Scope</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0A0D14; font-family: ${FONT_STACK};">
                      ${toolCount ? `${toolCount} Tool${toolCount !== 1 ? 's' : ''}` : `${teamSize || 1} Seat${teamSize !== 1 ? 's' : ''}`}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${publicUrl}" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0D14; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; border: 1px solid #1E293B; letter-spacing: -0.01em; font-family: ${FONT_STACK}; box-shadow: 0 2px 6px rgba(10, 13, 20, 0.2);">
                      View Full Interactive Audit Report <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct Link -->
              <p style="margin: 0 0 20px 0; font-size: 12px; color: #94A3B8; line-height: 1.5; font-family: ${FONT_STACK};">
                Direct report link: <a href="${publicUrl}" target="_blank" rel="noopener noreferrer" style="color: #059669; word-break: break-all; text-decoration: underline;">${publicUrl}</a>
              </p>

              <!-- Premium Upgrade Section (Free Users) -->
              ${renderPremiumUpgradeSection(appUrl)}
            </td>
          </tr>

          <!-- Footer -->
          ${renderEmailFooter(appUrl)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  try {
    const { data, error } = await sendWithDomainFallback(resend, {
      from,
      to: email,
      reply_to: getReplyToAddress(),
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error('[EmailService] Resend API error sending audit confirmation:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] ✅ Audit confirmation email sent to ${email} (Resend ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] Unexpected error sending audit confirmation:', msg);
    return { success: false, error: msg };
  }
}

// ── 5. Re-Audit / Pricing Change Alert Email ───────────────────

export interface SendReAuditNotificationParams {
  email: string;
  auditId: string;
  comparisonUrl: string;
  companyName?: string;
  changedToolsSummary: string;
  savingsDelta: number;
  oldSavings: number;
  newSavings: number;
}

export async function sendReAuditNotification(
  params: SendReAuditNotificationParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const {
    email,
    auditId,
    comparisonUrl,
    companyName,
    changedToolsSummary,
    savingsDelta,
    oldSavings,
    newSavings,
  } = params;

  if (!email || !email.includes('@')) {
    console.warn(`[EmailService] Invalid or missing recipient email: "${email}". Skipping re-audit alert.`);
    return { success: false, error: 'Invalid recipient email' };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn('[EmailService] RESEND_API_KEY is not configured in environment. Skipping re-audit alert.');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const from = getSenderAddress();
  const appUrl = getFrontendUrl();
  const deltaText = savingsDelta > 0
    ? `increased by $${Math.round(savingsDelta).toLocaleString()}/mo`
    : savingsDelta < 0
      ? `decreased by $${Math.round(Math.abs(savingsDelta)).toLocaleString()}/mo`
      : 'remained unchanged';

  const deltaFormatted = savingsDelta >= 0
    ? `+$${Math.round(savingsDelta).toLocaleString()}/mo`
    : `-$${Math.round(Math.abs(savingsDelta)).toLocaleString()}/mo`;

  const subject = `AI Pricing Update: Your Stack Savings ${deltaText}`;

  const textContent = `
StackSave AI Pricing Alert
==================================================
${companyName ? `Prepared for: ${companyName}\n` : ''}Audit ID: ${auditId}

AI PROVIDER PRICING CHANGES DETECTED
--------------------------------------------------
Our continuous pricing monitor detected plan updates from your AI tooling providers.
Your potential monthly savings have ${deltaText}.

FINANCIAL DELTA SUMMARY
--------------------------------------------------
Previous Savings: $${Math.round(oldSavings).toLocaleString()}/mo
Updated Savings:  $${Math.round(newSavings).toLocaleString()}/mo
Net Savings Delta: ${deltaFormatted}

CHANGED PROVIDER PLANS
--------------------------------------------------
${changedToolsSummary}

VIEW FULL RE-AUDIT COMPARISON DIFF
--------------------------------------------------
${comparisonUrl}

Unlock more with StackSave Premium:
Get access to additional verified AI savings opportunities, deeper audit history, and Premium features as they become available.
${appUrl}/#pricing

---
StackSave · AI Spend Intelligence & Optimization
https://stacksaveai.com
`.trim();

  const eyebrowBadge = `<span style="display: inline-block; background-color: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 11px; border-radius: 9999px; font-family: ${FONT_STACK};">Pricing Alert</span>`;

  const htmlContent = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${subject}</title>
  <style type="text/css">
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-content { padding: 24px 18px !important; }
      .header-cell { padding: 20px 18px 16px 18px !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; color: #0F172A;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (580px max) -->
        <table role="presentation" class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
          
          <!-- Header -->
          ${renderEmailHeader(eyebrowBadge)}

          <!-- Body Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #0A0D14; line-height: 1.3; letter-spacing: -0.02em; font-family: ${FONT_STACK};">
                Provider Pricing Updates Detected${companyName ? `, ${companyName}` : ''}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6; font-family: ${FONT_STACK};">
                We detected official pricing modifications from your configured AI providers. Your potential monthly savings have <strong>${deltaText}</strong>.
              </p>

              <!-- Comparison Delta Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #E2E8F0;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 50%;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-family: ${FONT_STACK};">Previous Savings</div>
                          <div style="font-size: 16px; font-weight: 700; color: #475569; font-family: ${FONT_STACK};">$${Math.round(oldSavings).toLocaleString()}/mo</div>
                        </td>
                        <td style="width: 50%; padding-left: 16px;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-family: ${FONT_STACK};">Updated Savings</div>
                          <div style="font-size: 16px; font-weight: 700; color: #047857; font-family: ${FONT_STACK};">$${Math.round(newSavings).toLocaleString()}/mo</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; background-color: #FFFFFF; border-radius: 0 0 10px 10px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; font-family: ${FONT_STACK};">Net Financial Impact</span>
                        </td>
                        <td align="right">
                          <span style="font-size: 15px; font-weight: 800; color: ${savingsDelta >= 0 ? '#047857' : '#D97706'}; font-family: ${FONT_STACK};">
                            ${deltaFormatted}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Changed Vendor Plans Details -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; font-family: ${FONT_STACK};">
                  Modified Vendor Plan Details
                </div>
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #334155; font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; line-height: 1.45;">
                  ${changedToolsSummary}
                </div>
              </div>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${comparisonUrl}" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0D14; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; border: 1px solid #1E293B; letter-spacing: -0.01em; font-family: ${FONT_STACK}; box-shadow: 0 2px 6px rgba(10, 13, 20, 0.2);">
                      View Re-Audit Comparison Diff <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct Link -->
              <p style="margin: 0 0 20px 0; font-size: 12px; color: #94A3B8; line-height: 1.5; font-family: ${FONT_STACK};">
                Direct link: <a href="${comparisonUrl}" target="_blank" rel="noopener noreferrer" style="color: #059669; word-break: break-all; text-decoration: underline;">${comparisonUrl}</a>
              </p>

              <!-- Premium Upgrade Section (Free Users) -->
              ${renderPremiumUpgradeSection(appUrl)}
            </td>
          </tr>

          <!-- Footer -->
          ${renderEmailFooter(appUrl)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  try {
    const { data, error } = await sendWithDomainFallback(resend, {
      from,
      to: email,
      reply_to: getReplyToAddress(),
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error('[EmailService] Resend API error sending re-audit alert:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] ✅ Re-audit notification sent to ${email} (Resend ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] Unexpected error sending re-audit alert:', msg);
    return { success: false, error: msg };
  }
}
