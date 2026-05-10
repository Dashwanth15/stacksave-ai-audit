import jsPDF from 'jspdf';
import type { AuditResult } from '../types';

export function generateAuditPDF(audit: AuditResult): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  
  let yPosition = margin;

  // Premium SaaS color palette - Stripe/Linear inspired
  const brandColor = [99, 102, 241]; // Indigo-500
  const brandDark = [79, 70, 229]; // Indigo-600
  const primaryColor = [30, 41, 59]; // Slate-900
  const secondaryColor = [71, 85, 105]; // Slate-600
  const mutedColor = [148, 163, 184]; // Slate-400
  const accentDark = [5, 150, 105]; // Emerald-600
  const lineColor = [226, 232, 240]; // Slate-200
  const bgWhite = [255, 255, 255]; // White
  const borderSubtle = [241, 245, 249]; // Slate-100

  // Helper: Add text with consistent styling
  const addText = (text: string | string[], x: number, y: number, fontSize: number, color: number[] = primaryColor, isBold = false, align: 'left' | 'center' = 'left') => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(text, x, y, { align });
  };

  // Helper: Add card with white background and subtle border
  const addCard = (y: number, height: number, borderColor: number[] = borderSubtle) => {
    doc.setFillColor(bgWhite[0], bgWhite[1], bgWhite[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, height, 6, 6, 'FD');
  };

  // Helper: Add subtle horizontal line
  const addLine = (y: number, color: number[] = lineColor, width = 0.5) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(width);
    doc.line(margin, y, pageWidth - margin, y);
  };

  // Helper: Check page break
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // ── HEADER SECTION ────────────────────────────────────────
  yPosition += 8;

  addText('StackSave', pageWidth / 2, yPosition, 32, brandDark, true, 'center');
  yPosition += 6;
  
  addText('AI Stack Optimization Report', pageWidth / 2, yPosition, 11, secondaryColor, false, 'center');
  yPosition += 5;
  
  const date = new Date(audit.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  addText(date, pageWidth / 2, yPosition, 9, mutedColor, false, 'center');
  yPosition += 12;

  // Brand accent line
  doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setLineWidth(2);
  doc.line(margin + 30, yPosition, pageWidth - margin - 30, yPosition);
  yPosition += 18;

  // ── HERO METRICS SECTION ───────────────────────────────────
  checkPageBreak(75);

  if (!audit.isAlreadyOptimal) {
    // Premium card for hero section
    const heroHeight = 70;
    addCard(yPosition, heroHeight);
    yPosition += 12;

    // Large centered savings number
    addText('$' + audit.estimatedMonthlySavings.toLocaleString(), pageWidth / 2, yPosition, 42, accentDark, true, 'center');
    yPosition += 8;
    
    addText('Potential Monthly Recovery', pageWidth / 2, yPosition, 10, secondaryColor, false, 'center');
    yPosition += 14;

    // Supporting metrics in compact row
    addText('$' + audit.estimatedAnnualSavings.toLocaleString() + '/yr · ' + audit.savingsPercentage + '% off', pageWidth / 2, yPosition, 11, primaryColor, true, 'center');
    yPosition += 10;

    // Spend comparison
    addText('$' + audit.totalMonthlySpend.toLocaleString() + '/mo → $' + audit.optimizedMonthlySpend.toLocaleString() + '/mo', pageWidth / 2, yPosition, 10, brandColor, false, 'center');
    yPosition += 12;
  } else {
    const heroHeight = 50;
    addCard(yPosition, heroHeight);
    yPosition += 12;
    addText('Your stack is well optimized', pageWidth / 2, yPosition, 20, accentDark, true, 'center');
    yPosition += 6;
    addText('No significant optimization opportunities identified', pageWidth / 2, yPosition, 10, secondaryColor, false, 'center');
    yPosition += 12;
  }

  yPosition += 12;

  // ── AI SUMMARY SECTION ───────────────────────────────────────
  if (audit.aiSummary) {
    checkPageBreak(50);
    
    addText('AI Summary', margin, yPosition, 13, brandDark, true);
    yPosition += 8;

    // Premium card for AI summary
    const summaryLines = doc.splitTextToSize(audit.aiSummary, contentWidth - 20);
    const summaryHeight = summaryLines.length * 5 + 24;
    addCard(yPosition, summaryHeight);
    
    addText(summaryLines, margin + 10, yPosition + 10, 10, secondaryColor);
    yPosition += summaryHeight + 18;
  }

  // ── RECOMMENDATIONS SECTION ─────────────────────────────────
  const insightsWithSavings = audit.insights.filter(i => i.potentialMonthlySaving > 0);
  
  if (insightsWithSavings.length > 0) {
    checkPageBreak(35);
    
    addText('Optimization Recommendations', margin, yPosition, 13, brandDark, true);
    yPosition += 6;
    addText(insightsWithSavings.length + ' opportunity' + (insightsWithSavings.length > 1 ? 'ies' : '') + ' identified', margin, yPosition, 9, mutedColor);
    yPosition += 12;

    insightsWithSavings.slice(0, 10).forEach((insight, index) => {
      checkPageBreak(42);

      // Premium card for each recommendation
      const cardHeight = 38;
      addCard(yPosition, cardHeight);
      
      let innerY = yPosition + 8;

      // Tool name and savings badge
      addText((index + 1) + '. ' + insight.toolName, margin + 10, innerY, 11, primaryColor, true);
      innerY += 6;
      
      // Savings badge with accent
      addText('Recover $' + insight.potentialMonthlySaving.toLocaleString() + '/mo', margin + 10, innerY, 9, accentDark, true);
      innerY += 6;

      // Issue description
      const issueLines = doc.splitTextToSize(insight.message, contentWidth - 28);
      addText(issueLines, margin + 10, innerY, 9, secondaryColor);
      innerY += issueLines.length * 4 + 5;

      // Recommendation with brand accent
      addText('→ ' + insight.suggestion, margin + 10, innerY, 9, brandColor, false);
      
      yPosition += cardHeight + 8;
    });

    if (insightsWithSavings.length > 10) {
      addText('+ ' + (insightsWithSavings.length - 10) + ' more recommendations', margin, yPosition, 9, mutedColor);
      yPosition += 12;
    }

    yPosition += 12;
  }

  // ── TOOL BREAKDOWN SECTION ─────────────────────────────────
  if (audit.tools && audit.tools.length > 0) {
    checkPageBreak(35);
    
    addText('Tool Breakdown', margin, yPosition, 13, brandDark, true);
    yPosition += 10;

    audit.tools.slice(0, 8).forEach((tool: any) => {
      checkPageBreak(20);

      const toolName = tool.name || tool.toolName || 'Tool';
      const plan = tool.plan || tool.selectedPlan || 'Standard';
      const spend = tool.monthlySpend || tool.spend || 0;

      addText(toolName, margin, yPosition, 10, primaryColor, true);
      yPosition += 4;
      addText('Plan: ' + plan + ' · $' + spend.toLocaleString() + '/mo', margin, yPosition, 9, secondaryColor);
      yPosition += 8;
    });

    if (audit.tools.length > 8) {
      addText('+ ' + (audit.tools.length - 8) + ' additional tools', margin, yPosition, 9, mutedColor);
      yPosition += 12;
    }

    yPosition += 12;
  }

  // ── FOOTER SECTION ──────────────────────────────────────────
  checkPageBreak(30);

  addLine(yPosition, brandColor, 1);
  yPosition += 10;

  addText('Generated by StackSave AI Audit', margin, yPosition, 8, mutedColor);
  yPosition += 4;
  addText('Audit ID: ' + audit.auditId, margin, yPosition, 8, mutedColor);
  yPosition += 4;
  
  const companyDisplay = audit.companyName || 'Your Company';
  addText(companyDisplay + ' · Team Size: ' + audit.teamSize, margin, yPosition, 8, mutedColor);
  yPosition += 6;

  addText('Powered by Credex · Discounted AI Infrastructure Credits', margin, yPosition, 8, mutedColor);

  // ── SAVE PDF ────────────────────────────────────────────────
  const fileName = `stacksave-audit-${audit.auditId.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
