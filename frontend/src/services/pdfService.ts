import jsPDF from 'jspdf';
import type { AuditResult, ToolEntry, AuditDiff } from '../types';

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
  const insightsWithSavings = (audit.insights || []).filter(i => i.potentialMonthlySaving > 0);
  
  if (insightsWithSavings.length > 0) {
    checkPageBreak(35);
    
    addText('Optimization Recommendations', margin, yPosition, 13, brandDark, true);
    yPosition += 6;
    addText(insightsWithSavings.length + ' opportunity' + (insightsWithSavings.length > 1 ? 'ies' : '') + ' identified', margin, yPosition, 9, mutedColor);
    yPosition += 12;

    insightsWithSavings.slice(0, 10).forEach((insight, index) => {
      // Split texts to compute dynamic height
      const issueLines = doc.splitTextToSize(insight.message, contentWidth - 28);
      const suggestionLines = doc.splitTextToSize('→ ' + insight.suggestion, contentWidth - 28);

      // Compute dynamic card height:
      // - static spaces/padding = 32
      const dynamicCardHeight = 32 + (issueLines.length * 4) + (suggestionLines.length * 4);

      checkPageBreak(dynamicCardHeight + 8);

      // Premium card for each recommendation
      addCard(yPosition, dynamicCardHeight);
      
      let innerY = yPosition + 8;

      // Tool name
      addText((index + 1) + '. ' + insight.toolName, margin + 10, innerY, 11, primaryColor, true);
      innerY += 8;
      
      // Savings badge with accent
      addText('Recover $' + insight.potentialMonthlySaving.toLocaleString() + '/mo', margin + 10, innerY, 9, accentDark, true);
      innerY += 8;

      // Issue description
      addText(issueLines, margin + 10, innerY, 9, secondaryColor);
      innerY += (issueLines.length * 4) + 4;

      // Recommendation with brand accent
      addText(suggestionLines, margin + 10, innerY, 9, brandColor, false);
      
      yPosition += dynamicCardHeight + 8;
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

    audit.tools.slice(0, 8).forEach((tool: ToolEntry) => {
      checkPageBreak(20);

      const toolName = tool.toolId;
      const plan = tool.plan;
      const spend = tool.monthlySpend;

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
  const auditIdSafe = audit.auditId || 'draft';
  const fileName = `stacksave-audit-${auditIdSafe.slice(0, 8)}.pdf`;
  doc.save(fileName);
}

export function generateReAuditDiffPDF(oldAudit: AuditResult, newAudit: AuditResult, diff: AuditDiff): void {
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
  const dangerDark = [220, 38, 38]; // Rose-600
  const warningDark = [217, 119, 6]; // Amber-600
  const lineColor = [226, 232, 240]; // Slate-200
  const bgWhite = [255, 255, 255]; // White
  const borderSubtle = [241, 245, 249]; // Slate-100

  // Helper: Add text with consistent styling
  const addText = (text: string | string[], x: number, y: number, fontSize: number, color: number[] = primaryColor, isBold = false, align: 'left' | 'center' | 'right' = 'left') => {
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
  addText('AI Re-Audit Comparison Report', pageWidth / 2, yPosition, 11, secondaryColor, false, 'center');
  yPosition += 5;
  const dateStr = `Original: ${new Date(oldAudit.createdAt).toLocaleDateString()}  ·  Re-audited: ${new Date(newAudit.createdAt).toLocaleDateString()}`;
  addText(dateStr, pageWidth / 2, yPosition, 9, mutedColor, false, 'center');
  yPosition += 12;

  // Brand accent line
  doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setLineWidth(2);
  doc.line(margin + 30, yPosition, pageWidth - margin - 30, yPosition);
  yPosition += 18;

  // ── SAVINGS DELTA HERO SECTION ───────────────────────────
  checkPageBreak(75);
  const heroHeight = 65;
  addCard(yPosition, heroHeight);
  yPosition += 12;

  const deltaText = diff.savingsDelta > 0 
    ? `+$${diff.savingsDelta.toLocaleString()}/mo` 
    : diff.savingsDelta < 0 
      ? `-$${Math.abs(diff.savingsDelta).toLocaleString()}/mo` 
      : `$0.00/mo`;
  const deltaColor = diff.savingsDelta > 0 ? accentDark : diff.savingsDelta < 0 ? warningDark : secondaryColor;

  addText(deltaText, pageWidth / 2, yPosition, 38, deltaColor, true, 'center');
  yPosition += 8;
  addText('Pricing Impact Summary', pageWidth / 2, yPosition, 10, secondaryColor, false, 'center');
  yPosition += 14;

  addText(`v1 Original Savings: $${diff.oldSavings.toLocaleString()}/mo   ·   v${newAudit.auditVersion || 2} New Savings: $${diff.newSavings.toLocaleString()}/mo`, pageWidth / 2, yPosition, 10, primaryColor, true, 'center');
  yPosition += 18;

  // ── PRICING ADJUSTMENTS SECTION ───────────────────────────
  if (diff.pricingDiffs && diff.pricingDiffs.length > 0) {
    checkPageBreak(35);
    addText('Pricing Model Adjustments', margin, yPosition, 13, brandDark, true);
    yPosition += 10;

    diff.pricingDiffs.forEach((item) => {
      checkPageBreak(25);
      addCard(yPosition, 20);
      
      const changeText = item.monthlyDelta > 0 ? 'Price Increase' : 'Price Drop';
      const changeColor = item.monthlyDelta > 0 ? warningDark : accentDark;
      
      addText(`${item.toolName} - ${item.planLabel}`, margin + 8, yPosition + 7, 10, primaryColor, true);
      addText(`${changeText}: $${item.oldMonthlyPrice.toLocaleString()}/mo -> $${item.newMonthlyPrice.toLocaleString()}/mo`, margin + 8, yPosition + 13, 9, secondaryColor);
      
      const deltaSign = item.monthlyDelta > 0 ? '+' : '';
      addText(`${deltaSign}$${item.monthlyDelta.toLocaleString()}/mo`, pageWidth - margin - 8, yPosition + 11, 10, changeColor, true, 'right');
      
      yPosition += 26;
    });
    yPosition += 6;
  }

  // ── RECOMMENDATIONS DIFF SECTION ──────────────────────────
  const addedRecs = diff.recommendationDiffs.filter(r => r.status === 'added');
  const changedRecs = diff.recommendationDiffs.filter(r => r.status === 'changed');
  const removedRecs = diff.recommendationDiffs.filter(r => r.status === 'removed');

  if (addedRecs.length > 0 || changedRecs.length > 0 || removedRecs.length > 0) {
    checkPageBreak(30);
    addText('Actionable Recommendations Diff', margin, yPosition, 13, brandDark, true);
    yPosition += 12;

    // Added
    if (addedRecs.length > 0) {
      checkPageBreak(20);
      addText(`New Recommendations Added (${addedRecs.length})`, margin, yPosition, 10, accentDark, true);
      yPosition += 6;

      addedRecs.forEach((rec, idx) => {
        const msg = rec.newInsight?.message || '';
        const sug = rec.newInsight?.suggestion || '';
        const msgLines = doc.splitTextToSize(msg, contentWidth - 20);
        const sugLines = doc.splitTextToSize('Suggested Action: ' + sug, contentWidth - 20);
        const cardHeight = 22 + (msgLines.length * 4) + (sugLines.length * 4);

        checkPageBreak(cardHeight + 6);
        addCard(yPosition, cardHeight);
        
        addText(`${idx + 1}. ${rec.toolName} (Added)`, margin + 8, yPosition + 6, 10, primaryColor, true);
        addText(msgLines, margin + 8, yPosition + 12, 9, secondaryColor);
        addText(sugLines, margin + 8, yPosition + 12 + (msgLines.length * 4) + 2, 9, brandColor, true);
        
        if (rec.newInsight && rec.newInsight.potentialMonthlySaving > 0) {
          addText(`+$${rec.newInsight.potentialMonthlySaving.toLocaleString()}/mo`, pageWidth - margin - 8, yPosition + 6, 10, accentDark, true, 'right');
        }

        yPosition += cardHeight + 6;
      });
      yPosition += 6;
    }

    // Changed
    if (changedRecs.length > 0) {
      checkPageBreak(20);
      addText(`Modified Recommendations (${changedRecs.length})`, margin, yPosition, 10, warningDark, true);
      yPosition += 6;

      changedRecs.forEach((rec, idx) => {
        const msg = rec.newInsight?.message || '';
        const oldSav = rec.oldInsight?.potentialMonthlySaving || 0;
        const newSav = rec.newInsight?.potentialMonthlySaving || 0;
        const msgLines = doc.splitTextToSize(msg, contentWidth - 20);
        const detailText = `Savings delta: $${oldSav.toLocaleString()}/mo -> $${newSav.toLocaleString()}/mo`;
        const cardHeight = 22 + (msgLines.length * 4);

        checkPageBreak(cardHeight + 6);
        addCard(yPosition, cardHeight);

        addText(`${idx + 1}. ${rec.toolName} (Modified)`, margin + 8, yPosition + 6, 10, primaryColor, true);
        addText(msgLines, margin + 8, yPosition + 12, 9, secondaryColor);
        addText(detailText, margin + 8, yPosition + 12 + (msgLines.length * 4) + 2, 9, brandColor, true);

        const deltaSign = (rec.savingDelta || 0) > 0 ? '+' : '';
        addText(`${deltaSign}${(rec.savingDelta || 0).toLocaleString()}/mo`, pageWidth - margin - 8, yPosition + 6, 10, (rec.savingDelta || 0) > 0 ? accentDark : warningDark, true, 'right');

        yPosition += cardHeight + 6;
      });
      yPosition += 6;
    }

    // Removed
    if (removedRecs.length > 0) {
      checkPageBreak(20);
      addText(`Recommendations Removed (${removedRecs.length})`, margin, yPosition, 10, dangerDark, true);
      yPosition += 6;

      removedRecs.forEach((rec, idx) => {
        const msg = rec.oldInsight?.message || '';
        const msgLines = doc.splitTextToSize(msg, contentWidth - 20);
        const cardHeight = 20 + (msgLines.length * 4);

        checkPageBreak(cardHeight + 6);
        addCard(yPosition, cardHeight);

        addText(`${idx + 1}. ${rec.toolName} (No Longer Applicable)`, margin + 8, yPosition + 6, 10, secondaryColor, true);
        addText(msgLines, margin + 8, yPosition + 12, 9, mutedColor);

        yPosition += cardHeight + 6;
      });
      yPosition += 6;
    }
  }

  // ── FOOTER SECTION ──────────────────────────────────────────
  checkPageBreak(35);
  addLine(yPosition, brandColor, 1);
  yPosition += 10;

  addText('Generated by StackSave AI Audit Engine', margin, yPosition, 8, mutedColor);
  yPosition += 4;
  addText(`Original Audit ID: ${oldAudit.auditId}  ·  Re-Audit ID: ${newAudit.auditId}`, margin, yPosition, 8, mutedColor);
  yPosition += 4;
  addText(`Company: ${newAudit.companyName || 'Your Company'}  ·  Team Size: ${newAudit.teamSize}`, margin, yPosition, 8, mutedColor);
  yPosition += 6;
  addText('Powered by Credex · Discounted AI Infrastructure Credits', margin, yPosition, 8, mutedColor);

  // ── SAVE PDF ────────────────────────────────────────────────
  const fileName = `stacksave-reaudit-comparison-${newAudit.auditId.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
