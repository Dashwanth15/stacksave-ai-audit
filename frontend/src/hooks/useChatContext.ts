// ============================================================
// useChatContext — Structured Page Context Hook for AI Assistant
//
// Gathers structured, lightweight context from the current page,
// active audit results, and build-stack recommendations.
// Powers context-aware responses and dynamic quick questions.
// ============================================================

import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import type { AuditResult } from '../types';
import type { StackRecommendation } from '../types';
import { getUserSessionItem } from '../utils/userSession';

export interface AuditChatContext {
  auditId?: string;
  companyName?: string;
  teamSize?: number;
  useCase?: string;
  optimizationGoal?: string;
  billingCycle?: string;
  totalMonthlySpend?: number;
  estimatedMonthlySavings?: number;
  savingsPercentage?: number;
  optimizedMonthlySpend?: number;
  tools?: Array<{
    toolId: string;
    toolName: string;
    plan: string;
    seats: number;
    monthlySpend: number;
  }>;
  insights?: Array<{
    toolId: string;
    toolName: string;
    type: string;
    severity: string;
    suggestion: string;
    potentialMonthlySaving: number;
    confidence?: string;
  }>;
}

export interface BuildStackChatContext {
  domain?: string;
  domainLabel?: string;
  teamSize?: number;
  budgetFormatted?: string;
  strategy?: string;
  strategyLabel?: string;
  optimizationGoal?: string;
  optimizationGoalLabel?: string;
  requirementCount?: number;
  primaryTool?: {
    toolId: string;
    toolName: string;
    recommendedPlan: string;
    monthlyCostPerSeat: number;
    estimatedMonthlyCostPerTeam: number;
    workflowFitScore: number;
    whyRecommended?: string;
    capabilityHighlights: string[];
  };
  secondaryTool?: {
    toolId: string;
    toolName: string;
    recommendedPlan: string;
    estimatedMonthlyCostPerTeam: number;
    whyRecommended?: string;
  };
  totalMonthlyCost?: number;
  confidenceScore?: number;
  coverageScore?: number;
  whyThisStack?: string;
  rejectedTools?: Array<{
    toolName: string;
    whyNotSelected: string;
    rejectionCategory?: string;
  }>;
}

export interface ChatContext {
  page: 'audit-results' | 'build-stack-results' | 'audit-form' | 'build-stack-form' | 'landing' | 'other';
  pageTitle: string;
  quickQuestions: string[];
  auditContext?: AuditChatContext;
  buildStackContext?: BuildStackChatContext;
}

