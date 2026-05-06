// ============================================================
// Tool Catalog — Frontend Display Data
// Plans and pricing kept in sync with backend/audit-engine/catalog.ts
// ============================================================

import { ToolInfo } from '../types';

export const TOOLS: ToolInfo[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    icon: '⚡',
    category: 'AI IDE',
    defaultPlan: 'pro',
    plans: [
      { id: 'hobby', label: 'Hobby (Free)', monthlyPricePerSeat: 0 },
      { id: 'pro', label: 'Pro ($20/user)', monthlyPricePerSeat: 20 },
      { id: 'business', label: 'Business ($40/user)', monthlyPricePerSeat: 40 },
    ],
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    icon: '🐙',
    category: 'AI IDE',
    defaultPlan: 'business',
    plans: [
      { id: 'free', label: 'Free', monthlyPricePerSeat: 0 },
      { id: 'individual', label: 'Individual ($10/user)', monthlyPricePerSeat: 10 },
      { id: 'business', label: 'Business ($19/user)', monthlyPricePerSeat: 19 },
      { id: 'enterprise', label: 'Enterprise ($39/user)', monthlyPricePerSeat: 39 },
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: '🤖',
    category: 'AI Chat',
    defaultPlan: 'pro',
    plans: [
      { id: 'free', label: 'Free', monthlyPricePerSeat: 0 },
      { id: 'pro', label: 'Pro ($20/user)', monthlyPricePerSeat: 20 },
      { id: 'max', label: 'Max ($100/user)', monthlyPricePerSeat: 100 },
      { id: 'team', label: 'Team ($25/user, min 5)', monthlyPricePerSeat: 25 },
      { id: 'enterprise', label: 'Enterprise (Custom)', monthlyPricePerSeat: 0 },
    ],
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: '💬',
    category: 'AI Chat',
    defaultPlan: 'plus',
    plans: [
      { id: 'free', label: 'Free', monthlyPricePerSeat: 0 },
      { id: 'plus', label: 'Plus ($20/user)', monthlyPricePerSeat: 20 },
      { id: 'team', label: 'Team ($25/user, min 2)', monthlyPricePerSeat: 25 },
      { id: 'enterprise', label: 'Enterprise (Custom)', monthlyPricePerSeat: 0 },
      { id: 'api', label: 'API Direct (Pay-as-you-go)', monthlyPricePerSeat: 0, isPayPerUse: true },
    ],
  },
  {
    id: 'anthropic-api',
    name: 'Anthropic API',
    icon: '🔬',
    category: 'API',
    defaultPlan: 'pay-as-you-go',
    plans: [
      { id: 'pay-as-you-go', label: 'Pay As You Go', monthlyPricePerSeat: 0, isPayPerUse: true },
    ],
  },
  {
    id: 'openai-api',
    name: 'OpenAI API',
    icon: '🌐',
    category: 'API',
    defaultPlan: 'pay-as-you-go',
    plans: [
      { id: 'pay-as-you-go', label: 'Pay As You Go', monthlyPricePerSeat: 0, isPayPerUse: true },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: '✨',
    category: 'AI Chat',
    defaultPlan: 'advanced',
    plans: [
      { id: 'free', label: 'Free', monthlyPricePerSeat: 0 },
      { id: 'advanced', label: 'Advanced ($20/user)', monthlyPricePerSeat: 19.99 },
      { id: 'workspace', label: 'Workspace Business ($20/user)', monthlyPricePerSeat: 20 },
      { id: 'api', label: 'API (AI Studio)', monthlyPricePerSeat: 0, isPayPerUse: true },
    ],
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    icon: '🏄',
    category: 'AI IDE',
    defaultPlan: 'pro',
    plans: [
      { id: 'free', label: 'Free', monthlyPricePerSeat: 0 },
      { id: 'pro', label: 'Pro ($15/user)', monthlyPricePerSeat: 15 },
      { id: 'teams', label: 'Teams ($35/user)', monthlyPricePerSeat: 35 },
    ],
  },
];

export const USE_CASES = [
  { id: 'coding', label: 'Coding & Development' },
  { id: 'writing', label: 'Writing & Content' },
  { id: 'data', label: 'Data Analysis' },
  { id: 'research', label: 'Research & Summarization' },
  { id: 'mixed', label: 'Mixed / General' },
] as const;

export function getToolById(toolId: string): ToolInfo | undefined {
  return TOOLS.find((t) => t.id === toolId);
}
