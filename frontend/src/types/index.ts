// ============================================================
// Shared TypeScript Types — Frontend
// Keep in sync with backend/src/types/index.ts
// ============================================================

export type ToolId =
  | 'cursor'
  | 'github-copilot'
  | 'claude'
  | 'chatgpt'
  | 'anthropic-api'
  | 'openai-api'
  | 'gemini'
  | 'windsurf';

export type UseCase = 'coding' | 'writing' | 'data' | 'research' | 'mixed';

export type InsightSeverity = 'high' | 'medium' | 'low' | 'info';

export type InsightType =
  | 'overpaid_plan'
  | 'unused_seats'
  | 'overlapping_tools'
  | 'cheaper_alternative'
  | 'annual_discount'
  | 'retail_vs_credits'
  | 'already_optimal';

export interface ToolEntry {
  toolId: ToolId;
  plan: string;
  monthlySpend: number;
  seats: number;
  useCase: UseCase;
}

export interface AuditRequest {
  tools: ToolEntry[];
  teamSize: number;
  companyName?: string;
  useCase: UseCase;
}

export interface Insight {
  toolId: ToolId;
  toolName: string;
  type: InsightType;
  severity: InsightSeverity;
  message: string;
  suggestion: string;
  reason: string;
  potentialMonthlySaving: number;
  currentMonthlySpend: number;
  recommendedMonthlySpend: number;
}

export interface AuditResult {
  auditId: string;
  createdAt: string;
  totalMonthlySpend: number;
  optimizedMonthlySpend: number;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  savingsPercentage: number;
  isAlreadyOptimal: boolean;
  isHighSavings: boolean;
  insights: Insight[];
  aiSummary: string;
  publicUrl: string;
  companyName?: string;
  teamSize: number;
  tools: ToolEntry[];
}

export interface LeadCaptureRequest {
  email: string;
  auditId: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  _hp?: string;
}

// Tool display info (static, frontend only)
export interface ToolInfo {
  id: ToolId;
  name: string;
  icon: string;        // emoji for now, can swap for SVG
  category: string;
  plans: PlanOption[];
  defaultPlan: string;
}

export interface PlanOption {
  id: string;
  label: string;
  monthlyPricePerSeat: number;
  isPayPerUse?: boolean;
}
