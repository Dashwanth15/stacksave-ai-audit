import { useMemo, useState, useEffect } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';

interface RecommendationRevealProps {
  revealKey: string;
  strategyTitle?: string;
  strategyDescription?: string;
  domainLabel: string;
  toolNames: string[];
  monthlyCost: number;
  alignmentScore: number;
  coverageScore: number;
  deeperExplanation?: string;
}

function formatStackNames(names: string[]): string {
  if (names.length === 0) return 'this stack';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} + ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} + ${names[names.length - 1]}`;
}

type PhraseSegment = {
  text: string;
  strong?: boolean;
};

function buildPhrases(
  strategyTitle: string,
  _strategyDescription: string,
  domainLabel: string,
  toolNames: string[],
  monthlyCost: number,
  alignmentScore: number,
  coverageScore: number
): PhraseSegment[] {
  const stackLabel = formatStackNames(toolNames);
  const title = strategyTitle || 'Best Overall Architecture';

  if (title.toLowerCase().includes('value')) {
    return [
      { text: 'Optimized for the' },
      { text: title, strong: true },
      { text: 'for your' },
      { text: domainLabel, strong: true },
      { text: 'team, we recommend' },
      { text: `${stackLabel}`, strong: true },
      { text: 'at' },
      { text: `$${monthlyCost.toLocaleString()}/month.`, strong: true },
      { text: 'This stack minimizes seat spend while maintaining' },
      { text: `${alignmentScore}% domain alignment`, strong: true },
      { text: 'and satisfying' },
      { text: `${coverageScore}% of your operational requirements.`, strong: true },
    ];
  }

  if (title.toLowerCase().includes('performance')) {
    return [
      { text: 'Configured under the' },
      { text: title, strong: true },
      { text: 'for your' },
      { text: domainLabel, strong: true },
      { text: 'team, we recommend' },
      { text: `${stackLabel}`, strong: true },
      { text: 'at' },
      { text: `$${monthlyCost.toLocaleString()}/month.`, strong: true },
      { text: 'This suite prioritizes top benchmark reasoning and execution velocity with' },
      { text: `${alignmentScore}% alignment`, strong: true },
      { text: 'and' },
      { text: `${coverageScore}% requirement satisfaction.`, strong: true },
    ];
  }

  if (title.toLowerCase().includes('enterprise') || title.toLowerCase().includes('security')) {
    const isFullyCovered = coverageScore === 100;
    return [
      { text: isFullyCovered ? 'Hardened for' : 'Configured for' },
      { text: title, strong: true },
      { text: 'for your' },
      { text: domainLabel, strong: true },
      { text: 'team, we recommend' },
      { text: `${stackLabel}`, strong: true },
      { text: 'at' },
      { text: `$${monthlyCost.toLocaleString()}/month.`, strong: true },
      {
        text: isFullyCovered
          ? 'This architecture enforces verified enterprise administrative controls, privacy safeguards, and compliance with'
          : 'This architecture delivers core workflow velocity with'
      },
      { text: `${alignmentScore}% alignment`, strong: true },
      { text: isFullyCovered ? 'and' : 'while satisfying' },
      {
        text: isFullyCovered
          ? `${coverageScore}% requirement coverage.`
          : `${coverageScore}% of operational requirements (enterprise governance controls require an organizational plan upgrade).`,
        strong: true
      },
    ];
  }

  // Default: Best Overall
  return [
    { text: 'Configured for the' },
    { text: title, strong: true },
    { text: 'for your' },
    { text: domainLabel, strong: true },
    { text: 'team, we recommend' },
    { text: `${stackLabel}`, strong: true },
    { text: 'at' },
    { text: `$${monthlyCost.toLocaleString()}/month.`, strong: true },
    { text: 'This configuration balances core execution velocity and seat efficiency with' },
    { text: `${alignmentScore}% alignment`, strong: true },
    { text: 'while covering' },
    { text: `${coverageScore}% of your selected requirements.`, strong: true },
  ];
}

export default function RecommendationReveal({
  revealKey,
  strategyTitle = 'Best Overall Architecture',
  strategyDescription = '',
  domainLabel,
  toolNames,
  monthlyCost,
  alignmentScore,
  coverageScore,
  deeperExplanation,
}: RecommendationRevealProps) {
  const reduceMotion = useReducedMotion();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setShowDetails(false);
  }, [revealKey]);

  const phrases = useMemo(
    () => buildPhrases(strategyTitle, strategyDescription, domainLabel, toolNames, monthlyCost, alignmentScore, coverageScore),
    [strategyTitle, strategyDescription, domainLabel, toolNames, monthlyCost, alignmentScore, coverageScore]
  );

  const stagger = reduceMotion ? 0 : 0.07;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="px-5 sm:px-6 pt-6 sm:pt-7 pb-5">
        <span className="text-lg sm:text-xl font-black tracking-tight text-[#1E3A5F] block mb-4 uppercase">
          Why This Stack
        </span>

        <AnimatePresence mode="wait">
          <m.p
            key={revealKey}
            initial={reduceMotion ? false : 'hidden'}
            animate="visible"
            exit={{ opacity: 0 }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: stagger, delayChildren: 0.05 },
              },
            }}
            className="text-base sm:text-lg text-slate-900 leading-relaxed font-medium max-w-3xl"
          >
            {phrases.map((phrase, idx) => (
              <m.span
                key={`${revealKey}-${idx}`}
                variants={
                  reduceMotion
                    ? undefined
                    : {
                        hidden: { opacity: 0, y: 4 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
                        },
                      }
                }
                className={`inline ${phrase.strong ? 'font-bold text-slate-950' : ''}`}
              >
                {phrase.text}
                {idx < phrases.length - 1 ? ' ' : ''}
              </m.span>
            ))}
          </m.p>
        </AnimatePresence>

        {deeperExplanation && (
          <div className="mt-5 pt-2">
            <AnimatePresence>
              {showDetails && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <p className="mt-4 text-sm text-slate-700 leading-relaxed border-l-2 border-emerald-500 pl-4">
                    {deeperExplanation}
                  </p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-5 sm:mx-6" />
    </div>
  );
}

export function getProviderRole(buyingPriority?: string, fallbackIndex = 3) {
  switch (buyingPriority) {
    case '01 PRIMARY':
      return { index: '01', label: 'PRIMARY', variant: 'primary' as const };
    case '02 SECONDARY':
      return { index: '02', label: 'SECONDARY', variant: 'secondary' as const };
    case '03 OPTIONAL':
      return { index: '03', label: 'OPTIONAL', variant: 'optional' as const };
    case '04 API LAYER':
      return { index: '04', label: 'API LAYER', variant: 'api' as const };
    default: {
      const idx = String(fallbackIndex).padStart(2, '0');
      return {
        index: idx,
        label: fallbackIndex === 3 ? 'OPTIONAL' : `ROLE ${idx}`,
        variant: 'optional' as const,
      };
    }
  }
}
