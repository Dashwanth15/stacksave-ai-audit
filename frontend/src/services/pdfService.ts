import jsPDF from 'jspdf';
import type { AuditResult } from '../types';

export function generateAuditPDF(audit: AuditResult): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  
  let yPosition = margin;

  // Color palette - professional light theme
  const primaryColor = [79, 70, 229]; // Indigo-600
  const textDark = [15, 23, 42]; // Slate-900
  const textMedium = [51, 65, 85]; // Slate-700
  const textLight = [100, 116, 139]; // Slate-500
  const textMuted = [148, 163, 184]; // Slate-400
  const successColor = [5, 150, 105]; // Emerald-600
  const borderLight = [226, 232, 240]; // Slate-200
  const backgroundLight = [248, 250, 252]; // Slate-50

  // Helper functions
  const addText = (text: string | string[], x: number, y: number, fontSize: number, color: number[] = textDark, isBold = false, align: 'left' | 'center' | 'right' = 'left') => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.text(text, x, y, { align });
  };

  const addLine = (y: number, color: number[] = borderLight, lineWidth = 0.3) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(lineWidth);
    doc.line(margin, y, pageWidth - margin, y);
  };

  const addSectionCard = (y: number, height: number) => {
    doc.setFillColor(backgroundLight[0], backgroundLight[1], backgroundLight[2]);
    doc.roundedRect(margin, y, contentWidth, height, 4, 4, 'F');
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // ── HEADER ─────────────────────────────────────────────────
  // Brand section with subtle background
  addSectionCard(yPosition, 45);
  yPosition += 12;

  addText('StackSave', pageWidth / 2, yPosition, 22, primaryColor, true, 'center');
  yPosition += 8;
  
  addText('AI Stack Optimization Report', pageWidth / 2, yPosition, 11, textMedium, false, 'center');
  yPosition += 6;
  
  const date = new Date(audit.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  addText(`Generated ${date}`, pageWidth / 2, yPosition, 9, textMuted, false, 'center');
  yPosition += 10;

  addLine(yPosition, borderLight, 0.5);
  yPosition += 20;

  // ── SAVINGS HERO SECTION ───────────────────────────────────
  checkPageBreak(80);
  
  if (!audit.isAlreadyOptimal) {
    // Centered hero section
    let heroY = yPosition;
    
    // Section label
    addText('SAVINGS SUMMARY', pageWidth / 2, heroY, 9, textLight, true, 'center');
    heroY += 8;

    // Main savings number - large and centered
    addText('$' + audit.estimatedMonthlySavings.toLocaleString(), pageWidth / 2, heroY, 36, successColor, true, 'center');
    heroY += 10;

    // Label below savings
    addText('Potential Monthly Recovery', pageWidth / 2, heroY, 10, textMedium, false, 'center');
    heroY += 12;

    // Secondary metrics in a row
    const metricsY = heroY;
    addText('$' + audit.estimatedAnnualSavings.toLocaleString() + '/year', pageWidth / 2 - 40, metricsY, 11, textDark, true, 'center');
    addText('· ' + audit.savingsPercentage + '% reduction', pageWidth / 2 + 40, metricsY, 11, textDark, true, 'center');
    heroY += 14;

    // Current vs Optimized comparison
    const comparisonY = heroY;
    addText('Current:', pageWidth / 2 - 35, comparisonY, 9, textMuted, false, 'center');
    addText('$' + audit.totalMonthlySpend.toLocaleString() + '/mo', pageWidth / 2 - 35, comparisonY + 6, 10, textMedium, true, 'center');
    
    addText('→', pageWidth / 2, comparisonY + 3, 9, textLight, false, 'center');
    
    addText('Optimized:', pageWidth / 2 + 35, comparisonY, 9, textMuted, false, 'center');
    addText('$' + audit.optimizedMonthlySpend.toLocaleString() + '/mo', pageWidth / 2 + 35, comparisonY + 6, 10, successColor, true, 'center');
    
    yPosition = heroY + 20;
  } else {
    addText('STACK STATUS', pageWidth / 2, yPosition, 9, textLight, true, 'center');
    yPosition += 8;
    addText('Well Optimized', pageWidth / 2, yPosition, 24, successColor, true, 'center');
    yPosition += 8;
    addText('Your AI stack is well-optimized for your team size and use case.', pageWidth / 2, yPosition, 10, textMedium, false, 'center');
    yPosition += 16;
  }

  addLine(yPosition, borderLight, 0.5);
  yPosition += 20;

  // ── AI SUMMARY SECTION ───────────────────────────────────────
  if (audit.aiSummary) {
    checkPageBreak(60);
    
    addText('AI SUMMARY', margin, yPosition, 9, textLight, true);
    yPosition += 10;

    // Card background for AI summary
    const summaryHeight = 35;
    addSectionCard(yPosition, summaryHeight);
    
    addText(audit.aiSummary, margin + 8, yPosition + 10, 10, textMedium, false);
    yPosition += summaryHeight + 15;

    addLine(yPosition, borderLight, 0.5);
    yPosition += 20;
  }

  // ── RECOMMENDATIONS SECTION ───────────────────────────────────
  const insightsWithSavings = audit.insights.filter(i => i.potentialMonthlySaving > 0);
  
  if (insightsWithSavings.length > 0) {
    checkPageBreak(40);
    
    addText('OPTIMIZATION RECOMMENDATIONS', margin, yPosition, 9, textLight, true);
    yPosition += 6;
    addText(insightsWithSavings.length + ' actionable opportunity' + (insightsWithSavings.length > 1 ? 'ies' : '') + ' identified', margin, yPosition, 9, textMuted);
    yPosition += 12;

    insightsWithSavings.slice(0, 10).forEach((insight, index) => {
      checkPageBreak(50);

      // Card for each recommendation
      const cardY = yPosition;
      const cardHeight = 38;
      addSectionCard(cardY, cardHeight);
      
      let innerY = cardY + 8;
      
      // Number and tool name
      addText((index + 1).toString() + '.', margin + 6, innerY, 10, primaryColor, true);
      addText(insight.toolName, margin + 18, innerY, 11, textDark, true);
      innerY += 7;

      // Savings badge
      addText('Recover $' + insight.potentialMonthlySaving.toLocaleString() + '/mo', margin + 6, innerY, 9, successColor, true);
      innerY += 6;

      // Issue description
      const issueText = doc.splitTextToSize(insight.message, contentWidth - 16);
      addText(issueText, margin + 6, innerY, 9, textMedium);
      innerY += issueText.length * 4 + 4;

      // Recommendation
      addText('Action:', margin + 6, innerY, 8, primaryColor, true);
      innerY += 3;
      const recText = doc.splitTextToSize(insight.suggestion, contentWidth - 24);
      addText(recText, margin + 12, innerY, 9, textMedium);
      
      yPosition = cardY + cardHeight + 8;
    });

    if (insightsWithSavings.length > 10) {
      addText('+ ' + (insightsWithSavings.length - 10) + ' more recommendations', margin, yPosition, 9, textMuted, true);
      yPosition += 12;
    }

    addLine(yPosition, borderLight, 0.5);
    yPosition += 20;
  }

  // ── TOOL BREAKDOWN SECTION ────────────────────────────────────
  if (audit.tools && audit.tools.length > 0) {
    checkPageBreak(40);
    
    addText('TOOL BREAKDOWN', margin, yPosition, 9, textLight, true);
    yPosition += 10;

    audit.tools.slice(0, 8).forEach((tool: any, index: number) => {
      checkPageBreak(25);

      const toolName = tool.name || tool.toolName || `Tool ${index + 1}`;
      const plan = tool.plan || tool.selectedPlan || 'Standard Plan';
      const spend = tool.monthlySpend || tool.spend || 0;

      addText(toolName, margin, yPosition, 10, textDark, true);
      yPosition += 5;
      addText('Plan: ' + plan + '  ·  Spend: $' + spend.toLocaleString() + '/mo', margin, yPosition, 9, textMedium);
      yPosition += 8;
    });

    if (audit.tools.length > 8) {
      addText('+ ' + (audit.tools.length - 8) + ' more tools', margin, yPosition, 9, textMuted);
      yPosition += 12;
    }

    addLine(yPosition, borderLight, 0.5);
    yPosition += 20;
  }

  // ── FOOTER ───────────────────────────────────────────────────
  checkPageBreak(35);

  addLine(yPosition, borderLight, 0.5);
  yPosition += 10;

  addText('Generated by StackSave AI Audit', margin, yPosition, 8, textMuted);
  yPosition += 5;
  addText('Audit ID: ' + audit.auditId, margin, yPosition, 8, textMuted);
  yPosition += 5;
  
  const companyDisplay = audit.companyName || 'Your AI Stack';
  addText(companyDisplay + ' · Team Size: ' + audit.teamSize, margin, yPosition, 8, textMuted);
  yPosition += 8;

  addText('Powered by Credex · Discounted AI Infrastructure Credits', margin, yPosition, 8, textMuted);

  // ── SAVE PDF ─────────────────────────────────────────────────
  const fileName = `stacksave-audit-${audit.auditId.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
