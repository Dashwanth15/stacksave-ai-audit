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

  const credexCTA = isHighSavings
    ? `
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: white; margin: 0 0 8px 0; font-size: 18px;">💡 Unlock Even More Savings with Credex</h3>
        <p style="color: rgba(255,255,255,0.9); margin: 0 0 16px 0; font-size: 14px;">
          Your audit shows $${monthlySavings.toLocaleString()}/month in savings opportunity. 
          Credex sources discounted AI credits (Cursor, Claude, ChatGPT Enterprise) from companies 
          that overforecast — the same infrastructure at 20–40% below retail.
        </p>
        <a href="https://credex.rocks" style="background: white; color: #6366f1; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Book a Free Consultation →</a>
      </div>
    `
    : '';

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

          ${credexCTA}

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
          StackSave · Free AI spend optimization for startups<br>
          <a href="https://credex.rocks" style="color: #6366f1;">Powered by Credex</a>
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
