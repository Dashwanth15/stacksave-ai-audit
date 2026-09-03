import React from 'react';

/**
 * Selective commercial fact patterns:
 * - Discounts & percentages: e.g. "50% discount", "90% discount on cache reads", "50% savings", "50% off"
 * - Credit values & amounts: e.g. "up to $25,000 in Claude API credits", "between $5,000 and $100,000 in API usage credits", "¥15 in free API trial credits"
 * - Models & products: e.g. "Claude 3 and Claude 3.5 models", "Google AI Pro", "Cursor Pro", "GitHub Copilot for free"
 * - Durations & timelines: e.g. "free for 14 days", "within 24 hours", "through June 2028"
 * - Included benefits & features: e.g. "YouTube Premium Lite bundled in", "YouTube Premium Lite included", "unlimited completions", "free developer partner tools and cloud credits", "Free dedicated ChatGPT workspace", "institutional deployment tier"
 * - Key eligibility terms: e.g. "verified K-12 educators", "colleges and universities", "off-peak hours"
 */
const COMMERCIAL_FACTS_REGEX = new RegExp(
  '(' +
  [
    'up to \\$25,000 in Claude API credits',
    'between \\$5,000 and \\$100,000 in API usage credits',
    '¥15 in free API trial credits',
    '\\b[0-9]+% discount(?: on cache reads)?',
    '\\b[0-9]+% savings',
    '\\b[0-9]+% off',
    '0\\.1x of standard input price',
    'free for [0-9]+ days',
    'within 24 hours',
    'through [A-Z][a-z]+ [0-9]{4}',
    'Claude 3 and Claude 3\\.5 models',
    'Google AI Pro',
    'YouTube Premium Lite bundled in',
    'YouTube Premium Lite included',
    'Cursor Pro',
    'GitHub Copilot for free',
    'GitHub Copilot',
    'Free dedicated ChatGPT workspace',
    'unlimited completions',
    'free developer partner tools and cloud credits',
    'institutional deployment tier',
    'colleges and universities',
    'verified K-12 educators',
    'off-peak hours'
  ].join('|') +
  ')',
  'gi'
);

/**
 * Parses offer descriptions and renders key commercial facts with bold typography
 * for immediate scannability, without bolding entire sentences.
 */
export function renderEmphasizedDescription(text: string): React.ReactNode {
  if (!text) return null;

  const parts = text.split(COMMERCIAL_FACTS_REGEX);
  if (parts.length <= 1) {
    return text;
  }

  return parts.map((part, idx) => {
    COMMERCIAL_FACTS_REGEX.lastIndex = 0;
    if (COMMERCIAL_FACTS_REGEX.test(part)) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}
