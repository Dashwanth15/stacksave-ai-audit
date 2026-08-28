// ============================================================
// ChatBot — Production StackSave AI Spend Intelligence Assistant
//
// Bloomberg-style product intelligence & financial SaaS interface.
//
// Key Features:
// • Advanced responsive comparison table renderer (zero raw Markdown tables)
// • Lucide Sparkles SVG assistant avatar across all responses & typing state
// • Preserved "What I Can Help With" 2x2 capabilities grid
// • Cleaned Suggested Inquiries: exactly 5 visible by default + "View more" toggle
// • Clean header: "SUGGESTED INQUIRIES" with no count clutter
// • Soft cool-slate layered background (#f1f5f9) with crisp white response surfaces
// • Tabular numbers, bold financial metrics, and clean typography hierarchy
// • Preserved official StackSave logo in header with refined alignment
// ============================================================

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import { useChatContext } from '../hooks/useChatContext';
import { getBaseUrl } from '../services/api';

// Derive the raw backend origin from the shared base URL (strips the /api suffix)
const API_BASE = getBaseUrl().replace(/\/api$/, '');

// ── Types ─────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: Date;
}

const GREETING_TIME = new Date();

// ── Capabilities for Empty State ──────────────────────────────
interface Capability {
  title: string;
  desc: string;
  prompt: string;
  icon: React.ReactNode;
}

const CAPABILITIES: Capability[] = [
  {
    title: 'Pricing & Plans',
    desc: 'Compare AI coding, chat & agent tiers',
    prompt: 'Compare the pricing and seat tiers of top AI coding tools',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: 'Spend Audits',
    desc: 'Identify waste & seat downgrade savings',
    prompt: 'How does StackSave identify wasted spend and duplicate subscriptions?',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
  },
  {
    title: 'Stack Recommendations',
    desc: 'Find vetted tools tailored to your workflow',
    prompt: 'What AI tools are best suited for modern full-stack development teams?',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    title: 'Audit Explanations',
    desc: 'Understand recommendation rationale',
    prompt: 'How do StackSave audit calculations and replacement rules work?',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
];

// ── Complete Platform Suggested Inquiries Pool ────────────────
interface SuggestedInquiry {
  text: string;
  category: 'pricing' | 'compare' | 'audit' | 'savings' | 'billing' | 'stack';
}

const ALL_PLATFORM_INQUIRIES: SuggestedInquiry[] = [
  { text: 'How does StackSave calculate savings?', category: 'audit' },
  { text: 'Which tools can I audit together?', category: 'audit' },
  { text: 'Which AI coding tool is cheapest?', category: 'pricing' },
  { text: 'Claude vs ChatGPT — which is better value?', category: 'compare' },
  { text: 'How do I reduce AI SaaS spend?', category: 'savings' },
  { text: 'How does StackSave audit my stack?', category: 'audit' },
  { text: 'How does StackSave identify wasted spend?', category: 'savings' },
  { text: 'Should I choose annual or monthly billing?', category: 'billing' },
  { text: 'What does Build My Stack do?', category: 'stack' },
  { text: 'How do optimization goals affect recommendations?', category: 'stack' },
  { text: 'When should I add an API layer instead of seats?', category: 'pricing' },
];

function getIconForCategory(category: string): React.ReactNode {
  switch (category) {
    case 'pricing':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'compare':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5" />
          <path d="M8 3H3v5" />
          <path d="M21 3l-7 7" />
          <path d="M3 3l7 7" />
          <path d="M16 21h5v-5" />
          <path d="M8 21H3v-5" />
          <path d="M21 21l-7-7" />
          <path d="M3 21l7-7" />
        </svg>
      );
    case 'audit':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      );
    case 'savings':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
      );
    case 'billing':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      );
    case 'stack':
    default:
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
  }
}

