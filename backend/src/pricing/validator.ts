// ============================================================
// Pricing Validator — StackSave AI Audit
// ============================================================

import { NormalizedPlan, ValidationResult } from './types';

const MIN_PRICE = 0;
const MAX_PRICE = 10_000;          // $/seat/mo — anything above is suspicious
const SUSPICIOUS_CHANGE_PCT = 200; // >200% change from previous → flag

/**
 * Validate a freshly extracted plan array.
 * Returns errors (blocking) and warnings (non-blocking).
 */
export function validatePlans(plans: NormalizedPlan[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(plans) || plans.length === 0) {
    errors.push('No plans returned from adapter');
    return { isValid: false, isSuspicious: false, errors, warnings };
  }

  const seenIds = new Set<string>();

  for (const plan of plans) {
    // Required fields
    if (!plan.id) errors.push('Plan missing id');
    if (!plan.label) errors.push(`Plan ${plan.id} missing label`);
    if (!plan.currency) errors.push(`Plan ${plan.id} missing currency`);

    // Duplicate plan IDs
    if (seenIds.has(plan.id)) {
      errors.push(`Duplicate plan id: ${plan.id}`);
    }
    seenIds.add(plan.id);

    // Numeric price
    if (typeof plan.monthlyPricePerSeat !== 'number' || isNaN(plan.monthlyPricePerSeat)) {
      errors.push(`Plan ${plan.id}: monthlyPricePerSeat is not a number`);
    } else {
      if (plan.monthlyPricePerSeat < MIN_PRICE) {
        errors.push(`Plan ${plan.id}: price is negative (${plan.monthlyPricePerSeat})`);
      }
      if (plan.monthlyPricePerSeat > MAX_PRICE) {
        warnings.push(`Plan ${plan.id}: price ${plan.monthlyPricePerSeat} exceeds expected maximum ${MAX_PRICE}`);
      }
    }

    // Annual price sanity
    if (plan.annualPricePerSeat !== undefined) {
      if (typeof plan.annualPricePerSeat !== 'number' || isNaN(plan.annualPricePerSeat)) {
        warnings.push(`Plan ${plan.id}: annualPricePerSeat is not a number`);
      } else if (plan.annualPricePerSeat > plan.monthlyPricePerSeat * 1.1) {
        // Annual should not be more than 10% above monthly (would make no sense)
        warnings.push(`Plan ${plan.id}: annualPricePerSeat (${plan.annualPricePerSeat}) > monthlyPricePerSeat (${plan.monthlyPricePerSeat})`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    isSuspicious: false,
    errors,
    warnings,
  };
}

/**
 * Compare new plans against previously stored plans.
 * Returns true if any plan price changed by more than SUSPICIOUS_CHANGE_PCT.
 */
export function isSuspiciousChange(
  previousPlans: NormalizedPlan[],
  newPlans: NormalizedPlan[]
): boolean {
  for (const newPlan of newPlans) {
    const prev = previousPlans.find((p) => p.id === newPlan.id);
    if (!prev || prev.monthlyPricePerSeat === 0) continue;
    const changePct = Math.abs((newPlan.monthlyPricePerSeat - prev.monthlyPricePerSeat) / prev.monthlyPricePerSeat) * 100;
    if (changePct > SUSPICIOUS_CHANGE_PCT) return true;
  }
  return false;
}

/**
 * Diff two plan arrays and return a human-readable change summary.
 * Returns null if plans are identical.
 */
export function diffPlans(
  previousPlans: NormalizedPlan[],
  newPlans: NormalizedPlan[]
): string | null {
  const lines: string[] = [];

  for (const newPlan of newPlans) {
    const prev = previousPlans.find((p) => p.id === newPlan.id);
    if (!prev) {
      lines.push(`+ New plan: ${newPlan.label} @ $${newPlan.monthlyPricePerSeat}/mo`);
    } else if (prev.monthlyPricePerSeat !== newPlan.monthlyPricePerSeat) {
      const dir = newPlan.monthlyPricePerSeat > prev.monthlyPricePerSeat ? '↑' : '↓';
      lines.push(
        `${dir} ${newPlan.label}: $${prev.monthlyPricePerSeat} → $${newPlan.monthlyPricePerSeat}/mo`
      );
    }
  }

  for (const prevPlan of previousPlans) {
    const still = newPlans.find((p) => p.id === prevPlan.id);
    if (!still) {
      lines.push(`- Removed plan: ${prevPlan.label}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}
