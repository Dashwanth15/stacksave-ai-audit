import jsPDF from 'jspdf';
import type { AuditResult } from '../types';

export function generateAuditPDF(audit: AuditResult): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  
  let yPosition = margin;

  // Colors
  const primaryColor = [99, 102, 241]; // Indigo
  const textDark = [30, 41, 59]; // Slate-800
  const textLight = [71, 85, 105]; // Slate-600
  const textMuted = [148, 163, 184]; // Slate-400
  const successColor = [16, 185, 129]; // Emerald-500

  // Helper functions
  const addText = (text: string, x: number, y: number, fontSize: number, color: number[] = textDark, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.text(text, x, y);
  };

  const addLine = (y: number, color: number[] = [226, 232, 240]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
  };

  // ── HEADER ─────────────────────────────────────────────────
  // Logo/Brand
  addText('StackSave AI Audit', margin, yPosition, 24, primaryColor, true);
  yPosition += 8;
  
  // Report title
  addText('AI Stack Optimization Report', margin, yPosition, 14, textLight);
  yPosition += 6;
  
  // Timestamp
  const date = new Date(audit.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  addText(`Generated: ${date}`, margin, yPosition, 10, textMuted);
  yPosition += 12;

  // Header separator
  addLine(yPosition);
  yPosition += 15;

  // ── SAVINGS SUMMARY ─────────────────────────────────────────
  if (!audit.isAlreadyOptimal) {
    addText('Savings Summary', margin, yPosition, 16, textDark, true);
    yPosition += 8;

    // Monthly savings
    addText('Potential Monthly Recovery', margin, yPosition, 11, textLight);
    yPosition += 6;
    addText(`$${audit.estimatedMonthlySavings.toLocaleString()}`, margin, yPosition, 28, successColor, true);
    yPosition += 10;

    // Annual savings and percentage
    addText(
      `$${audit.estimatedAnnualSavings.toLocaleString()}/year · ${audit.savingsPercentage}% reduction`,
      margin,
      yPosition,
      12,
      textLight
    );
    yPosition += 8;

    // Current vs Optimized
    addText('Current Spend:', margin, yPosition, 10, textMuted);
    addText(`$${audit.totalMonthlySpend.toLocaleString()}/mo`, margin + 35, yPosition, 10, textDark, true);
    yPosition += 5;
    addText('Optimized Spend:', margin, yPosition, 10, textMuted);
    addText(`$${audit.optimizedMonthlySpend.toLocaleString()}/mo`, margin + 35, yPosition, 10, successColor, true);
    yPosition += 12;

    addLine(yPosition);
    yPosition += 15;
  } else {
    addText('Stack Status: Well Optimized', margin, yPosition, 16, successColor, true);
    yPosition += 8;
    addText('Your AI stack is well-optimized for your team size and use case.', margin, yPosition, 11, textLight);
    yPosition += 12;
    addLine(yPosition);
    yPosition += 15;
  }

  // ── AI SUMMARY ───────────────────────────────────────────────
  if (audit.aiSummary) {
    addText('AI Summary', margin, yPosition, 16, textDark, true);
    yPosition += 8;
    
    // Wrap text for AI summary
    const splitText = doc.splitTextToSize(audit.aiSummary, contentWidth);
    addText(splitText, margin, yPosition, 11, textLight);
    yPosition += splitText.length * 5 + 12;
    
    addLine(yPosition);
    yPosition += 15;
  }

  // ── RECOMMENDATIONS ───────────────────────────────────────────
  const insightsWithSavings = audit.insights.filter(i => i.potentialMonthlySaving > 0);
  
  if (insightsWithSavings.length > 0) {
    addText('Optimization Recommendations', margin, yPosition, 16, textDark, true);
    yPosition += 8;
    addText(`${insightsWithSavings.length} actionable opportunity${insightsWithSavings.length > 1 ? 'ies' : ''} identified`, margin, yPosition, 10, textMuted);
    yPosition += 10;

    insightsWithSavings.slice(0, 10).forEach((insight, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      // Tool name
      addText(`${index + 1}. ${insight.toolName}`, margin, yPosition, 12, textDark, true);
      yPosition += 5;

      // Savings badge
      addText(`Recover: $${insight.potentialMonthlySaving.toLocaleString()}/mo`, margin, yPosition, 10, successColor, true);
      yPosition += 5;

      // Issue
      const issueText = doc.splitTextToSize(insight.message, contentWidth - 5);
      addText(issueText, margin, yPosition, 10, textLight);
      yPosition += issueText.length * 5 + 4;

      // Recommendation
      addText('Recommended Action:', margin, yPosition, 9, primaryColor, true);
      yPosition += 4;
      const recText = doc.splitTextToSize(insight.suggestion, contentWidth - 5);
      addText(recText, margin + 5, yPosition, 10, textLight);
      yPosition += recText.length * 5 + 8;

      addLine(yPosition);
      yPosition += 8;
    });

    if (insightsWithSavings.length > 10) {
      addText(`+ ${insightsWithSavings.length - 10} more recommendations`, margin, yPosition, 10, textMuted, true);
      yPosition += 12;
    }

    addLine(yPosition);
    yPosition += 15;
  }

  // ── TOOL BREAKDOWN ────────────────────────────────────────────
  if (audit.tools && audit.tools.length > 0) {
    addText('Tool Breakdown', margin, yPosition, 16, textDark, true);
    yPosition += 8;

    audit.tools.slice(0, 8).forEach((tool: any, index: number) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }

      const toolName = tool.name || tool.toolName || `Tool ${index + 1}`;
      const plan = tool.plan || tool.selectedPlan || 'Standard Plan';
      const spend = tool.monthlySpend || tool.spend || 0;

      addText(`${toolName}`, margin, yPosition, 11, textDark, true);
      yPosition += 4;
      addText(`Plan: ${plan} · Spend: $${spend.toLocaleString()}/mo`, margin + 5, yPosition, 9, textLight);
      yPosition += 6;
    });

    if (audit.tools.length > 8) {
      addText(`+ ${audit.tools.length - 8} more tools`, margin, yPosition, 10, textMuted);
      yPosition += 8;
    }

    addLine(yPosition);
    yPosition += 15;
  }

  // ── FOOTER ───────────────────────────────────────────────────
  // Check if we need a new page for footer
  if (yPosition > pageHeight - 30) {
    doc.addPage();
    yPosition = margin;
  }

  addLine(yPosition);
  yPosition += 10;

  addText('Generated by StackSave AI Audit', margin, yPosition, 9, textMuted);
  yPosition += 5;
  addText(`Audit ID: ${audit.auditId}`, margin, yPosition, 9, textMuted);
  yPosition += 5;
  
  const companyDisplay = audit.companyName || 'Your AI Stack';
  addText(`${companyDisplay} · Team Size: ${audit.teamSize}`, margin, yPosition, 9, textMuted);
  yPosition += 8;

  addText('Powered by Credex · Discounted AI Infrastructure Credits', margin, yPosition, 9, textMuted);

  // ── SAVE PDF ─────────────────────────────────────────────────
  const fileName = `stacksave-audit-${audit.auditId.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
