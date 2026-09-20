// ============================================================
// Email Service — StackSave AI Audit
// Production Transactional Email Delivery via Resend SDK
// Editorial SaaS Design System (Black + White + StackSave Green)
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

function renderEmailHeader(editorialEyebrow = ''): string {
  return `
    <tr>
      <td class="header-cell" style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #E4E4E7; background-color: #FFFFFF;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td valign="middle" align="left">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle">
                    <div style="font-size: 18px; font-weight: 800; color: #0A0A0F; letter-spacing: -0.03em; font-family: ${FONT_STACK}; line-height: 1.1;">
                      Stack<span style="color: #10B981; font-weight: 800;">Save</span>
                    </div>
                    <div style="font-size: 9px; font-weight: 600; color: #71717A; letter-spacing: 0.1em; text-transform: uppercase; font-family: ${FONT_STACK}; margin-top: 3px;">
                      AI Spend Intelligence
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            ${editorialEyebrow ? `
            <td valign="middle" align="right" style="white-space: nowrap; padding-left: 12px;">
              <span style="font-size: 10px; font-weight: 700; color: #059669; letter-spacing: 0.08em; text-transform: uppercase; font-family: ${FONT_STACK};">
                ${editorialEyebrow}
              </span>
            </td>` : ''}
          </tr>
        </table>
      </td>
    </tr>
  `.trim();
}

function renderEmailFooter(appUrl: string, unsubLinkHtml = ''): string {
  return `
    <tr>
      <td style="background-color: #FAFAFA; border-top: 1px solid #E4E4E7; padding: 24px 32px;">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK};">
          Stack<span style="color: #10B981;">Save</span> &middot; AI Spend Intelligence
        </p>
        <p style="margin: 0 0 12px 0; font-size: 11px; color: #A1A1AA; line-height: 1.45; font-family: ${FONT_STACK};">
          Continuous monitoring across official AI pricing and verified savings opportunities.
        </p>
        <p style="margin: 0; font-size: 11px; color: #71717A; font-family: ${FONT_STACK};">
          <a href="${appUrl}/privacy" target="_blank" rel="noopener noreferrer" style="color: #71717A; text-decoration: underline;">Privacy</a>
          &nbsp;&middot;&nbsp;
          <a href="${appUrl}/terms" target="_blank" rel="noopener noreferrer" style="color: #71717A; text-decoration: underline;">Terms</a>
          ${unsubLinkHtml ? `&nbsp;&middot;&nbsp;${unsubLinkHtml}` : ''}
          &nbsp;&middot;&nbsp;
          <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="color: #71717A; text-decoration: underline;">stacksaveai.com</a>
        </p>
      </td>
    </tr>
  `.trim();
}

