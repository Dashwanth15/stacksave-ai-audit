// ============================================================
// Email Service — StackSave AI Audit
// Production Transactional Email Delivery via Resend SDK
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

/**
 * Send an ultra-premium Audit Confirmation & Report email.
 */
export async function sendAuditConfirmation(params: SendAuditConfirmationParams): Promise<{ success: boolean; id?: string; error?: string }> {
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

This audit was generated by StackSave (https://stacksaveai.com).
Your data is private, isolated, and encrypted.
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
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #0F172A;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container (580px max) -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);">
          
          <!-- Top Brand Header Bar -->
          <tr>
            <td style="background-color: #0F172A; padding: 24px 32px; border-bottom: 1px solid #1E293B;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #1E293B; border: 1px solid #334155; border-radius: 8px; padding: 6px 12px;">
                          <span style="font-size: 13px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.06em; text-transform: uppercase;">
                            <span style="color: #10B981;">●</span> STACKSAVE
                          </span>
                        </td>
                        <td style="padding-left: 10px;">
                          <span style="font-size: 11px; font-weight: 600; color: #94A3B8; letter-spacing: 0.04em; text-transform: uppercase;">
                            AI Spend Intelligence
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #64748B; background-color: #1E293B; padding: 4px 8px; border-radius: 6px;">
                      AUDIT #${auditId.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <!-- Greeting & Headline -->
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #0F172A; line-height: 1.25; letter-spacing: -0.02em;">
                Your AI Stack Audit is Complete${companyName ? `, ${companyName}` : ''}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748B; line-height: 1.55;">
                We evaluated your AI subscriptions against official vendor pricing models, workflow overlap benchmarks, and optimization candidates.
              </p>

              <!-- Hero Highlight Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px 20px; text-align: center;">
                    <span style="font-size: 11px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">
                      ${monthlySavings > 0 ? 'Potential Monthly Spend Recovery' : 'Stack Efficiency Status'}
                    </span>
                    <div style="font-size: 38px; font-weight: 900; color: #047857; line-height: 1; letter-spacing: -0.03em; margin: 0 0 6px 0;">
                      ${monthlySavings > 0 ? `${formattedMonthly}<span style="font-size: 18px; font-weight: 700; color: #059669;">/mo</span>` : 'Optimally Configured'}
                    </div>
                    ${monthlySavings > 0 ? `
                    <div style="font-size: 13px; font-weight: 600; color: #065F46;">
                      ≈ ${formattedAnnual} / year projected savings${pct > 0 ? ` (${pct}% spend reduction)` : ''}
                    </div>` : `
                    <div style="font-size: 13px; font-weight: 600; color: #065F46;">
                      Zero redundant subscriptions detected in your evaluated stack.
                    </div>`}
                  </td>
                </tr>
              </table>

              <!-- Multi-metric Overview Table -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 28px;">
                <tr>
                  ${formattedTotal ? `
                  <td style="padding: 14px 16px; border-right: 1px solid #E2E8F0; text-align: center; width: 33%;">
                    <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Current Spend</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0F172A;">${formattedTotal}</div>
                  </td>` : ''}
                  ${formattedOptimized ? `
                  <td style="padding: 14px 16px; ${toolCount ? 'border-right: 1px solid #E2E8F0;' : ''} text-align: center; width: 33%;">
                    <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Optimized Spend</div>
                    <div style="font-size: 15px; font-weight: 800; color: #047857;">${formattedOptimized}</div>
                  </td>` : ''}
                  <td style="padding: 14px 16px; text-align: center; width: 33%;">
                    <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Audit Scope</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0F172A;">
                      ${toolCount ? `${toolCount} Tool${toolCount !== 1 ? 's' : ''}` : `${teamSize || 1} Seat${teamSize !== 1 ? 's' : ''}`}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${publicUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; letter-spacing: -0.01em; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);">
                      View Full Interactive Audit Report &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct Link Fallback -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #F1F5F9; padding-top: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                      Direct report link:<br />
                      <a href="${publicUrl}" target="_blank" rel="noopener noreferrer" style="color: #4F46E5; word-break: break-all; text-decoration: underline; font-weight: 500;">
                        ${publicUrl}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #475569;">
                StackSave &middot; AI Spend Intelligence &amp; Optimization
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #94A3B8; line-height: 1.4;">
                Continuous monitoring across official vendor pricing feeds and subscription tiers.
              </p>
              <p style="margin: 0; font-size: 11px; color: #CBD5E1;">
                &copy; ${new Date().getFullYear()} StackSave. All rights reserved. &middot; <a href="https://stacksaveai.com" target="_blank" rel="noopener noreferrer" style="color: #94A3B8; text-decoration: underline;">stacksaveai.com</a>
              </p>
            </td>
          </tr>

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

/**
 * Send an ultra-premium Re-Audit & Pricing Change Alert email.
 */
export async function sendReAuditNotification(params: SendReAuditNotificationParams): Promise<{ success: boolean; id?: string; error?: string }> {
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
  const deltaText = savingsDelta > 0
    ? `increased by $${Math.round(savingsDelta).toLocaleString()}/mo`
    : savingsDelta < 0
      ? `decreased by $${Math.round(Math.abs(savingsDelta)).toLocaleString()}/mo`
      : 'remained unchanged';

  const deltaFormatted = savingsDelta >= 0
    ? `+$${Math.round(savingsDelta).toLocaleString()}/mo`
    : `-$${Math.round(Math.abs(savingsDelta)).toLocaleString()}/mo`;

  const subject = `⚠️ AI Pricing Update Alert: Your Stack Savings ${deltaText}`;

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

This notification was triggered automatically by StackSave Continuous Intelligence (https://stacksaveai.com).
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
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F172A;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (580px max) -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);">
          
          <!-- Top Alert Header Bar -->
          <tr>
            <td style="background-color: #0F172A; padding: 24px 32px; border-bottom: 1px solid #1E293B;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 6px; padding: 4px 10px;">
                          <span style="font-size: 11px; font-weight: 800; color: #92400E; letter-spacing: 0.06em; text-transform: uppercase;">
                            PRICING ALERT
                          </span>
                        </td>
                        <td style="padding-left: 10px;">
                          <span style="font-size: 12px; font-weight: 700; color: #F1F5F9; letter-spacing: 0.04em;">
                            StackSave Continuous Intelligence
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #94A3B8;">
                      RE-AUDIT
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 21px; font-weight: 800; color: #0F172A; line-height: 1.3; letter-spacing: -0.02em;">
                Provider Pricing Updates Detected for Your Stack${companyName ? `, ${companyName}` : ''}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748B; line-height: 1.55;">
                We detected official pricing modifications from your configured AI providers. Your potential monthly savings have <strong>${deltaText}</strong>.
              </p>

              <!-- Comparison Delta Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px; border-bottom: 1px solid #E2E8F0;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 50%;">
                          <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Previous Savings</span>
                          <span style="font-size: 18px; font-weight: 800; color: #475569;">$${Math.round(oldSavings).toLocaleString()}/mo</span>
                        </td>
                        <td style="width: 50%; padding-left: 16px;">
                          <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Updated Savings</span>
                          <span style="font-size: 18px; font-weight: 800; color: #047857;">$${Math.round(newSavings).toLocaleString()}/mo</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; background-color: #FFFFFF; border-radius: 0 0 12px 12px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">Net Financial Impact</span>
                        </td>
                        <td align="right">
                          <span style="font-size: 16px; font-weight: 900; color: ${savingsDelta >= 0 ? '#047857' : '#D97706'};">
                            ${deltaFormatted}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Changed Vendor Plans -->
              <div style="margin-bottom: 28px;">
                <span style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 8px;">
                  Modified Vendor Plan Details
                </span>
                <div style="background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #334155; font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; line-height: 1.45;">
                  ${changedToolsSummary}
                </div>
              </div>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${comparisonUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; letter-spacing: -0.01em; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);">
                      View Detailed Re-Audit Comparison Diff &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct Link Fallback -->
              <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 1.5; border-top: 1px solid #F1F5F9; padding-top: 16px;">
                Direct link: <a href="${comparisonUrl}" target="_blank" rel="noopener noreferrer" style="color: #4F46E5; word-break: break-all; text-decoration: underline;">${comparisonUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #475569;">
                StackSave &middot; Continuous AI Spend Intelligence
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                &copy; ${new Date().getFullYear()} StackSave &middot; <a href="https://stacksaveai.com" target="_blank" rel="noopener noreferrer" style="color: #94A3B8; text-decoration: underline;">stacksaveai.com</a>
              </p>
            </td>
          </tr>

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

Welcome to StackSave! We are excited to have you on board.

StackSave gives you continuous intelligence on AI model and tool pricing, helping you optimize spend, discover verified partner deals, and eliminate wasted software costs.

Key features you can explore right now:
1. AI Pricing Intelligence: Live tracking of model prices, input/output tokens, and seat costs across major AI providers.
2. Verified AI Deals & Promotions: Authentic promo codes, academic perks, and carrier partner bundles.
3. Build My AI Stack: Intelligent recommendations tailored to your team's workflow and budget.
4. Audit Existing Stack: Upload your tool list for instant overlap detection and migration savings.
5. StackSave Premium: Unlock unlimited saved audits, shareable team reports, and daily deal notifications.

Get started with your dashboard:
${appUrl}

If you have any questions or feedback, reply directly to this email.

Best regards,
The StackSave Team
https://stacksaveai.com
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0F172A; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 36px 32px; text-align: left; border-bottom: 1px solid #334155;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.03em;">
                      Stack<span style="color: #6366F1;">Save</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(99, 102, 241, 0.18); border: 1px solid rgba(99, 102, 241, 0.4); color: #818CF8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 9999px;">
                      Welcome
                    </span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 20px 0 0 0; color: #FFFFFF; font-size: 24px; font-weight: 800; line-height: 1.3; letter-spacing: -0.02em;">
                Welcome to StackSave, ${firstName}!
              </h1>
              <p style="margin: 8px 0 0 0; color: #94A3B8; font-size: 14px; line-height: 1.5;">
                Your intelligent copilot for AI spend management & verified vendor deals.
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                Thanks for joining StackSave. We monitor AI pricing, detect vendor overlaps, and surface authentic cost-saving opportunities so you never overpay for your AI stack.
              </p>

              <!-- Feature Highlights Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px;">
                      What You Can Do Today
                    </div>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">⚡</td>
                        <td style="padding-left: 8px;">
                          <strong style="color: #0F172A; font-size: 13px;">Live AI Pricing Intelligence</strong>
                          <p style="margin: 2px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.4;">Real-time benchmark of models, tokens, and seats across 25+ providers.</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">🏷️</td>
                        <td style="padding-left: 8px;">
                          <strong style="color: #0F172A; font-size: 13px;">Verified AI Deals & Bundles</strong>
                          <p style="margin: 2px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.4;">Curated promo codes, student discounts, and partner perks.</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">🔍</td>
                        <td style="padding-left: 8px;">
                          <strong style="color: #0F172A; font-size: 13px;">Instant Stack Audits</strong>
                          <p style="margin: 2px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.4;">Find tool overlaps, evaluate alternatives, and simulate cost migrations.</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">💎</td>
                        <td style="padding-left: 8px;">
                          <strong style="color: #0F172A; font-size: 13px;">StackSave Premium</strong>
                          <p style="margin: 2px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.4;">Unlimited audit history, shareable reports, and daily deal notifications.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4F46E5; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; letter-spacing: -0.01em; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
                      Launch StackSave Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback -->
              <p style="margin: 0; font-size: 12px; color: #94A3B8; text-align: center;">
                Direct link: <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="color: #6366F1; text-decoration: underline;">${appUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #475569;">
                StackSave &middot; Continuous AI Spend Intelligence
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                &copy; ${new Date().getFullYear()} StackSave &middot; <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="color: #94A3B8; text-decoration: underline;">stacksaveai.com</a>
              </p>
            </td>
          </tr>

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

  const subject = 'StackSave Premium is Now Active! 🚀';

  const textContent = `
Hi ${firstName},

Congratulations! Your StackSave Premium subscription (${planName} Plan) is now active.

Here are the unlocked capabilities available in your account:
- Unlimited Saved Audits: Track, compare, and manage your AI stacks indefinitely.
- Unlimited Shareable Reports: Generate and export branded audit links for your team or leadership.
- Curated AI Deals & Promo Codes: Full access to verified provider promotions and exclusive discounts.
- Daily AI Offers Digest: Receive scheduled email updates with newly verified deals.
- Priority Intelligence & Early Access: Early access to new benchmarking tools and cost calculators.

Explore your Premium benefits:
${appUrl}/offers

Thank you for choosing StackSave. If you need any assistance, simply reply to this email.

Best regards,
The StackSave Team
https://stacksaveai.com
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0F172A; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%); padding: 36px 32px; text-align: left; border-bottom: 1px solid #3730A3;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.03em;">
                      Stack<span style="color: #818CF8;">Save</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(99, 102, 241, 0.25); border: 1px solid rgba(129, 140, 248, 0.5); color: #A5B4FC; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 9999px;">
                      ✨ Premium Active
                    </span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 20px 0 0 0; color: #FFFFFF; font-size: 24px; font-weight: 800; line-height: 1.3; letter-spacing: -0.02em;">
                You're officially a Premium Member!
              </h1>
              <p style="margin: 8px 0 0 0; color: #C7D2FE; font-size: 14px; line-height: 1.5;">
                Plan: <strong style="color: #FFFFFF;">${planName} Membership</strong> &middot; All limits unlocked
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                Hi ${firstName}, your payment was successful and your account has been upgraded to <strong>StackSave Premium</strong>. You now have unrestricted access to all advanced cost intelligence features.
              </p>

              <!-- Premium Feature Grid -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 12px; font-weight: 800; color: #4338CA; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px;">
                      Your Unlocked Premium Features
                    </div>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">💾</td>
                        <td style="padding-left: 8px;">
                          <strong style="color: #0F172A; font-size: 13px;">Unlimited Saved Audits</strong>
                          <p style="margin: 2px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.4;">Save as many audits and stack comparisons as you need without limits.</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">🔗</td>
                        <td style="padding-left: 8px;">
                          <strong style="color: #0F172A; font-size: 13px;">Unlimited Shareable Reports</strong>
                          <p style="margin: 2px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.4;">Generate public or private links to share audit breakdowns with your team.</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">🔥</td>
                        <td style="padding-left: 8px;">
                          <strong style="color: #0F172A; font-size: 13px;">Verified AI Deals & Promo Codes</strong>
                          <p style="margin: 2px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.4;">Full access to locked AI offers, partner deals, and high-value promo codes.</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">📬</td>
                        <td style="padding-left: 8px;">
                          <strong style="color: #0F172A; font-size: 13px;">Daily AI Savings Digest</strong>
                          <p style="margin: 2px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.4;">Direct email alerts whenever newly confirmed AI discounts and partner deals go live.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/offers" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4F46E5; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; letter-spacing: -0.01em; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
                      Explore Verified AI Offers &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback -->
              <p style="margin: 0; font-size: 12px; color: #94A3B8; text-align: center;">
                Direct link: <a href="${appUrl}/offers" target="_blank" rel="noopener noreferrer" style="color: #6366F1; text-decoration: underline;">${appUrl}/offers</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #475569;">
                StackSave &middot; Continuous AI Spend Intelligence
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                &copy; ${new Date().getFullYear()} StackSave &middot; <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="color: #94A3B8; text-decoration: underline;">stacksaveai.com</a>
              </p>
            </td>
          </tr>

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

  const subject = `Your Daily AI Savings Digest — ${offers.length} Verified AI Offers Available`;

  const offersTextList = offers
    .map((o, idx) => {
      const badge = o.isNew ? '[NEW TODAY] ' : o.isUpdated ? '[UPDATED] ' : '';
      const discount = o.discount ? ` (${o.discount})` : o.value ? ` (${o.value})` : '';
      const desc = o.description ? `\n   ${o.description}` : '';
      const link = o.url ? `\n   Link: ${o.url}` : '';
      return `${idx + 1}. ${badge}${o.title}${discount}${desc}${link}`;
    })
    .join('\n\n');

  const textContent = `
Hi ${firstName},

Here is your daily digest of verified AI deals, discounts, and partner bundles currently active on StackSave:

${offersTextList}

View and claim all verified AI offers:
${appUrl}/offers

---
You are receiving this digest because you are an active StackSave Premium member.
To stop receiving daily offer digests, unsubscribe here:
${unsubUrl}

Best regards,
The StackSave Team
https://stacksaveai.com
`.trim();

  // HTML Offers rows
  const offersHtmlRows = offers
    .map((o) => {
      const badgeHtml = o.isNew
        ? `<span style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 4px; margin-right: 6px;">New Today</span>`
        : o.isUpdated
        ? `<span style="display: inline-block; background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 4px; margin-right: 6px;">Updated</span>`
        : '';

      const discountHtml = o.discount || o.value
        ? `<span style="display: inline-block; background-color: #FDF2F8; border: 1px solid #FBCFE8; color: #9D174D; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-left: 6px;">${o.discount || o.value}</span>`
        : '';

      const categoryHtml = o.category
        ? `<span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">${o.category}</span>`
        : '';

      const partnerOrProvider = o.partner ? `${o.partner} &middot; ` : o.provider ? `${o.provider} &middot; ` : '';

      return `
        <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 18px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="margin-bottom: 6px;">
            ${badgeHtml}
            ${categoryHtml ? `<span style="color: #94A3B8; font-size: 11px;">${partnerOrProvider}</span>${categoryHtml}` : ''}
          </div>
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px;">
            <strong style="color: #0F172A; font-size: 14px; line-height: 1.3;">${o.title}</strong>
            ${discountHtml}
          </div>
          ${o.description ? `<p style="margin: 0 0 10px 0; color: #475569; font-size: 12px; line-height: 1.45;">${o.description}</p>` : ''}
          <div style="text-align: right;">
            <a href="${o.url || `${appUrl}/offers`}" target="_blank" rel="noopener noreferrer" style="display: inline-block; color: #4F46E5; font-size: 12px; font-weight: 700; text-decoration: none;">
              View Offer &rarr;
            </a>
          </div>
        </div>
      `;
    })
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0F172A; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px; text-align: left; border-bottom: 1px solid #334155;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.03em;">
                      Stack<span style="color: #6366F1;">Save</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(99, 102, 241, 0.18); border: 1px solid rgba(99, 102, 241, 0.4); color: #818CF8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 9999px;">
                      Daily Digest
                    </span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 18px 0 0 0; color: #FFFFFF; font-size: 22px; font-weight: 800; line-height: 1.3; letter-spacing: -0.02em;">
                Today's Verified AI Deals
              </h1>
              <p style="margin: 6px 0 0 0; color: #94A3B8; font-size: 13px; line-height: 1.5;">
                Curated AI cost-saving opportunities verified on official vendor sites.
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 28px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
                Hi ${firstName}, here are <strong>${offers.length} active AI promotions & savings</strong> available for your stack:
              </p>

              <!-- Offers List -->
              ${offersHtmlRows}

              <!-- CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/offers" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 10px; letter-spacing: -0.01em;">
                      View All Offers in Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FFFFFF; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #475569;">
                StackSave &middot; Continuous AI Spend Intelligence
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #94A3B8;">
                You are receiving this digest because you are an active StackSave Premium member.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                <a href="${unsubUrl}" target="_blank" rel="noopener noreferrer" style="color: #64748B; text-decoration: underline;">
                  Unsubscribe from daily offer digests
                </a>
                &nbsp;&middot;&nbsp;
                <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="color: #64748B; text-decoration: underline;">
                  stacksaveai.com
                </a>
              </p>
            </td>
          </tr>

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

