// Currency formatter
export function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

export function formatCurrencyFull(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Percentage formatter
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

// Relative time (for "audited 2 days ago")
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

// Severity label
export function severityLabel(severity: string): string {
  const map: Record<string, string> = {
    high: 'High Impact',
    medium: 'Medium Impact',
    low: 'Low Impact',
    info: 'Plan Verified',
  };
  return map[severity] || severity;
}

// Insight type to human label
export function insightTypeLabel(type: string): string {
  const map: Record<string, string> = {
    overpaid_plan: 'Overpaid Plan',
    unused_seats: 'Unused Seats',
    overlapping_tools: 'Tool Overlap',
    cheaper_alternative: 'Cheaper Alternative',
    annual_discount: 'Annual Savings',
    retail_vs_credits: 'Credit Opportunity',
    already_optimal: 'Optimization Tip',
  };
  return map[type] || type;
}