function renderPremiumUpgradeSection(appUrl: string): string {
  return `
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 8px; margin-top: 24px; margin-bottom: 8px;">
      <tr>
        <td style="padding: 20px 22px;">
          <div style="font-size: 10px; font-weight: 700; color: #059669; letter-spacing: 0.1em; text-transform: uppercase; font-family: ${FONT_STACK}; margin-bottom: 4px;">
            StackSave Premium
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; margin-bottom: 6px;">
            More intelligence. More history. More opportunities.
          </div>
          <p style="font-size: 12px; color: #71717A; line-height: 1.5; margin: 0 0 14px 0; font-family: ${FONT_STACK};">
            Get access to additional verified AI savings opportunities, deeper audit history, and shareable team reports.
          </p>
          <table role="presentation" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <a href="${appUrl}/#pricing" target="_blank" rel="noopener noreferrer" style="display: inline-block; font-family: ${FONT_STACK}; font-size: 12px; font-weight: 700; color: #0A0A0F; text-decoration: none;">
                  Explore Premium <span style="color: #059669; font-weight: 700;">&rarr;</span>
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
    <div style="padding-top: 16px; margin-top: 20px; border-top: 1px solid #F4F4F5;">
      <p style="margin: 0; font-size: 12px; color: #71717A; line-height: 1.5; font-family: ${FONT_STACK};">
        <strong style="color: #0A0A0F;">StackSave Continuous Intelligence</strong> &middot; More verified AI opportunities are being monitored for you.
      </p>
    </div>
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

Your AI spend intelligence workspace is ready.

Track AI pricing, compare platforms, discover verified savings opportunities, and make more informed decisions about your AI stack.

Key capabilities:
01. Live AI Pricing Intelligence: Real-time pricing benchmarks across models, tokens, and seats for 25+ providers.
02. Verified AI Offers: Curated official discounts, partner benefits, and promotional perks.
03. Build Your AI Stack: Intelligent stack recommendations tailored to your team's workflow and budget.
04. Audit Your Existing Stack: Upload your tool list for overlap detection, alternative evaluations, and migration savings.
05. StackSave Premium: Unlimited audit history, shareable reports, and curated AI savings briefs.

Explore StackSave:
${appUrl}

Unlock more with StackSave Premium:
Get access to additional verified AI savings opportunities, deeper audit history, and Premium features as they become available.
${appUrl}/#pricing

---
StackSave · AI Spend Intelligence & Optimization
https://stacksaveai.com
`.trim();

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
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-content { padding: 24px 20px !important; }
      .header-cell { padding: 20px 20px 16px 20px !important; }
      .cta-table { width: 100% !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 14px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; color: #0A0A0F;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F4F5; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (600px max) -->
        <table role="presentation" class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          ${renderEmailHeader('Welcome')}

          <!-- Body Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 28px 32px;">
              
              <!-- Editorial Eyebrow -->
              <div style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 0.08em; text-transform: uppercase; font-family: ${FONT_STACK}; margin-bottom: 10px;">
                Welcome to StackSave
              </div>

              <!-- Hero Heading -->
              <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; color: #0A0A0F; line-height: 1.3; letter-spacing: -0.02em; font-family: ${FONT_STACK};">
                Your AI spend intelligence workspace is ready.
              </h1>

              <!-- Greeting & Intro -->
              <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #18181B; font-family: ${FONT_STACK};">
                Hi ${firstName},
              </p>
              <p style="margin: 0 0 28px 0; font-size: 14px; color: #52525B; line-height: 1.6; font-family: ${FONT_STACK};">
                Track AI pricing, compare platforms, discover verified savings opportunities, and make more informed decisions about your AI stack.
              </p>

              <!-- Editorial Feature Briefing -->
              <div style="margin-bottom: 28px;">
                <div style="font-size: 11px; font-weight: 700; color: #71717A; letter-spacing: 0.08em; text-transform: uppercase; font-family: ${FONT_STACK}; padding-bottom: 8px; border-bottom: 1px solid #E4E4E7; margin-bottom: 16px;">
                  Platform Capabilities
                </div>

                <!-- 01 -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #F4F4F5;">
                  <tr>
                    <td width="30" valign="top" style="font-size: 12px; font-weight: 700; color: #059669; font-family: ${FONT_STACK}; line-height: 1.4;">
                      01
                    </td>
                    <td valign="top" style="padding-left: 6px;">
                      <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; line-height: 1.3;">
                        AI Pricing Intelligence
                      </div>
                      <div style="font-size: 13px; color: #71717A; line-height: 1.5; margin-top: 2px; font-family: ${FONT_STACK};">
                        Live pricing benchmarks across AI models, token rates, and subscription tiers for 25+ providers.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- 02 -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #F4F4F5;">
                  <tr>
                    <td width="30" valign="top" style="font-size: 12px; font-weight: 700; color: #059669; font-family: ${FONT_STACK}; line-height: 1.4;">
                      02
                    </td>
                    <td valign="top" style="padding-left: 6px;">
                      <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; line-height: 1.3;">
                        Verified AI Offers
                      </div>
                      <div style="font-size: 13px; color: #71717A; line-height: 1.5; margin-top: 2px; font-family: ${FONT_STACK};">
                        Curated official discounts, partner benefits, education programs, and promotional pricing.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- 03 -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #F4F4F5;">
                  <tr>
                    <td width="30" valign="top" style="font-size: 12px; font-weight: 700; color: #059669; font-family: ${FONT_STACK}; line-height: 1.4;">
                      03
                    </td>
                    <td valign="top" style="padding-left: 6px;">
                      <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; line-height: 1.3;">
                        Build Your AI Stack
                      </div>
                      <div style="font-size: 13px; color: #71717A; line-height: 1.5; margin-top: 2px; font-family: ${FONT_STACK};">
                        Compare platforms and configure the right tooling mix for your team's budget and workflow.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- 04 -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 4px;">
                  <tr>
                    <td width="30" valign="top" style="font-size: 12px; font-weight: 700; color: #059669; font-family: ${FONT_STACK}; line-height: 1.4;">
                      04
                    </td>
                    <td valign="top" style="padding-left: 6px;">
                      <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; line-height: 1.3;">
                        Audit Your Existing Stack
                      </div>
                      <div style="font-size: 13px; color: #71717A; line-height: 1.5; margin-top: 2px; font-family: ${FONT_STACK};">
                        Evaluate your tool list for overlaps, cost-effective alternatives, and migration savings.
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="left">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" class="cta-table">
                      <tr>
                        <td style="border-radius: 8px; background-color: #0A0A0F;">
                          <a href="${appUrl}" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0A0F; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 8px; letter-spacing: 0.01em; font-family: ${FONT_STACK};">
                            Explore StackSave <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                          </a>
                        </td>
                      </tr>
                    </table>
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
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-content { padding: 24px 20px !important; }
      .header-cell { padding: 20px 20px 16px 20px !important; }
      .cta-table { width: 100% !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 14px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; color: #0A0A0F;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F4F5; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (600px max) -->
        <table role="presentation" class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          ${renderEmailHeader('Premium Active')}

          <!-- Body Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 28px 32px;">
              
              <!-- Editorial Eyebrow -->
              <div style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 0.08em; text-transform: uppercase; font-family: ${FONT_STACK}; margin-bottom: 10px;">
                StackSave Premium
              </div>

              <!-- Hero Heading -->
              <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; color: #0A0A0F; line-height: 1.3; letter-spacing: -0.02em; font-family: ${FONT_STACK};">
                Your Premium subscription is live.
              </h1>

              <!-- Description -->
              <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #18181B; font-family: ${FONT_STACK};">
                Hi ${firstName},
              </p>
              <p style="margin: 0 0 28px 0; font-size: 14px; color: #52525B; line-height: 1.6; font-family: ${FONT_STACK};">
                Your account is upgraded to the <strong>${planName} Plan</strong>. All usage limits have been lifted.
              </p>

              <!-- Editorial Feature Briefing -->
              <div style="margin-bottom: 28px;">
                <div style="font-size: 11px; font-weight: 700; color: #71717A; letter-spacing: 0.08em; text-transform: uppercase; font-family: ${FONT_STACK}; padding-bottom: 8px; border-bottom: 1px solid #E4E4E7; margin-bottom: 16px;">
                  Active Capabilities
                </div>

                <!-- 01 -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #F4F4F5;">
                  <tr>
                    <td width="30" valign="top" style="font-size: 12px; font-weight: 700; color: #059669; font-family: ${FONT_STACK}; line-height: 1.4;">
                      01
                    </td>
                    <td valign="top" style="padding-left: 6px;">
                      <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; line-height: 1.3;">
                        Unlimited Saved Audits
                      </div>
                      <div style="font-size: 13px; color: #71717A; line-height: 1.5; margin-top: 2px; font-family: ${FONT_STACK};">
                        Save, track, and compare unlimited AI audits without plan restrictions.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- 02 -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #F4F4F5;">
                  <tr>
                    <td width="30" valign="top" style="font-size: 12px; font-weight: 700; color: #059669; font-family: ${FONT_STACK}; line-height: 1.4;">
                      02
                    </td>
                    <td valign="top" style="padding-left: 6px;">
                      <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; line-height: 1.3;">
                        Unlimited Shareable Reports
                      </div>
                      <div style="font-size: 13px; color: #71717A; line-height: 1.5; margin-top: 2px; font-family: ${FONT_STACK};">
                        Generate permanent public or private report links for stakeholders and teammates.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- 03 -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #F4F4F5;">
                  <tr>
                    <td width="30" valign="top" style="font-size: 12px; font-weight: 700; color: #059669; font-family: ${FONT_STACK}; line-height: 1.4;">
                      03
                    </td>
                    <td valign="top" style="padding-left: 6px;">
                      <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; line-height: 1.3;">
                        Verified AI Deals &amp; Promo Codes
                      </div>
                      <div style="font-size: 13px; color: #71717A; line-height: 1.5; margin-top: 2px; font-family: ${FONT_STACK};">
                        Unrestricted access to verified AI offers, promo codes, and partner bundles.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- 04 -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 4px;">
                  <tr>
                    <td width="30" valign="top" style="font-size: 12px; font-weight: 700; color: #059669; font-family: ${FONT_STACK}; line-height: 1.4;">
                      04
                    </td>
                    <td valign="top" style="padding-left: 6px;">
                      <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; line-height: 1.3;">
                        AI Savings Brief
                      </div>
                      <div style="font-size: 13px; color: #71717A; line-height: 1.5; margin-top: 2px; font-family: ${FONT_STACK};">
                        Direct email alerts whenever newly confirmed AI discounts and partner deals go live.
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="left">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" class="cta-table">
                      <tr>
                        <td style="border-radius: 8px; background-color: #0A0A0F;">
                          <a href="${appUrl}/offers" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0A0F; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 8px; letter-spacing: 0.01em; font-family: ${FONT_STACK};">
                            Explore Verified AI Offers <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Closing Note -->
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

  // HTML Offers rows with clean editorial layout
  const offersHtmlRows = offers
    .map((o, idx) => {
      const isLast = idx === offers.length - 1;
      const badgeLabel = o.isNew
        ? 'New'
        : o.isUpdated
        ? 'Updated'
        : o.isMissed
        ? 'Still available'
        : '';

      const discountText = o.discount || (o.value ? String(o.value) : '');
      const partnerOrProvider = (o.partner || o.provider || '').toUpperCase();
      const category = (o.category || '').toUpperCase();

      return `
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 18px; ${!isLast ? 'padding-bottom: 18px; border-bottom: 1px solid #E4E4E7;' : ''}">
          <tr>
            <td>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 4px;">
                <tr>
                  <td valign="middle">
                    ${partnerOrProvider ? `<span style="font-size: 10px; font-weight: 700; color: #059669; letter-spacing: 0.08em; text-transform: uppercase; font-family: ${FONT_STACK};">${partnerOrProvider}</span>` : ''}
                    ${category ? `<span style="font-size: 10px; color: #A1A1AA; font-family: ${FONT_STACK}; margin-left: 6px;">&middot; ${category}</span>` : ''}
                  </td>
                  ${badgeLabel ? `
                  <td align="right" valign="middle">
                    <span style="font-size: 10px; font-weight: 700; color: #059669; letter-spacing: 0.06em; text-transform: uppercase; font-family: ${FONT_STACK};">
                      ${badgeLabel}
                    </span>
                  </td>` : ''}
                </tr>
              </table>

              <div style="font-size: 14px; font-weight: 700; color: #0A0A0F; line-height: 1.35; margin-bottom: 4px; font-family: ${FONT_STACK};">
                ${o.title}
                ${discountText ? `<span style="font-size: 12px; font-weight: 700; color: #059669; margin-left: 6px;">${discountText}</span>` : ''}
              </div>

              ${o.description ? `<div style="font-size: 12px; color: #52525B; line-height: 1.5; margin-bottom: 8px; font-family: ${FONT_STACK};">${o.description}</div>` : ''}

              <div>
                <a href="${o.url || `${appUrl}/offers`}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; font-weight: 700; color: #0A0A0F; text-decoration: none; font-family: ${FONT_STACK};">
                  View Offer <span style="color: #059669; font-weight: 700;">&rarr;</span>
                </a>
              </div>
            </td>
          </tr>
        </table>
      `;
    })
    .join('');

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
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-content { padding: 24px 20px !important; }
      .header-cell { padding: 20px 20px 16px 20px !important; }
      .cta-table { width: 100% !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 14px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; color: #0A0A0F;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F4F5; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (600px max) -->
        <table role="presentation" class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          ${renderEmailHeader('Savings Brief')}

          <!-- Body Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 28px 32px;">
              
              <!-- Editorial Eyebrow -->
              <div style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 0.08em; text-transform: uppercase; font-family: ${FONT_STACK}; margin-bottom: 10px;">
                AI Savings Brief &middot; 48-Hour Digest
              </div>

              <!-- Hero Heading -->
              <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; color: #0A0A0F; line-height: 1.3; letter-spacing: -0.02em; font-family: ${FONT_STACK};">
                Verified AI Savings Opportunities
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 14px; color: #52525B; line-height: 1.6; font-family: ${FONT_STACK};">
                Hi ${firstName}, here are the latest <strong>${offers.length} verified AI offers</strong> curated for your stack:
              </p>

              <!-- Offers List -->
              <div style="margin-bottom: 24px;">
                ${offersHtmlRows}
              </div>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="left">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" class="cta-table">
                      <tr>
                        <td style="border-radius: 8px; background-color: #0A0A0F;">
                          <a href="${appUrl}/offers" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0A0F; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 8px; letter-spacing: 0.01em; font-family: ${FONT_STACK};">
                            Explore All Offers in Dashboard <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Closing Note -->
              ${renderPremiumActiveClosingSection()}
            </td>
          </tr>

          <!-- Footer with Unsubscribe -->
          ${renderEmailFooter(appUrl, `<a href="${unsubUrl}" target="_blank" rel="noopener noreferrer" style="color: #71717A; text-decoration: underline;">Unsubscribe from brief</a>`)}

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
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-content { padding: 24px 20px !important; }
      .header-cell { padding: 20px 20px 16px 20px !important; }
      .cta-table { width: 100% !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 14px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; color: #0A0A0F;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F4F5; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (600px max) -->
        <table role="presentation" class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          ${renderEmailHeader('Audit Report')}

          <!-- Body Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 28px 32px;">
              
              <!-- Editorial Eyebrow -->
              <div style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 0.08em; text-transform: uppercase; font-family: ${FONT_STACK}; margin-bottom: 10px;">
                AI Stack Audit
              </div>

              <!-- Hero Heading -->
              <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; color: #0A0A0F; line-height: 1.3; letter-spacing: -0.02em; font-family: ${FONT_STACK};">
                Your AI Stack Audit is Complete${companyName ? `, ${companyName}` : ''}
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 14px; color: #52525B; line-height: 1.6; font-family: ${FONT_STACK};">
                We evaluated your AI subscriptions against official vendor pricing models, workflow overlap benchmarks, and optimization candidates.
              </p>

              <!-- Financial Metric Summary -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 22px; border-bottom: 1px solid #E4E4E7;">
                    <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; font-family: ${FONT_STACK};">
                      ${monthlySavings > 0 ? 'Potential Monthly Savings' : 'Stack Efficiency Status'}
                    </div>
                    <div style="font-size: 30px; font-weight: 800; color: #0A0A0F; line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 4px 0; font-family: ${FONT_STACK};">
                      ${monthlySavings > 0 ? `${formattedMonthly}<span style="font-size: 14px; font-weight: 600; color: #71717A;">/mo</span>` : 'Optimally Configured'}
                    </div>
                    <div style="font-size: 12px; color: #71717A; font-family: ${FONT_STACK};">
                      ${monthlySavings > 0 ? `≈ ${formattedAnnual} / year projected value${pct > 0 ? ` (${pct}% spend reduction)` : ''}` : 'Zero redundant subscriptions detected in your evaluated stack.'}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        ${formattedTotal ? `
                        <td style="width: 33%;">
                          <div style="font-size: 10px; font-weight: 700; color: #71717A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; font-family: ${FONT_STACK};">Current</div>
                          <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK};">${formattedTotal}</div>
                        </td>` : ''}
                        ${formattedOptimized ? `
                        <td style="width: 33%;">
                          <div style="font-size: 10px; font-weight: 700; color: #71717A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; font-family: ${FONT_STACK};">Optimized</div>
                          <div style="font-size: 13px; font-weight: 700; color: #059669; font-family: ${FONT_STACK};">${formattedOptimized}</div>
                        </td>` : ''}
                        <td style="width: 33%;">
                          <div style="font-size: 10px; font-weight: 700; color: #71717A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; font-family: ${FONT_STACK};">Scope</div>
                          <div style="font-size: 13px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK};">
                            ${toolCount ? `${toolCount} Tool${toolCount !== 1 ? 's' : ''}` : `${teamSize || 1} Seat${teamSize !== 1 ? 's' : ''}`}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="left">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" class="cta-table">
                      <tr>
                        <td style="border-radius: 8px; background-color: #0A0A0F;">
                          <a href="${publicUrl}" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0A0F; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 8px; letter-spacing: 0.01em; font-family: ${FONT_STACK};">
                            View Full Interactive Audit Report <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct Link -->
              <p style="margin: 0 0 20px 0; font-size: 12px; color: #A1A1AA; line-height: 1.5; font-family: ${FONT_STACK};">
                Direct report link: <a href="${publicUrl}" target="_blank" rel="noopener noreferrer" style="color: #71717A; word-break: break-all; text-decoration: underline;">${publicUrl}</a>
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
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-content { padding: 24px 20px !important; }
      .header-cell { padding: 20px 20px 16px 20px !important; }
      .cta-table { width: 100% !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 14px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; color: #0A0A0F;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F4F5; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (600px max) -->
        <table role="presentation" class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          ${renderEmailHeader('Pricing Alert')}

          <!-- Body Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 28px 32px;">
              
              <!-- Editorial Eyebrow -->
              <div style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 0.08em; text-transform: uppercase; font-family: ${FONT_STACK}; margin-bottom: 10px;">
                Pricing Intelligence Alert
              </div>

              <!-- Hero Heading -->
              <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; color: #0A0D14; line-height: 1.3; letter-spacing: -0.02em; font-family: ${FONT_STACK};">
                Provider Pricing Updates Detected${companyName ? `, ${companyName}` : ''}
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 14px; color: #52525B; line-height: 1.6; font-family: ${FONT_STACK};">
                We detected official pricing modifications from your configured AI providers. Your potential monthly savings have <strong>${deltaText}</strong>.
              </p>

              <!-- Comparison Delta Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #E4E4E7;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 50%;">
                          <div style="font-size: 10px; font-weight: 700; color: #71717A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; font-family: ${FONT_STACK};">Previous Savings</div>
                          <div style="font-size: 15px; font-weight: 700; color: #52525B; font-family: ${FONT_STACK};">$${Math.round(oldSavings).toLocaleString()}/mo</div>
                        </td>
                        <td style="width: 50%; padding-left: 16px;">
                          <div style="font-size: 10px; font-weight: 700; color: #71717A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; font-family: ${FONT_STACK};">Updated Savings</div>
                          <div style="font-size: 15px; font-weight: 700; color: #059669; font-family: ${FONT_STACK};">$${Math.round(newSavings).toLocaleString()}/mo</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; background-color: #FFFFFF;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 700; color: #71717A; text-transform: uppercase; letter-spacing: 0.05em; font-family: ${FONT_STACK};">Net Financial Impact</span>
                        </td>
                        <td align="right">
                          <span style="font-size: 14px; font-weight: 800; color: ${savingsDelta >= 0 ? '#059669' : '#D97706'}; font-family: ${FONT_STACK};">
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
                <div style="font-size: 10px; font-weight: 700; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; font-family: ${FONT_STACK};">
                  Modified Provider Plans
                </div>
                <div style="background-color: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #3F3F46; font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; line-height: 1.45;">
                  ${changedToolsSummary}
                </div>
              </div>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="left">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" class="cta-table">
                      <tr>
                        <td style="border-radius: 8px; background-color: #0A0A0F;">
                          <a href="${comparisonUrl}" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0D14; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 8px; letter-spacing: 0.01em; font-family: ${FONT_STACK};">
                            View Re-Audit Comparison Diff <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct Link -->
              <p style="margin: 0 0 20px 0; font-size: 12px; color: #A1A1AA; line-height: 1.5; font-family: ${FONT_STACK};">
                Direct link: <a href="${comparisonUrl}" target="_blank" rel="noopener noreferrer" style="color: #71717A; word-break: break-all; text-decoration: underline;">${comparisonUrl}</a>
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

// ── 7. Premium Upgrade Campaign for Free Users ─────────────────

/**
 * Milestone interval sequence in days for Free user Premium upgrade lifecycle emails.
 * Cycles continuously: 10 -> 15 -> 10 -> 15 -> 10...
 */
export const PREMIUM_UPGRADE_EMAIL_INTERVALS_DAYS = [10, 15, 10] as const;

/**
 * Returns the cadence interval in days for a given milestone sequence index.
 */
export function getUpgradeEmailIntervalDays(sequenceIndex: number): number {
  if (!Number.isFinite(sequenceIndex) || sequenceIndex < 0) {
    return PREMIUM_UPGRADE_EMAIL_INTERVALS_DAYS[0];
  }
  const idx = sequenceIndex % PREMIUM_UPGRADE_EMAIL_INTERVALS_DAYS.length;
  return PREMIUM_UPGRADE_EMAIL_INTERVALS_DAYS[idx];
}

export interface SendPremiumUpgradeEmailParams {
  email: string;
  name?: string;
  userId: string;
  sequenceIndex?: number;
}

interface UpgradeCopyVariant {
  eyebrow: string;
  subject: string;
  headline: string;
  intro: string;
}

const UPGRADE_EMAIL_VARIANTS: UpgradeCopyVariant[] = [
  {
    eyebrow: 'A BETTER WAY TO MANAGE YOUR AI STACK',
    subject: 'Unlock more with StackSave Premium',
    headline: 'Unlock more with StackSave Premium',
    intro: "You're already using StackSave to understand your AI stack. Premium gives you more ways to track, save, and discover valuable AI opportunities.",
  },
  {
    eyebrow: 'PERSISTENT AI SPEND INTELLIGENCE',
    subject: 'Keep your AI spend history working for you',
    headline: 'Keep your AI spend history working for you',
    intro: 'Your stack evolves continuously as models and pricing update. StackSave Premium lets you maintain your full audit history and share dynamic reports with your team without limits.',
  },
  {
    eyebrow: 'CONTINUOUS OPPORTUNITY MONITORING',
    subject: "Don't miss the next verified AI savings opportunity",
    headline: "Don't miss the next AI savings opportunity",
    intro: 'Our intelligence engine continuously indexes verified discounts, academic grants, startup credits, and model pricing drops. StackSave Premium delivers these directly to your inbox.',
  },
  {
    eyebrow: 'ADVANCED AI SPEND OPTIMIZATION',
    subject: 'Get more from your StackSave workspace',
    headline: 'Get more from your StackSave workspace',
    intro: 'Scale your AI stack with confidence. StackSave Premium unlocks comprehensive audit tracking, unconstrained collaboration, and early access to our newest intelligence tools.',
  },
];

export async function sendPremiumUpgradeEmail(
  params: SendPremiumUpgradeEmailParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { email, name, userId, sequenceIndex = 0 } = params;

  if (!email || !email.includes('@')) {
    console.warn(`[EmailService] Invalid or missing recipient email for upgrade campaign: "${email}". Skipping.`);
    return { success: false, error: 'Invalid recipient email' };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn('[EmailService] RESEND_API_KEY not configured. Skipping premium upgrade email dispatch.');
    return { success: false, error: 'Resend API key not configured' };
  }

  const appUrl = getFrontendUrl();
  const pricingUrl = `${appUrl}/#pricing`;
  const from = getSenderAddress();

  const variant = UPGRADE_EMAIL_VARIANTS[sequenceIndex % UPGRADE_EMAIL_VARIANTS.length];
  const subject = variant.subject;

  // Unsubscribe token for promotional/upgrade emails
  const unsubToken = userId ? generateUnsubscribeToken(userId) : '';
  const unsubUrl = unsubToken ? `${appUrl}/api/user/unsubscribe?token=${unsubToken}&type=upgrade` : '';
  const unsubLinkHtml = unsubUrl
    ? `<a href="${unsubUrl}" target="_blank" rel="noopener noreferrer" style="color: #71717A; text-decoration: underline;">Unsubscribe from promotional emails</a>`
    : '';

  const firstName = name ? name.trim().split(' ')[0] : '';
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';

  // Plaintext fallback
  const textContent = `
StackSave — AI Spend Intelligence
${variant.eyebrow}

${variant.headline}

${greeting}

${variant.intro}

KEY PREMIUM BENEFITS:

01 Unlimited audit history
Keep your important AI spend analysis available without the Free-plan saved-audit limit.

02 Unlimited audit sharing
Share more audit results with your team without the Free-plan share-link limit.

03 Premium AI savings opportunities
Discover additional verified AI savings opportunities and receive the 48-hour AI Savings Brief.

04 Early access
Get access to selected new StackSave intelligence features earlier.

Upgrade to Premium: ${pricingUrl}

---
Privacy: ${appUrl}/privacy | Terms: ${appUrl}/terms
${unsubUrl ? `Unsubscribe: ${unsubUrl}` : ''}
StackSave — stacksaveai.com
`.trim();

  // HTML content adhering strictly to Editorial Black + White + Emerald
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${variant.headline}</title>
  <style>
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F4F4F5; font-family: ${FONT_STACK}; color: #0A0A0F; }
    a { color: inherit; }
    .cta-button:hover { background-color: #18181B !important; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-cell { padding: 24px 20px !important; }
      .header-cell { padding: 20px 20px 16px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: ${FONT_STACK};">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F4F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Card -->
        <table role="presentation" class="email-container" width="580" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">

          <!-- Header -->
          ${renderEmailHeader(variant.eyebrow)}

          <!-- Body -->
          <tr>
            <td class="content-cell" style="padding: 32px 32px 28px 32px; background-color: #FFFFFF;">

              <!-- Editorial Eyebrow -->
              <div style="font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 0.08em; text-transform: uppercase; font-family: ${FONT_STACK}; margin-bottom: 10px;">
                ${variant.eyebrow}
              </div>

              <!-- Main Headline -->
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #0A0A0F; letter-spacing: -0.03em; line-height: 1.25; font-family: ${FONT_STACK};">
                ${variant.headline}
              </h1>

              <!-- Greeting & Personalization -->
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #0A0A0F; font-family: ${FONT_STACK};">
                ${greeting}
              </p>

              <!-- Intro copy -->
              <p style="margin: 0 0 28px 0; font-size: 14px; color: #52525B; line-height: 1.6; font-family: ${FONT_STACK};">
                ${variant.intro}
              </p>

              <!-- Editorial Benefits List -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 24px;">
                <!-- Benefit 01 -->
                <tr>
                  <td style="padding-bottom: 18px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="top" style="width: 32px; font-size: 13px; font-weight: 800; color: #10B981; font-family: ${FONT_STACK}; line-height: 1.4;">
                          01
                        </td>
                        <td valign="top">
                          <div style="font-size: 14px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; margin-bottom: 3px;">
                            Unlimited audit history
                          </div>
                          <div style="font-size: 13px; color: #71717A; line-height: 1.5; font-family: ${FONT_STACK};">
                            Keep your important AI spend analysis available without the Free-plan saved-audit limit.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="border-top: 1px solid #E4E4E7; padding-bottom: 18px;"></td></tr>

                <!-- Benefit 02 -->
                <tr>
                  <td style="padding-bottom: 18px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="top" style="width: 32px; font-size: 13px; font-weight: 800; color: #10B981; font-family: ${FONT_STACK}; line-height: 1.4;">
                          02
                        </td>
                        <td valign="top">
                          <div style="font-size: 14px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; margin-bottom: 3px;">
                            Unlimited audit sharing
                          </div>
                          <div style="font-size: 13px; color: #71717A; line-height: 1.5; font-family: ${FONT_STACK};">
                            Share more audit results with your team without the Free-plan share-link limit.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="border-top: 1px solid #E4E4E7; padding-bottom: 18px;"></td></tr>

                <!-- Benefit 03 -->
                <tr>
                  <td style="padding-bottom: 18px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="top" style="width: 32px; font-size: 13px; font-weight: 800; color: #10B981; font-family: ${FONT_STACK}; line-height: 1.4;">
                          03
                        </td>
                        <td valign="top">
                          <div style="font-size: 14px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; margin-bottom: 3px;">
                            Premium AI opportunities
                          </div>
                          <div style="font-size: 13px; color: #71717A; line-height: 1.5; font-family: ${FONT_STACK};">
                            Discover additional verified AI savings opportunities and receive the 48-hour AI Savings Brief.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="border-top: 1px solid #E4E4E7; padding-bottom: 18px;"></td></tr>

                <!-- Benefit 04 -->
                <tr>
                  <td style="padding-bottom: 6px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="top" style="width: 32px; font-size: 13px; font-weight: 800; color: #10B981; font-family: ${FONT_STACK}; line-height: 1.4;">
                          04
                        </td>
                        <td valign="top">
                          <div style="font-size: 14px; font-weight: 700; color: #0A0A0F; font-family: ${FONT_STACK}; margin-bottom: 3px;">
                            Early access
                          </div>
                          <div style="font-size: 13px; color: #71717A; line-height: 1.5; font-family: ${FONT_STACK};">
                            Get access to selected new StackSave features and intelligence tools earlier.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Single Primary CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 20px 0;">
                <tr>
                  <td align="left" style="border-radius: 8px; background-color: #0A0D14;">
                    <a href="${pricingUrl}" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; background-color: #0A0D14; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 8px; letter-spacing: 0.01em; font-family: ${FONT_STACK};">
                      Upgrade to Premium <span style="color: #10B981; font-weight: 700; margin-left: 4px;">&rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct URL -->
              <p style="margin: 0; font-size: 12px; color: #A1A1AA; line-height: 1.5; font-family: ${FONT_STACK};">
                Explore plan details: <a href="${pricingUrl}" target="_blank" rel="noopener noreferrer" style="color: #71717A; text-decoration: underline;">${pricingUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          ${renderEmailFooter(appUrl, unsubLinkHtml)}

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
      console.error('[EmailService] Resend API error sending premium upgrade email:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] ✅ Premium upgrade email sent to ${email} (Resend ID: ${data?.id}, sequence: ${sequenceIndex})`);
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] Unexpected error sending premium upgrade email:', msg);
    return { success: false, error: msg };
  }
}
