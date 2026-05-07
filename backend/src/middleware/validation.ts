// ============================================================
// Validation Helpers — StackSave AI Audit
//
// Centralized validation for API inputs. Keeps route handlers
// clean and makes validation rules testable independently.
// ============================================================

import { AuditRequest, ToolEntry, UseCase, ToolId } from '../types';

const VALID_TOOL_IDS: ToolId[] = [
  'cursor', 'github-copilot', 'claude', 'chatgpt',
  'anthropic-api', 'openai-api', 'gemini', 'windsurf',
];

const VALID_USE_CASES: UseCase[] = ['coding', 'writing', 'data', 'research', 'mixed'];

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAuditRequest(body: unknown): ValidationResult {
  const req = body as AuditRequest;

  if (!req || typeof req !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  // Tools array
  if (!req.tools || !Array.isArray(req.tools) || req.tools.length === 0) {
    return { valid: false, error: 'At least one tool is required' };
  }

  if (req.tools.length > 8) {
    return { valid: false, error: 'Maximum 8 tools allowed per audit' };
  }

  // Team size
  if (!req.teamSize || typeof req.teamSize !== 'number' || req.teamSize < 1) {
    return { valid: false, error: 'Team size must be at least 1' };
  }

  if (req.teamSize > 10000) {
    return { valid: false, error: 'Team size must be under 10,000' };
  }

  // Use case
  if (!req.useCase || !VALID_USE_CASES.includes(req.useCase)) {
    return { valid: false, error: `Primary use case must be one of: ${VALID_USE_CASES.join(', ')}` };
  }

  // Validate each tool entry
  const seenTools = new Set<string>();
  for (const tool of req.tools) {
    const toolResult = validateToolEntry(tool);
    if (!toolResult.valid) return toolResult;

    // Check for duplicate tools
    if (seenTools.has(tool.toolId)) {
      return { valid: false, error: `Duplicate tool: ${tool.toolId}` };
    }
    seenTools.add(tool.toolId);
  }

  return { valid: true };
}

function validateToolEntry(tool: ToolEntry): ValidationResult {
  if (!tool.toolId || !VALID_TOOL_IDS.includes(tool.toolId as ToolId)) {
    return { valid: false, error: `Invalid tool ID: ${tool.toolId || 'missing'}` };
  }

  if (!tool.plan || typeof tool.plan !== 'string') {
    return { valid: false, error: `Missing plan for ${tool.toolId}` };
  }

  if (typeof tool.monthlySpend !== 'number' || tool.monthlySpend < 0) {
    return { valid: false, error: `Invalid monthly spend for ${tool.toolId}` };
  }

  if (tool.monthlySpend > 100000) {
    return { valid: false, error: `Monthly spend exceeds maximum for ${tool.toolId}` };
  }

  if (!tool.seats || typeof tool.seats !== 'number' || tool.seats < 1) {
    return { valid: false, error: `Seats must be at least 1 for ${tool.toolId}` };
  }

  if (tool.seats > 10000) {
    return { valid: false, error: `Seats exceed maximum for ${tool.toolId}` };
  }

  if (!tool.useCase || !VALID_USE_CASES.includes(tool.useCase)) {
    return { valid: false, error: `Invalid use case for ${tool.toolId}` };
  }

  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email address' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email address too long' };
  }

  return { valid: true };
}
