'use client';

import { motion as m } from 'framer-motion';
import type { AuditResult, Insight } from '../../types';

interface AuditedConfigurationBadgeProps {
  audit: AuditResult;
  filteredInsights: Insight[];
}

/**
 * Compact Audit Context Paragraph
 * 
 * Single paragraph reveal using authoritative audit data and insight calculations.
 * Uses EXACT same values as the Savings Breakdown graph to ensure consistency.
 */
export default function AuditedConfigurationBadge({ 
  audit, 
  filteredInsights 
}: AuditedConfigurationBadgeProps) {
  const useCaseMap: Record<string, string> = {
    'software-engineering': 'Coding & Development',
    'writing-content': 'Writing & Content',
    'ai-data-ml': 'Data Analysis',
    'research-summarization': 'Research & Summarization',
    'product-design': 'Product & Design',
    'business-operations': 'Business Operations',
    'general-productivity': 'Mixed / General',
  };

  const goalMap: Record<string, string> = {
    balanced: 'Balanced Approach',
    savings: 'Maximum Cost Savings',
    productivity: 'Maximum Productivity',
    governance: 'Enterprise Governance',
  };

  const useCaseLabel = useCaseMap[audit.useCase || ''] || audit.useCase || 'General';
  const goalLabel = goalMap[audit.optimizationGoal || 'balanced'] || 'Balanced Approach';
  const teamSize = audit.teamSize || 1;
  const teamSizeLabel = `${teamSize} ${teamSize === 1 ? 'seat' : 'seats'}`;
  const toolCount = audit.tools?.length || 0;
  const toolsLabel = `${toolCount} ${toolCount === 1 ? 'tool' : 'tools'}`;

  // Use EXACT same calculations as the Savings Breakdown graph
  const estimatedMonthlySavings = filteredInsights.reduce((sum, i) => sum + i.potentialMonthlySaving, 0);
  const issueCount = filteredInsights.length;
  const savingsPercentage = audit && audit.totalMonthlySpend > 0
    ? Math.round((estimatedMonthlySavings / audit.totalMonthlySpend) * 100)
    : 0;

  // Build the single paragraph reveal dynamically
  const paragraphParts = buildParagraphParts(
    useCaseLabel,
    goalLabel,
    teamSizeLabel,
    toolsLabel,
    issueCount,
    estimatedMonthlySavings,
    savingsPercentage
  );

  // Container animation: stagger children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.1,
      },
    },
  };

  // Individual word/phrase animation: fade in + subtle upward motion
  const phraseVariants = {
    hidden: { opacity: 0, y: 4 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
      },
    },
  };

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <div className="w-1 h-3 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
          Audit Context
        </span>
      </div>

      <m.p
        className="text-base sm:text-lg leading-relaxed text-slate-900"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {paragraphParts.map((part, idx) => (
          <m.span
            key={idx}
            variants={phraseVariants}
            className={`inline ${
              part.bold
                ? 'font-bold text-emerald-700'
                : 'text-slate-700'
            }`}
          >
            {part.text}
          </m.span>
        ))}
      </m.p>
    </div>
  );
}

/**
 * Build paragraph parts for word-by-word reveal
 * Splits into logical phrases/words to maintain natural sentence structure
 */
function buildParagraphParts(
  useCase: string,
  goal: string,
  teamSize: string,
  tools: string,
  issueCount: number,
  monthSavings: number,
  savingsPercentage: number
): Array<{ text: string; bold: boolean }> {
  const parts: Array<{ text: string; bold: boolean }> = [];

  // "Your AI stack was audited for"
  parts.push({ text: 'Your ', bold: false });
  parts.push({ text: 'AI ', bold: false });
  parts.push({ text: 'stack ', bold: false });
  parts.push({ text: 'was ', bold: false });
  parts.push({ text: 'audited ', bold: false });
  parts.push({ text: 'for ', bold: false });

  // "[useCase]"
  parts.push({ text: useCase, bold: true });
  parts.push({ text: ' ', bold: false });

  // "workflows with a"
  parts.push({ text: 'workflows ', bold: false });
  parts.push({ text: 'with ', bold: false });
  parts.push({ text: 'a ', bold: false });

  // "[goal]"
  parts.push({ text: goal, bold: true });
  parts.push({ text: ' ', bold: false });

  // "approach, across"
  parts.push({ text: 'approach, ', bold: false });
  parts.push({ text: 'across ', bold: false });

  // "[teamSize] and [tools]"
  parts.push({ text: teamSize, bold: true });
  parts.push({ text: ' ', bold: false });
  parts.push({ text: 'and ', bold: false });
  parts.push({ text: tools, bold: true });
  parts.push({ text: '. ', bold: false });

  // "We identified"
  parts.push({ text: 'We ', bold: false });
  parts.push({ text: 'identified ', bold: false });

  // "[issueCount] optimization opportunities"
  parts.push({ text: issueCount.toString(), bold: true });
  parts.push({ text: ` optimization ${issueCount === 1 ? 'opportunity' : 'opportunities'}, `, bold: false });

  // "with estimated savings of"
  parts.push({ text: 'with ', bold: false });
  parts.push({ text: 'estimated ', bold: false });
  parts.push({ text: 'savings ', bold: false });
  parts.push({ text: 'of ', bold: false });

  // "[$X/month (Y% reduction)]"
  parts.push({ text: `$${monthSavings}/month`, bold: true });
  parts.push({ text: ` (${savingsPercentage}% reduction).`, bold: false });

  return parts;
}
