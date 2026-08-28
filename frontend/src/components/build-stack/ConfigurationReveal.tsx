'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ConfigurationRevealProps {
  trace?: unknown;
}

/**
 * ConfigurationReveal - Premium personalized summary sentence
 * 
 * Generates dynamic sentences from user's actual configuration inputs
 * and reveals them with clean typography hierarchy.
 * 
 * Example output:
 * "You're optimizing AI & Machine Learning for Balanced Approach with a 5-seat team and $100/mo budget.
 *  Based on 3 requirements, the recommended stack is tailored for you."
 */
export default function ConfigurationReveal({ trace }: ConfigurationRevealProps) {
  const segments = useMemo(() => {
    const inputs = (trace as { inputs?: { domain?: string; domainLabel?: string; optimizationGoal?: string; teamSize?: number; monthlyBudget?: number; requirements?: string[]; workflowStage?: string } } | undefined)?.inputs;
    if (!inputs) return [];

    const result: { text: string; highlight?: boolean }[] = [];

    // 1. Domain/Engineering Focus
    const domainLabel = inputs.domainLabel || inputs.domain || 'your domain';
    result.push({ text: "You're optimizing ", highlight: false });
    result.push({ text: domainLabel, highlight: true });

    // 2. Optimization Goal
    const goalMap: Record<string, string> = {
      balanced: 'Balanced Approach',
      savings: 'Maximum Cost Savings',
      productivity: 'Maximum Productivity',
      governance: 'Enterprise Governance',
    };
    const goalLabel = goalMap[inputs.optimizationGoal as string] || inputs.optimizationGoal || 'optimal efficiency';
    result.push({ text: ' for ', highlight: false });
    result.push({ text: goalLabel, highlight: true });

    // 3. Team Size
    const sizeText = inputs.teamSize === 1 ? '1-seat solo team' : `${inputs.teamSize}-seat team`;
    result.push({ text: ' with a ', highlight: false });
    result.push({ text: sizeText, highlight: true });

    // 4. Budget if available
    if (inputs.monthlyBudget !== undefined && inputs.monthlyBudget !== null && inputs.monthlyBudget > 0) {
      result.push({ text: ' and ', highlight: false });
      result.push({ text: `$${inputs.monthlyBudget}/mo budget`, highlight: true });
    }

    result.push({ text: '. ', highlight: false });

    // 5. Requirements summary
    const reqCount = inputs.requirements?.length || 0;
    if (reqCount > 0) {
      result.push({ text: 'Based on ', highlight: false });
      result.push({ text: `${reqCount} requirements`, highlight: true });
      result.push({ text: ', the recommended stack is ', highlight: false });
      result.push({ text: 'tailored', highlight: true });
      result.push({ text: ' for you.', highlight: false });
    }

    return result;
  }, [trace]);

  if (!trace || segments.length === 0) {
    return null;
  }

  const container: { hidden: { opacity: number }; visible: { opacity: number; transition: { staggerChildren: number; delayChildren: number } } } = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 3 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <motion.div
      className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.p
        className="text-sm sm:text-[15px] leading-relaxed text-slate-600"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {segments.map((segment, idx) => (
          <motion.span key={idx} variants={itemVariant}>
            {segment.highlight ? (
              <strong className="font-bold text-slate-950">
                {segment.text}
              </strong>
            ) : (
              <span>{segment.text}</span>
            )}
          </motion.span>
        ))}
      </motion.p>
    </motion.div>
  );
}

