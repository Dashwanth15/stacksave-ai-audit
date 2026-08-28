// ============================================================
// Email Service — StackSave AI Audit
// Uses Resend to send transactional confirmation emails.
// Free tier: 3,000 emails/month — more than enough for MVP.
// ============================================================

import { Resend } from 'resend';

function getResendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY || '');
}

interface SendAuditConfirmationParams {
  email: string;
  auditId: string;
  publicUrl: string;
  monthlySavings: number;
  annualSavings: number;
  isHighSavings: boolean;
  companyName?: string;
}

export async function sendAuditConfirmation(params: SendAuditConfirmationParams): Promise<void> {
  const {
    email,
    publicUrl,
    monthlySavings,
    annualSavings,
    isHighSavings,
    companyName,
  } = params;

  const resend = getResendClient();



  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f1a; color: #f8fafc; margin: 0; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #818cf8; margin: 0;">StackSave</h1>
          <p style="color: #94a3b8; margin: 4px 0 0;">AI Spend Audit</p>
        </div>

        <!-- Main card -->
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Your audit is ready${companyName ? `, ${companyName}` : ''} 🎉</h2>
          <p style="color: #94a3b8; margin: 0 0 24px; font-size: 15px;">Here's what we found in your AI stack:</p>

          <!-- Savings highlight -->
          <div style="background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Potential Monthly Savings</p>
            <p style="font-size: 40px; font-weight: 800; color: #34d399; margin: 0;">${monthlySavings > 0 ? `$${monthlySavings.toLocaleString()}` : 'You\'re Optimal'}</p>
            ${monthlySavings > 0 ? `<p style="color: #94a3b8; font-size: 14px; margin: 4px 0 0;">$${annualSavings.toLocaleString()}/year</p>` : ''}
          </div>



          <!-- CTA -->
          <div style="text-align: center; margin-top: 24px;">
            <a href="${publicUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">View Full Audit Report →</a>
          </div>
          
          <p style="color: #64748b; font-size: 12px; text-align: center; margin: 20px 0 0;">
            Share your audit: <a href="${publicUrl}" style="color: #818cf8;">${publicUrl}</a>
          </p>
        </div>

        <!-- Footer -->
        <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 24px;">
          StackSave · AI Spend Intelligence & Optimization Platform
        </p>
      </div>
    </body>
    </html>
  `;

  const { data, error } = await resend.emails.send({
    from: 'StackSave <onboarding@resend.dev>',
    to: email,
    subject: monthlySavings > 0
      ? `Your audit found $${monthlySavings.toLocaleString()}/mo in AI savings`
      : 'Your StackSave audit is ready',
    html,
  });

  if (error) {
    console.error('❌ Resend API error:', JSON.stringify(error));
    throw new Error(error.message);
  }

  console.log('✅ Email sent to', email, '— Resend ID:', data?.id);
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

export async function sendReAuditNotification(params: SendReAuditNotificationParams): Promise<void> {
  const {
    email,
    comparisonUrl,
    companyName,
    changedToolsSummary,
    savingsDelta,
    oldSavings,
    newSavings,
  } = params;

  const resend = getResendClient();

  const deltaText = savingsDelta > 0 
    ? `increased by $${savingsDelta.toLocaleString()}/mo`
    : savingsDelta < 0
      ? `decreased by $${Math.abs(savingsDelta).toLocaleString()}/mo`
      : 'remained unchanged';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f1a; color: #f8fafc; margin: 0; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #818cf8; margin: 0;">StackSave</h1>
          <p style="color: #94a3b8; margin: 4px 0 0;">AI Spend Audit Updates</p>
        </div>

        <!-- Main card -->
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">Provider pricing updates affected your AI stack${companyName ? `, ${companyName}` : ''}</h2>
          <p style="color: #94a3b8; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
            We detected pricing changes from your AI tooling providers. Your potential monthly savings have <strong>${deltaText}</strong>.
          </p>

          <!-- Metrics Comparison Box -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <span style="color: #6b7b93; font-size: 12px; text-transform: uppercase;">Previous Savings</span>
                  <div style="font-size: 20px; font-weight: 700; color: #94a3b8; margin-top: 4px;">$${oldSavings.toLocaleString()}/mo</div>
                </td>
                <td style="width: 50%; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-left: 16px;">
                  <span style="color: #6b7b93; font-size: 12px; text-transform: uppercase;">Current Savings</span>
                  <div style="font-size: 20px; font-weight: 700; color: #34d399; margin-top: 4px;">$${newSavings.toLocaleString()}/mo</div>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top: 12px;">
                  <span style="color: #6b7b93; font-size: 12px; text-transform: uppercase;">Savings Delta</span>
                  <div style="font-size: 18px; font-weight: 700; color: ${savingsDelta >= 0 ? '#34d399' : '#fbbf24'}; margin-top: 4px;">
                    ${savingsDelta >= 0 ? '+' : ''}$${savingsDelta.toLocaleString()}/mo
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Changed Tools List -->
          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 14px; color: #818cf8; text-transform: uppercase; margin: 0 0 8px;">Changed Tool Pricing Models</h3>
            <p style="color: #d4deea; font-size: 14px; line-height: 1.5; margin: 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px 16px; font-family: monospace;">
              ${changedToolsSummary}
            </p>
          </div>

          <!-- CTA -->
          <div style="text-align: center; margin-top: 28px;">
            <a href="${comparisonUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">View Detailed Re-Audit Comparison →</a>
          </div>
          
        </div>

        <!-- Footer -->
        <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 24px;">
          StackSave · AI Spend Intelligence & Optimization Platform
        </p>
      </div>
    </body>
    </html>
  `;

  const { data, error } = await resend.emails.send({
    from: 'StackSave <onboarding@resend.dev>',
    to: email,
    subject: `⚠️ StackSave Re-Audit Alert: Your potential savings ${deltaText}`,
    html,
  });

  if (error) {
    console.error('❌ Resend API error sending re-audit alert:', JSON.stringify(error));
    throw new Error(error.message);
  }

  console.log('✅ Re-audit notification email sent to', email, '— Resend ID:', data?.id);
}