export function useChatContext(): ChatContext {
  const location = useLocation();
  const pathname = location.pathname;

  return useMemo(() => {
    // ── 1. Audit Results Page (/audit/:id) ───────────────────────
    if (pathname.startsWith('/audit/') && !pathname.endsWith('/diff')) {
      let auditData: AuditResult | null = null;
      try {
        // Read from user-scoped storage — won't bleed across user sessions
        const stored = getUserSessionItem('currentAudit');
        if (stored) {
          auditData = JSON.parse(stored);
        }
      } catch {
        // ignore parse error
      }

      const auditContext: AuditChatContext | undefined = auditData ? {
        auditId: auditData.auditId,
        companyName: auditData.companyName,
        teamSize: auditData.teamSize,
        useCase: auditData.useCase,
        optimizationGoal: auditData.optimizationGoal,
        billingCycle: auditData.billingCycle,
        totalMonthlySpend: auditData.totalMonthlySpend,
        estimatedMonthlySavings: auditData.estimatedMonthlySavings,
        savingsPercentage: auditData.savingsPercentage,
        optimizedMonthlySpend: auditData.optimizedMonthlySpend,
        tools: auditData.tools?.map((t) => ({
          toolId: t.toolId,
          toolName: t.toolId,
          plan: t.plan,
          seats: t.seats,
          monthlySpend: t.monthlySpend,
        })),
        insights: auditData.insights?.slice(0, 6).map((i) => ({
          toolId: i.toolId,
          toolName: i.toolName,
          type: i.type,
          severity: i.severity,
          suggestion: i.suggestion,
          potentialMonthlySaving: i.potentialMonthlySaving,
          confidence: i.confidenceScore ? `${i.confidenceScore}%` : i.confidence,
        })),
      } : undefined;

      return {
        page: 'audit-results',
        pageTitle: 'Audit Intelligence Report',
        quickQuestions: [
          'Explain my audit findings',
          'How can I reduce my current spend?',
          'Why were these tool changes suggested?',
          'Compare my active subscriptions',
        ],
        auditContext,
      };
    }

    // ── 2. Build Stack Results Page (/build-stack/results) ────────
    if (pathname === '/build-stack/results') {
      let recData: StackRecommendation | null = null;
      try {
        // Read from user-scoped storage — won't bleed across user sessions
        const raw = getUserSessionItem('stackRecommendation');
        if (raw) {
          recData = JSON.parse(raw);
        }
      } catch {
        // ignore parse error
      }

      let buildStackContext: BuildStackChatContext | undefined;
      if (recData) {
        const ctx = recData.userContextSummary;
        const bestStack = recData.categories?.bestOverall?.recommendedStack || recData.stacks?.bestOverall;
        const p = bestStack?.primary;
        const s = bestStack?.secondary;

        buildStackContext = {
          domain: ctx?.domain,
          domainLabel: ctx?.domainLabel,
          teamSize: ctx?.teamSize,
          budgetFormatted: ctx?.budgetFormatted,
          strategy: ctx?.strategy,
          strategyLabel: ctx?.strategyLabel,
          optimizationGoal: ctx?.optimizationGoal,
          optimizationGoalLabel: ctx?.optimizationGoalLabel,
          requirementCount: ctx?.requirementCount,
          primaryTool: p ? {
            toolId: p.toolId,
            toolName: p.toolName,
            recommendedPlan: p.recommendedPlan,
            monthlyCostPerSeat: p.monthlyCostPerSeat,
            estimatedMonthlyCostPerTeam: p.estimatedMonthlyCostPerTeam,
            workflowFitScore: p.workflowFitScore,
            whyRecommended: p.whyRecommended || '',
            capabilityHighlights: p.capabilityHighlights || [],
          } : undefined,
          secondaryTool: s ? {
            toolId: s.toolId,
            toolName: s.toolName,
            recommendedPlan: s.recommendedPlan,
            estimatedMonthlyCostPerTeam: s.estimatedMonthlyCostPerTeam,
            whyRecommended: s.whyRecommended || '',
          } : undefined,
          totalMonthlyCost: bestStack?.estimatedMonthlyCost,
          confidenceScore: bestStack?.confidenceScore,
          coverageScore: bestStack?.coverageResult?.coverageScore,
          whyThisStack: bestStack?.whyThisStack,
          rejectedTools: recData.alternatives?.slice(0, 4).map((a) => ({
            toolName: a.toolName,
            whyNotSelected: a.whyNotSelected,
            rejectionCategory: a.rejectionCategory || '',
          })),
        };
      }

      return {
        page: 'build-stack-results',
        pageTitle: 'Recommended AI Stack',
        quickQuestions: [
          'Why was this stack recommended?',
          'Why this primary tool over others?',
          'Why were alternative tools rejected?',
          'Can I reduce the overall stack cost?',
        ],
        buildStackContext,
      };
    }

    // ── 3. Audit Form Page (/audit) ──────────────────────────────
    if (pathname === '/audit') {
      return {
        page: 'audit-form',
        pageTitle: 'Audit Setup',
        quickQuestions: [
          'How does StackSave calculate savings?',
          'Which tools can I audit together?',
          'What is the difference between monthly and annual billing?',
          'Which AI coding tool is cheapest?',
        ],
      };
    }

    // ── 4. Build Stack Form Page (/build-stack) ──────────────────
    if (pathname === '/build-stack') {
      return {
        page: 'build-stack-form',
        pageTitle: 'Build My Stack Setup',
        quickQuestions: [
          'What does Build My Stack do?',
          'How do optimization goals affect recommendations?',
          'Claude vs ChatGPT — which is better value?',
          'When should I add an API layer?',
        ],
      };
    }

    // ── 5. Landing Page (/) ──────────────────────────────────────
    if (pathname === '/') {
      return {
        page: 'landing',
        pageTitle: 'StackSave AI Spend Intelligence',
        quickQuestions: [
          'Which AI coding tool is cheapest?',
          'Claude vs ChatGPT comparison',
          'How do StackSave audits work?',
          'How does StackSave identify wasted spend?',
        ],
      };
    }

    // ── 6. Default Fallback ──────────────────────────────────────
    return {
      page: 'other',
      pageTitle: 'StackSave',
      quickQuestions: [
        'Which AI coding tool is cheapest?',
        'Claude vs ChatGPT — which is better value?',
        'How do I reduce AI SaaS spend?',
        'Should I choose annual or monthly billing?',
      ],
    };
  }, [pathname]);
}