// ── Timestamp Formatter ───────────────────────────────────────
function fmt(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── Inline Text Decorator ─────────────────────────────────────
function decorateInlineText(text: string): string {
  let res = text;

  // Replace double bold: **text**
  res = res.replace(
    /\*\*(.*?)\*\*/g,
    '<strong style="font-weight:600;color:#0f172a;font-family:Inter,sans-serif">$1</strong>'
  );

  // Auto-bold pricing values like $20/seat/month, $5/month, $100/seat/month, $22/month, $264/year
  res = res.replace(
    /(?<!\>)\$([0-9]+(?:\.[0-9]+)?(?:\/[a-zA-Z]+)*)/g,
    '<strong style="font-weight:600;color:#0f172a;font-variant-numeric:tabular-nums;font-family:Inter,sans-serif">$$$1</strong>'
  );

  // Replace italics: *text* or _text_
  res = res.replace(
    /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g,
    '<em style="font-style:italic;color:#64748b;font-family:Inter,sans-serif">$1</em>'
  );

  // Clean dash separators: " — "
  res = res.replace(/ — /g, '<span style="color:#cbd5e1;margin:0 4px"> — </span>');

  return res;
}

// ── Section Heading Recognizer ────────────────────────────────
const SECTION_HEADER_PATTERNS = [
  /^(###|##|#)\s+(.*)/,
  /^\*\*(Recommendation|Key Consideration|Cheapest Paid [A-Za-z0-9\s]+|Pricing & Tiers|Pricing [A-Za-z0-9\s]+|Paid [A-Za-z0-9\s]+|Why [A-Za-z0-9\s]+|Potential Savings|Important [A-Za-z0-9\s]+|Summary|For Teams|For Individuals|For Developers|Feature Comparison|Core Capabilities|Key Procurement Insights):\*\*/i,
  /^(Recommendation|Key Consideration|Cheapest Paid [A-Za-z0-9\s]+|Pricing & Tiers|Pricing Comparison|Paid Options|Paid Alternatives|Why this is recommended|Potential Savings|Important Consideration|Summary|Key Takeaway|Core Capabilities|Key Procurement Insights):\s*$/i,
  /^(Core Capabilities|Key Features|Recommendations|Pricing & Tiers|Pricing Breakdown|Why StackSave|Key Procurement Insights)$/i,
];

function isSectionHeading(line: string): string | null {
  const t = line.trim();
  if (!t) return null;

  if (t.startsWith('#')) {
    return t.replace(/^#{1,3}\s+/, '').replace(/\*\*/g, '').trim();
  }

  if (t.startsWith('**') && t.endsWith('**') && t.length > 4 && !t.slice(2, -2).includes('**')) {
    return t.slice(2, -2).replace(/:$/, '').trim();
  }

  for (const pat of SECTION_HEADER_PATTERNS) {
    const match = t.match(pat);
    if (match) {
      return (match[2] || match[1] || t).replace(/\*\*/g, '').replace(/:$/, '').trim();
    }
  }

  return null;
}

// ── Semantic Comparison Table Renderer ────────────────────────
function renderMarkdownTable(tableLines: string[]): string {
  if (tableLines.length < 2) return '';

  const parseRow = (rowStr: string): string[] => {
    let clean = rowStr.trim();
    if (clean.startsWith('|')) clean = clean.slice(1);
    if (clean.endsWith('|')) clean = clean.slice(0, -1);
    return clean.split('|').map((c) => c.trim());
  };

  const headers = parseRow(tableLines[0]);
  const dataRows: string[][] = [];

  for (let i = 1; i < tableLines.length; i++) {
    const r = tableLines[i].trim();
    // Skip separator line (e.g. |:---|:---|)
    if (/^\|?\s*[-:]+[-|\s:]+$/.test(r)) {
      continue;
    }
    if (r.startsWith('|') || r.includes('|')) {
      dataRows.push(parseRow(r));
    }
  }

  const formatTableCell = (cell: string): string => {
    let text = cell;

    // Check for Yes / Supported checkmarks
    if (/^(yes|supported|✓|true)$/i.test(text.trim())) {
      return `<span style="display:inline-flex;align-items:center;gap:3.5px;color:#10b981;font-weight:600"><svg style="width:12px;height:12px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Yes</span>`;
    }
    if (/^(no|not supported|×|false)$/i.test(text.trim())) {
      return `<span style="color:#94a3b8;font-weight:500">No</span>`;
    }

    // Format bold text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:600;color:#0f172a">$1</strong>');

    // Format plan names + pricing: e.g. "Pro: $20/seat/month" or "Go: $5/seat/month"
    text = text.replace(
      /^([A-Za-z0-9\s]+):\s*(\$[0-9]+(?:\/[a-zA-Z]+)*)/i,
      '<strong style="font-weight:600;color:#0f172a">$1:</strong> <span style="font-weight:600;color:#0f172a;font-variant-numeric:tabular-nums">$2</span>'
    );

    // Format bare pricing e.g. "$20/seat/month", "$5/seat/month", "$100/seat/month"
    text = text.replace(
      /(?<!\>)\$([0-9]+(?:\.[0-9]+)?(?:\/[a-zA-Z]+)*)/g,
      '<span style="font-weight:600;color:#0f172a;font-variant-numeric:tabular-nums">$$$1</span>'
    );

    // Format percentage discounts e.g. "20% off", "17% off"
    text = text.replace(
      /([0-9]+%\s*(?:off)?)/gi,
      '<strong style="font-weight:600;color:#0f172a;font-variant-numeric:tabular-nums">$1</strong>'
    );

    // Format italic notes
    text = text.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em style="font-style:italic;color:#64748b">$1</em>');

    return text;
  };

  return (
    `<div style="margin:8px 0 10px 0;overflow-x:auto;border:1px solid #e2e8f0;border-radius:9px;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.03);scrollbar-width:thin">` +
    `<table style="width:100%;border-collapse:collapse;text-align:left;font-size:11.5px;font-family:Inter,sans-serif;min-width:280px">` +
    `<thead>` +
    `<tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0">` +
    headers
      .map(
        (h, idx) =>
          `<th style="padding:7px 10px;font-weight:700;color:#0f172a;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;${
            idx > 0 ? 'border-left:1px solid #e2e8f0;' : ''
          }">${decorateInlineText(h)}</th>`
      )
      .join('') +
    `</tr>` +
    `</thead>` +
    `<tbody>` +
    dataRows
      .map(
        (row, rIdx) =>
          `<tr style="border-bottom:${
            rIdx === dataRows.length - 1 ? 'none' : '1px solid #f1f5f9'
          };background:${rIdx % 2 === 0 ? '#ffffff' : '#fafafa'}">` +
          row
            .map(
              (cell, cIdx) =>
                `<td style="padding:7px 10px;color:#334155;line-height:1.45;vertical-align:top;${
                  cIdx === 0 ? 'font-weight:600;color:#0f172a;white-space:nowrap;' : ''
                }${cIdx > 0 ? 'border-left:1px solid #f1f5f9;' : ''}">${formatTableCell(cell)}</td>`
            )
            .join('') +
          `</tr>`
      )
      .join('') +
    `</tbody>` +
    `</table>` +
    `</div>`
  );
}

// ── Client-side Reasoning Cleaner ─────────────────────────────
function cleanReasoningPreamble(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();

  // Strip <think> and <reasoning> tags
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trim();

  // Strip "Here's a thinking process:" structures
  if (/^(?:Here's a thinking process|Thinking Process|Thought Process):/i.test(text)) {
    const draftMatch = text.match(
      /(?:Draft\s*[-–:]\s*(?:Short\s*&\s*Simple)?|Final Answer|Response|Direct Answer):\s*([\s\S]+)$/i
    );
    if (draftMatch && draftMatch[1].trim()) {
      text = draftMatch[1].trim();
    } else {
      const lines = text.split('\n');
      const cleanLines: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^(?:Here's a thinking process|Thinking Process|Thought Process):/i.test(trimmed)) continue;
        if (
          /^(?:[•\-\*]|\d+\.)?\s*(?:Analyze User Input|User says|Context|Goal|Identify Core Concept|Core Concept|Key Takeaway|Approach|Step \d):/i.test(
            trimmed
          )
        )
          continue;
        if (/^(?:[•\-\*]|\d+\.)?\s*(?:Draft|Draft\s*[-–:]\s*Short\s*&\s*Simple):/i.test(trimmed)) {
          const afterDraft = trimmed.replace(
            /^(?:[•\-\*]|\d+\.)?\s*(?:Draft|Draft\s*[-–:]\s*Short\s*&\s*Simple):\s*/i,
            ''
          );
          if (afterDraft) cleanLines.push(afterDraft);
          continue;
        }
        cleanLines.push(line);
      }
      text = cleanLines.join('\n').trim();
    }
  }

  return text;
}

// ── Advanced Consultant Response Formatter ────────────────────
function formatAssistantResponse(raw: string): string {
  const cleaned = cleanReasoningPreamble(raw);
  const lines = cleaned.split('\n');
  const elements: string[] = [];
  let inList = false;
  let sectionIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    // Blank line
    if (!t) {
      if (inList) { elements.push('</ul>'); inList = false; }
      elements.push('<div style="height:5px"></div>');
      continue;
    }

    // Markdown Table Detection (continuous block starting with table header + divider)
    if (
      t.startsWith('|') ||
      (t.includes('|') && lines[i + 1] && /^\s*\|?\s*[-:]+[-|\s:]+/.test(lines[i + 1]))
    ) {
      if (inList) { elements.push('</ul>'); inList = false; }
      const tableLines: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('|') || lines[i].trim().includes('|'))) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--; // step back since outer loop will increment

      if (tableLines.length >= 2) {
        elements.push(renderMarkdownTable(tableLines));
        continue;
      }
    }

    // Horizontal divider
    if (t === '---' || t === '***') {
      if (inList) { elements.push('</ul>'); inList = false; }
      elements.push('<hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0" />');
      continue;
    }

    // Section Heading Check
    const headingText = isSectionHeading(t);
    if (headingText) {
      if (inList) { elements.push('</ul>'); inList = false; }
      sectionIndex++;
      const isMajorSection =
        headingText.toLowerCase().includes('recommendation') ||
        headingText.toLowerCase().includes('cheapest paid') ||
        headingText.toLowerCase().includes('core capabilities') ||
        headingText.toLowerCase().includes('pricing & tiers') ||
        headingText.toLowerCase().includes('key procurement insights');

      const dividerHtml =
        sectionIndex > 1 && isMajorSection
          ? '<div style="border-top:1px solid #e2e8f0;margin:10px 0 8px"></div>'
          : '';

      elements.push(
        `${dividerHtml}` +
        `<div style="font-size:12.5px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;margin-top:10px;margin-bottom:3px;font-family:Inter,sans-serif;display:flex;align-items:center;gap:6px">` +
        `<span>${headingText}</span>` +
        `</div>`
      );
      continue;
    }

    // Standalone Note or Correction line (e.g. *Wait, correction: ...*)
    if ((t.startsWith('*') && t.endsWith('*')) || (t.startsWith('(') && t.endsWith(')'))) {
      if (inList) { elements.push('</ul>'); inList = false; }
      const cleanNote = decorateInlineText(t);
      elements.push(
        `<div style="font-size:11.5px;line-height:1.55;color:#64748b;font-style:italic;margin:3px 0 5px 0;padding-left:2px">` +
        `${cleanNote}` +
        `</div>`
      );
      continue;
    }

    // Bullet List Item
    const bulletMatch = t.match(/^([•\-\*]|\d+\.)\s+(.*)/);
    if (bulletMatch) {
      if (!inList) {
        elements.push('<ul style="margin:4px 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3.5px">');
        inList = true;
      }

      let itemRaw = bulletMatch[2];

      // Auto-bold bullet label if written like "• Cost Efficiency: ..."
      itemRaw = itemRaw.replace(
        /^([A-Za-z0-9\s&]+):\s+(.*)/,
        '**$1:** $2'
      );

      const decorated = decorateInlineText(itemRaw);

      const isPositive =
        itemRaw.startsWith('✓') ||
        itemRaw.startsWith('[x]') ||
        itemRaw.toLowerCase().includes('requirement covered') ||
        itemRaw.toLowerCase().includes('within budget');

      if (isPositive) {
        elements.push(
          `<li style="display:flex;gap:7px;align-items:flex-start">` +
          `<svg style="width:13px;height:13px;color:#10b981;flex-shrink:0;margin-top:2px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` +
          `<span style="font-size:12px;line-height:1.55;color:#334155;font-family:Inter,sans-serif">${decorated.replace(/^[✓\+]\s*/, '')}</span>` +
          `</li>`
        );
      } else {
        elements.push(
          `<li style="display:flex;gap:7px;align-items:flex-start">` +
          `<span style="width:4.5px;height:4.5px;border-radius:50%;background:#94a3b8;flex-shrink:0;margin-top:7px"></span>` +
          `<span style="font-size:12px;line-height:1.55;color:#334155;font-family:Inter,sans-serif">${decorated}</span>` +
          `</li>`
        );
      }
      continue;
    }

    // Regular Paragraph
    if (inList) { elements.push('</ul>'); inList = false; }
    const decoratedPara = decorateInlineText(t);
    elements.push(
      `<p style="font-size:12.5px;line-height:1.6;color:#334155;margin:2.5px 0;font-family:Inter,sans-serif">${decoratedPara}</p>`
    );
  }

  if (inList) elements.push('</ul>');
  return elements.join('');
}

// ── Dedicated Assistant Avatar Icon (Lucide Sparkles SVG) ─────
function AssistantAvatar({ size = 20 }: { size?: number }) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '6px',
        background: '#1e3a5f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(30,58,95,0.18)',
      }}
    >
      <svg
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4" />
        <path d="M22 5h-4" />
        <path d="M4 17v2" />
        <path d="M5 18H3" />
      </svg>
    </div>
  );
}

