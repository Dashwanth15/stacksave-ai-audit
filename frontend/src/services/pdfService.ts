import jsPDF from 'jspdf';
import type { AuditResult } from '../types';

export function generateAuditPDF(audit: AuditResult): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  
  let yPosition = margin;

  // Professional document color palette
  const primaryColor = [30, 41, 59]; // Slate-900
  const secondaryColor = [71, 85, 105]; // Slate-600
  const mutedColor = [148, 163, 184]; // Slate-400
  const accentColor = [16, 185, 129]; // Emerald-500
  const lineColor = [226, 232, 240]; // Slate-200

  // Helper: Add text with consistent styling
  const addText = (text: string | string[], x: number, y: number, fontSize: number, color: number[] = primaryColor, isBold = false, align: 'left' | 'center' = 'left') => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(text, x, y, { align });
  };

  // Helper: Add horizontal line
  const addLine = (y: number) => {
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.setLineWidth(0.5);
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
  addText('StackSave AI Audit', pageWidth / 2, yPosition, 24, primaryColor, true, 'center');
  yPosition += 8;
  
  addText('AI Stack Optimization Report', pageWidth / 2, yPosition, 12, secondaryColor, false, 'center');
  yPosition += 6;
  
  const date = new Date(audit.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  addText(date, pageWidth / 2, yPosition, 10, mutedColor, false, 'center');
  yPosition += 15;

  addLine(yPosition);
  yPosition += 25;

  // ── HERO METRICS SECTION ───────────────────────────────────
  checkPageBreak(80);

  if (!audit.isAlreadyOptimal) {
    // Large centered savings number
    addText('$' + audit.estimatedMonthlySavings.toLocaleString(), pageWidth / 2, yPosition, 42, accentColor, true, 'center');
    yPosition += 10;
    
    addText('Potential Monthly Recovery', pageWidth / 2, yPosition, 11, secondaryColor, false, 'center');
    yPosition += 20;

    // Supporting metrics
    addText('$' + audit.estimatedAnnualSavings.toLocaleString() + ' per year', pageWidth / 2, yPosition, 12, primaryColor, true, 'center');
    yPosition += 8;
    
    addText(audit.savingsPercentage + '% reduction in spend', pageWidth / 2, yPosition, 11, secondaryColor, false, 'center');
    yPosition += 15;

    // Spend comparison
    addText('Current Spend: $' + audit.totalMonthlySpend.toLocaleString() + '/mo', pageWidth / 2, yPosition, 10, secondaryColor, false, 'center');
    yPosition += 6;
    addText('Optimized Spend: $' + audit.optimizedMonthlySpend.toLocaleString() + '/mo', pageWidth / 2, yPosition, 10, accentColor, true, 'center');
    yPosition += 20;
  } else {
    addText('Your stack is well optimized', pageWidth / 2, yPosition, 20, accentColor, true, 'center');
    yPosition += 8;
    addText('No significant optimization opportunities identified', pageWidth / 2, yPosition, 11, secondaryColor, false, 'center');
    yPosition += 20;
  }

  addLine(yPosition);
  yPosition += 25;

  // ── AI SUMMARY SECTION ───────────────────────────────────────
  if (audit.aiSummary) {
    checkPageBreak(50);
    
    addText('AI Summary', margin, yPosition, 14, primaryColor, true);
    yPosition += 12;

    const summaryLines = doc.splitTextToSize(audit.aiSummary, contentWidth);
    addText(summaryLines, margin, yPosition, 11, secondaryColor);
    yPosition += summaryLines.length * 6 + 20;

    addLine(yPosition);
    yPosition += 25;
  }

  // ── RECOMMENDATIONS SECTION ─────────────────────────────────
  const insightsWithSavings = audit.insights.filter(i => i.potentialMonthlySaving > 0);
  
  if (insightsWithSavings.length > 0) {
    checkPageBreak(40);
    
    addText('Optimization Recommendations', margin, yPosition, 14, primaryColor, true);
    yPosition += 8;
    addText(insightsWithSavings.length + ' opportunity' + (insightsWithSavings.length > 1 ? 'ies' : '') + ' identified', margin, yPosition, 10, mutedColor);
    yPosition += 15;

    insightsWithSavings.slice(0, 10).forEach((insight, index) => {
      checkPageBreak(45);

      // Tool name and savings
      addText((index + 1) + '. ' + insight.toolName, margin, yPosition, 12, primaryColor, true);
      yPosition += 6;
      
      addText('Recover $' + insight.potentialMonthlySaving.toLocaleString() + '/mo', margin, yPosition, 10, accentColor, true);
      yPosition += 8;

      // Issue description
      const issueLines = doc.splitTextToSize(insight.message, contentWidth);
      addText(issueLines, margin, yPosition, 10, secondaryColor);
      yPosition += issueLines.length * 5 + 6;

      // Recommendation
      addText('Recommended Action:', margin, yPosition, 9, primaryColor, true);
      yPosition += 4;
      
      const recLines = doc.splitTextToSize(insight.suggestion, contentWidth - 10);
      addText(recLines, margin + 10, yPosition, 10, secondaryColor);
      yPosition += recLines.length * 5 + 12;
    });

    if (insightsWithSavings.length > 10) {
      addText('+ ' + (insightsWithSavings.length - 10) + ' more recommendations available', margin, yPosition, 10, mutedColor);
      yPosition += 15;
    }

    addLine(yPosition);
    yPosition += 25;
  }

  // ── TOOL BREAKDOWN SECTION ─────────────────────────────────
  if (audit.tools && audit.tools.length > 0) {
    checkPageBreak(40);
    
    addText('Tool Breakdown', margin, yPosition, 14, primaryColor, true);
    yPosition += 12;

    audit.tools.slice(0, 8).forEach((tool: any) => {
      checkPageBreak(20);

      const toolName = tool.name || tool.toolName || 'Tool';
      const plan = tool.plan || tool.selectedPlan || 'Standard';
      const spend = tool.monthlySpend || tool.spend || 0;

      addText(toolName, margin, yPosition, 11, primaryColor, true);
      yPosition += 5;
      addText('Plan: ' + plan + ' | Spend: $' + spend.toLocaleString() + '/mo', margin, yPosition, 9, secondaryColor);
      yPosition += 10;
    });

    if (audit.tools.length > 8) {
      addText('+ ' + (audit.tools.length - 8) + ' additional tools', margin, yPosition, 10, mutedColor);
      yPosition += 15;
    }

    addLine(yPosition);
    yPosition += 25;
  }

  // ── FOOTER SECTION ──────────────────────────────────────────
  checkPageBreak(30);

  addLine(yPosition);
  yPosition += 12;

  addText('Generated by StackSave AI Audit', margin, yPosition, 9, mutedColor);
  yPosition += 5;
  addText('Audit ID: ' + audit.auditId, margin, yPosition, 9, mutedColor);
  yPosition += 5;
  
  const companyDisplay = audit.companyName || 'Your Company';
  addText(companyDisplay + ' | Team Size: ' + audit.teamSize, margin, yPosition, 9, mutedColor);
  yPosition += 8;

  addText('Powered by Credex | Discounted AI Infrastructure Credits', margin, yPosition, 9, mutedColor);

  // ── SAVE PDF ────────────────────────────────────────────────
  const fileName = `stacksave-audit-${audit.auditId.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
