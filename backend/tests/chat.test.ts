import { describe, it, expect } from 'vitest';
import { sanitizeAssistantReply } from '../src/routes/chat';

describe('Chat Sanitizer & Active Model Compatibility', () => {
  it('strips XML think tags cleanly', () => {
    const raw = '<think>Let me think about pricing for Cursor</think>Cursor Pro is $20/month.';
    expect(sanitizeAssistantReply(raw)).toBe('Cursor Pro is $20/month.');
  });

  it('strips unclosed think tags at beginning', () => {
    const raw = '<think>\nAnalyze user request\nCursor is an AI editor.';
    expect(sanitizeAssistantReply(raw)).toContain('Cursor is an AI editor.');
  });

  it('preserves clean structured Markdown responses', () => {
    const raw = '**Cursor vs GitHub Copilot**\n\n| Tool | Price |\n| --- | --- |\n| Cursor | $20/mo |\n| Copilot | $10/mo |';
    expect(sanitizeAssistantReply(raw)).toBe(raw);
  });

  it('strips "Thinking Process:" headers and drafts', () => {
    const raw = "Here's a thinking process:\n1. Analyze user input\n\nDraft: Cursor Pro costs $20/mo.";
    expect(sanitizeAssistantReply(raw)).toBe('Cursor Pro costs $20/mo.');
  });
});