// ── Typing Dots Indicator ─────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '3px 0' }}>
      {[0, 0.18, 0.36].map((delay, i) => (
        <m.span
          key={i}
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#94a3b8',
            display: 'inline-block',
          }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1.0, repeat: Infinity, delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Shared Design Tokens ──────────────────────────────────────
const PANEL_BG = '#f1f5f9';
const CARD_BG = '#ffffff';
const CARD_BORDER = '1px solid #e2e8f0';
const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.04)';
const SURFACE_WHITE = '#ffffff';
const DIVIDER = '1px solid #e2e8f0';
const NAVY = '#1e3a5f';
const MUTED = '#94a3b8';
const SUBTLE = '#64748b';

// ── Main Component ────────────────────────────────────────────
export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composerWrapRef = useRef<HTMLDivElement>(null);

  const chatContext = useChatContext();

  // Combine dynamic page questions + platform inquiries pool (deduplicated)
  const combinedSuggestions = useMemo(() => {
    const pageQuestions = chatContext.quickQuestions || [];
    const seen = new Set<string>();
    const result: SuggestedInquiry[] = [];

    // Prioritize dynamic page-specific inquiries first
    for (const q of pageQuestions) {
      if (!seen.has(q.toLowerCase())) {
        seen.add(q.toLowerCase());
        const match = ALL_PLATFORM_INQUIRIES.find((p) => p.text.toLowerCase() === q.toLowerCase());
        result.push({
          text: q,
          category: match ? match.category : 'audit',
        });
      }
    }

    // Add remaining platform inquiries to ensure full suite is restored
    for (const item of ALL_PLATFORM_INQUIRIES) {
      if (!seen.has(item.text.toLowerCase())) {
        seen.add(item.text.toLowerCase());
        result.push(item);
      }
    }

    return result;
  }, [chatContext.quickQuestions]);

  // Initial visible 5 suggestions or full list when expanded
  const visibleSuggestions = useMemo(() => {
    if (showAllSuggestions) return combinedSuggestions;
    return combinedSuggestions.slice(0, 5);
  }, [combinedSuggestions, showAllSuggestions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const willOpen = !prev;
      if (willOpen && !hasGreeted) {
        setHasGreeted(true);
      }
      return willOpen;
    });
  }, [hasGreeted]);

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg, ts: new Date() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          context: {
            page: chatContext.page,
            auditContext: chatContext.auditContext,
            buildStackContext: chatContext.buildStackContext,
          },
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || 'I was unable to process that query. Please ask again.',
          ts: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to connect to StackSave intelligence service. Please check connection and try again.',
          ts: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const contextLabel = (() => {
    if (chatContext.page === 'audit-results') return 'Audit Intelligence';
    if (chatContext.page === 'build-stack-results') return 'Stack Recommendations';
    return 'Spend Intelligence';
  })();

  const isConversationEmpty = messages.length === 0;

  return (
    <>
      {/* ── Floating Launcher Button ────────────────────── */}
      <m.button
        onClick={handleToggle}
        className="chatbot-launcher-btn"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 50,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: NAVY,
          color: '#fff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(30,58,95,0.28), 0 1px 4px rgba(0,0,0,0.12)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open StackSave AI Assistant"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <m.svg
              key="close"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 45 }}
              transition={{ duration: 0.15 }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </m.svg>
          ) : (
            <m.svg
              key="open"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0, rotate: 45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -45 }}
              transition={{ duration: 0.15 }}
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </m.svg>
          )}
        </AnimatePresence>
      </m.button>

      {/* Notification Pulse Dot */}
      {!isOpen && !hasGreeted && (
        <span
          className="chatbot-pulse-dot"
          style={{
            position: 'fixed',
            bottom: '52px',
            right: '18px',
            zIndex: 50,
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid #fff',
            pointerEvents: 'none',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      )}

      {/* ── Chat Panel Drawer ───────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="chatbot-panel"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              zIndex: 50,
              width: '430px',
              maxWidth: '100%',
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: SURFACE_WHITE,
              borderLeft: DIVIDER,
              boxShadow: '-4px 0 36px rgba(0,0,0,0.08)',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* ── HEADER: Official StackSave Identity ─────────── */}
            <div
              style={{
                minHeight: '64px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: SURFACE_WHITE,
                borderBottom: DIVIDER,
              }}
            >
              {/* Left group: logo + separator + identity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                {/* Official StackSave logo — preserved crisp */}
                <Logo size="sm" asDiv className="shrink-0" />

                {/* Vertical separator */}
                <div style={{ width: '1px', height: '26px', background: '#e2e8f0', flexShrink: 0 }} />

                {/* AI Assistant identity */}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: '#0f172a',
                      lineHeight: 1.2,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    AI Assistant
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5.5px', marginTop: '3px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#10b981',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: SUBTLE,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {contextLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleToggle}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: SURFACE_WHITE,
                  color: MUTED,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginLeft: '10px',
                  transition: 'background 0.13s ease, border-color 0.13s ease, color 0.13s ease',
                }}
                onMouseEnter={(e) => Object.assign((e.currentTarget as HTMLElement).style, { background: '#f8fafc', borderColor: '#cbd5e1', color: '#475569' })}
                onMouseLeave={(e) => Object.assign((e.currentTarget as HTMLElement).style, { background: SURFACE_WHITE, borderColor: '#e2e8f0', color: MUTED })}
                aria-label="Close assistant"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* ── MESSAGES / EMPTY STATE VIEWPORT ─────────────── */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                minHeight: 0,
                background: PANEL_BG,
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {isConversationEmpty ? (
                // ── PURPOSEFUL EMPTY STATE COMPOSITION ─────────
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Assistant Intro Message */}
                  <div style={{ maxWidth: '98%', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                      <AssistantAvatar size={20} />
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>StackSave AI</span>
                      <span style={{ fontSize: '10.5px', color: MUTED }}>&middot;</span>
                      <span style={{ fontSize: '10.5px', color: MUTED }}>{fmt(GREETING_TIME)}</span>
                    </div>

                    <div style={{ paddingLeft: '27px' }}>
                      <div
                        style={{
                          background: CARD_BG,
                          border: CARD_BORDER,
                          borderRadius: '3px 14px 14px 14px',
                          padding: '12px 14px',
                          boxShadow: CARD_SHADOW,
                        }}
                      >
                        <p style={{ fontSize: '12.5px', lineHeight: 1.55, color: '#334155', margin: 0, fontWeight: 500 }}>
                          I’m StackSave’s AI spend intelligence assistant.
                        </p>
                        <p style={{ fontSize: '12px', lineHeight: 1.55, color: '#64748b', margin: '4px 0 0 0' }}>
                          Ask about tool pricing, subscription waste, audits, or stack recommendations.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* What I can help with — 2-Column Compact Interactive Tiles */}
                  <div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: '#94a3b8',
                        marginBottom: '8px',
                        paddingLeft: '4px',
                      }}
                    >
                      What I can help with
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {CAPABILITIES.map((cap) => (
                        <button
                          key={cap.title}
                          onClick={() => sendMessage(cap.prompt)}
                          style={{
                            textAlign: 'left',
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            transition: 'border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            Object.assign((e.currentTarget as HTMLElement).style, {
                              borderColor: '#cbd5e1',
                              background: '#f8fafc',
                              transform: 'translateY(-1px)',
                            });
                          }}
                          onMouseLeave={(e) => {
                            Object.assign((e.currentTarget as HTMLElement).style, {
                              borderColor: '#e2e8f0',
                              background: '#ffffff',
                              transform: 'none',
                            });
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: '#f1f5f9',
                                color: '#1e3a5f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {cap.icon}
                            </div>
                            <svg
                              style={{ width: '13px', height: '13px', color: '#cbd5e1' }}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a', lineHeight: 1.25 }}>
                              {cap.title}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b', lineHeight: 1.35, marginTop: '2px' }}>
                              {cap.desc}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clean 5-Item Suggested Inquiries with "View More" Toggle */}
                  <div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: '#94a3b8',
                        marginBottom: '8px',
                        paddingLeft: '4px',
                      }}
                    >
                      Suggested Inquiries
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {visibleSuggestions.map((item) => (
                        <button
                          key={item.text}
                          onClick={() => sendMessage(item.text)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#334155',
                            padding: '8px 11px',
                            borderRadius: '9px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            transition: 'border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            Object.assign((e.currentTarget as HTMLElement).style, {
                              borderColor: '#cbd5e1',
                              background: '#f8fafc',
                              color: '#0f172a',
                            });
                          }}
                          onMouseLeave={(e) => {
                            Object.assign((e.currentTarget as HTMLElement).style, {
                              borderColor: '#e2e8f0',
                              background: '#ffffff',
                              color: '#334155',
                            });
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div style={{ color: '#94a3b8', flexShrink: 0 }}>{getIconForCategory(item.category)}</div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.text}
                            </span>
                          </div>
                          <svg
                            style={{ width: '13px', height: '13px', color: '#cbd5e1', flexShrink: 0 }}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      ))}
                    </div>

                    {/* Subtle "View More / Show Fewer" Toggle */}
                    {combinedSuggestions.length > 5 && (
                      <button
                        onClick={() => setShowAllSuggestions((prev) => !prev)}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          padding: '6px 8px',
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '11.5px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#0f172a';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#64748b';
                        }}
                      >
                        <span>
                          {showAllSuggestions
                            ? 'Show fewer questions'
                            : `View ${combinedSuggestions.length - 5} more questions`}
                        </span>
                        <svg
                          style={{
                            width: '13px',
                            height: '13px',
                            transform: showAllSuggestions ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s ease',
                          }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // ── ACTIVE CONVERSATION THREAD ───────────────────
                <>
                  {messages.map((msg, i) => (
                    <m.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {msg.role === 'assistant' ? (
                        // Assistant Message Card
                        <div style={{ maxWidth: '98%', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                            <AssistantAvatar size={20} />
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>StackSave AI</span>
                            <span style={{ fontSize: '10.5px', color: MUTED }}>&middot;</span>
                            <span style={{ fontSize: '10.5px', color: MUTED }}>{fmt(msg.ts)}</span>
                          </div>

                          <div style={{ paddingLeft: '27px' }}>
                            <div
                              style={{
                                background: CARD_BG,
                                border: CARD_BORDER,
                                borderRadius: '3px 14px 14px 14px',
                                padding: '12px 14px',
                                boxShadow: CARD_SHADOW,
                              }}
                            >
                              <div dangerouslySetInnerHTML={{ __html: formatAssistantResponse(msg.content) }} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        // User Message Bubble
                        <div className="chatbot-user-bubble" style={{ maxWidth: '78%' }}>
                          <div
                            style={{
                              background: NAVY,
                              color: '#ffffff',
                              borderRadius: '14px 14px 3px 14px',
                              padding: '9px 14px',
                              fontSize: '12.5px',
                              fontWeight: 500,
                              lineHeight: 1.55,
                              letterSpacing: '-0.005em',
                              boxShadow: '0 2px 6px rgba(30,58,95,0.18)',
                            }}
                          >
                            {msg.content}
                          </div>
                          <div style={{ textAlign: 'right', marginTop: '3px' }}>
                            <span style={{ fontSize: '10px', color: MUTED }}>{fmt(msg.ts)}</span>
                          </div>
                        </div>
                      )}
                    </m.div>
                  ))}

                  {/* Typing Indicator */}
                  {loading && (
                    <m.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                        <AssistantAvatar size={20} />
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>StackSave AI</span>
                      </div>
                      <div style={{ paddingLeft: '27px' }}>
                        <div
                          style={{
                            background: CARD_BG,
                            border: CARD_BORDER,
                            borderRadius: '3px 14px 14px 14px',
                            padding: '11px 16px',
                            display: 'inline-block',
                            boxShadow: CARD_SHADOW,
                          }}
                        >
                          <TypingDots />
                        </div>
                      </div>
                    </m.div>
                  )}
                </>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── CONVERSATION MODE QUICK CHIPS TRAY ──────────── */}
            {!isConversationEmpty && !loading && (
              <div
                className="chatbot-suggestions-row"
                style={{
                  borderTop: DIVIDER,
                  background: SURFACE_WHITE,
                  padding: '7px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  scrollbarWidth: 'none',
                }}
              >
                <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8', flexShrink: 0 }}>
                  Suggested:
                </span>
                {combinedSuggestions.slice(0, 4).map((item) => (
                  <button
                    key={item.text}
                    onClick={() => sendMessage(item.text)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#475569',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      Object.assign((e.currentTarget as HTMLElement).style, {
                        background: '#f1f5f9',
                        borderColor: '#cbd5e1',
                        color: '#0f172a',
                      });
                    }}
                    onMouseLeave={(e) => {
                      Object.assign((e.currentTarget as HTMLElement).style, {
                        background: '#f8fafc',
                        borderColor: '#e2e8f0',
                        color: '#475569',
                      });
                    }}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            )}

            {/* ── BOTTOM COMPOSER: Fixed Command Bar ─────────── */}
            <div
              className="chatbot-composer"
              style={{
                borderTop: isConversationEmpty ? DIVIDER : 'none',
                background: SURFACE_WHITE,
                padding: '10px 12px 13px',
                flexShrink: 0,
              }}
            >
              <div
                ref={composerWrapRef}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '7px 8px 7px 14px',
                  transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about AI spend, pricing, audits, or recommendations..."
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    lineHeight: 1.4,
                    padding: '3px 0',
                    fontFamily: 'inherit',
                    opacity: loading ? 0.5 : 1,
                  }}
                  onFocus={() => {
                    if (composerWrapRef.current) {
                      Object.assign(composerWrapRef.current.style, {
                        borderColor: '#94a3b8',
                        background: SURFACE_WHITE,
                        boxShadow: '0 0 0 3px rgba(30,58,95,0.06)',
                      });
                    }
                  }}
                  onBlur={() => {
                    if (composerWrapRef.current) {
                      Object.assign(composerWrapRef.current.style, {
                        borderColor: '#e2e8f0',
                        background: '#f8fafc',
                        boxShadow: 'none',
                      });
                    }
                  }}
                />
                <m.button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    background: NAVY,
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !input.trim() ? 0.28 : 1,
                    flexShrink: 0,
                    transition: 'opacity 0.15s ease, background 0.15s ease',
                  }}
                  whileHover={!loading && input.trim() ? { scale: 1.05 } : {}}
                  whileTap={!loading && input.trim() ? { scale: 0.93 } : {}}
                  onMouseEnter={(e) => {
                    if (!loading && input.trim()) {
                      (e.currentTarget as HTMLElement).style.background = '#264d7a';
                    }
                  }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = NAVY; }}
                  aria-label="Send message"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </m.button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
