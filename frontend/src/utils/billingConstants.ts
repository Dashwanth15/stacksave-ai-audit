// ============================================================
// Billing Constants — StackSave Pricing, Plans & Promotional Config
// Single source of truth for pricing, promotional cues & calculations.
// ============================================================

export type BillingPlanKey = 'quarterly' | 'yearly';

export interface PromotionConfig {
  promotionEnabled: boolean;
  promotionLabel: string;
  headline: string;
  subheadline: string;
  discountPercent: number;
  savingsPercentage: number;
  referencePrice: number;
  promotionalPrice: number;
  referencePriceQuarterly: number;
  promotionalPriceQuarterly: number;
  referencePriceYearly: number;
  promotionalPriceYearly: number;
  savingsVsQuarterly: number;
  promotionStartDate?: string;
  promotionEndDate?: string;
}

/**
 * Centralized promotional configuration.
 * Can be modified or disabled without changing UI component logic.
 */
export const PROMOTION_CONFIG: PromotionConfig = {
  promotionEnabled: true,
  promotionLabel: 'LIMITED-TIME OFFER',
  headline: 'Get 50% Off StackSave Premium',
  subheadline: 'Upgrade now and get more value, more control, and more savings.',
  discountPercent: 50,
  savingsPercentage: 50,
  referencePrice: 398,
  promotionalPrice: 199,
  referencePriceQuarterly: 118,
  promotionalPriceQuarterly: 59,
  referencePriceYearly: 398,
  promotionalPriceYearly: 199,
  savingsVsQuarterly: 37, // 4 quarters = 4 × ₹59 = ₹236; ₹236 - ₹199 = ₹37
};

export const BILLING_PRICING = {
  quarterly: {
    originalPrice: PROMOTION_CONFIG.referencePriceQuarterly,
    price: PROMOTION_CONFIG.promotionalPriceQuarterly,
    cadenceLabel: '3 months',
    discountPercent: PROMOTION_CONFIG.discountPercent,
  },
  yearly: {
    originalPrice: PROMOTION_CONFIG.referencePriceYearly,
    price: PROMOTION_CONFIG.promotionalPriceYearly,
    cadenceLabel: 'year',
    discountPercent: PROMOTION_CONFIG.discountPercent,
    savingsVsQuarterly: PROMOTION_CONFIG.savingsVsQuarterly,
  },
} as const;

/**
 * Checks if the promotion is currently active based on enabled flag and dates.
 */
export function isPromotionActive(config: PromotionConfig = PROMOTION_CONFIG): boolean {
  if (!config.promotionEnabled) return false;
  const now = Date.now();
  if (config.promotionStartDate && now < new Date(config.promotionStartDate).getTime()) {
    return false;
  }
  if (config.promotionEndDate && now > new Date(config.promotionEndDate).getTime()) {
    return false;
  }
  return true;
}

/**
 * Calculate genuine percentage savings from original and current prices.
 */
export function calculateDiscountPercent(original: number, current: number): number {
  if (!original || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

/**
 * Format plan discount badge string.
 * Example: "50% OFF"
 */
export function formatDiscountBadge(plan: BillingPlanKey): string {
  if (!isPromotionActive()) return '';
  const config = BILLING_PRICING[plan];
  const percent = calculateDiscountPercent(config.originalPrice, config.price);
  if (percent <= 0) return '';
  return `${percent}% OFF`;
}

/**
 * Format original strikethrough price string.
 * Example: "₹118" or "₹398"
 */
export function formatOriginalPrice(plan: BillingPlanKey): string {
  if (!isPromotionActive()) return '';
  const config = BILLING_PRICING[plan];
  if (!config.originalPrice || config.originalPrice <= config.price) return '';
  return `₹${config.originalPrice}`;
}

/**
 * Format active price string.
 * Example: "₹59" or "₹199"
 */
export function formatCurrentPrice(plan: BillingPlanKey): string {
  const config = BILLING_PRICING[plan];
  return `₹${config.price}`;
}

/**
 * Format per-month breakdown string.
 * Example: "₹19.67 per month" for quarterly, "₹16.58 per month" for yearly.
 */
export function formatMonthlyBreakdown(plan: BillingPlanKey): string {
  const config = BILLING_PRICING[plan];
  const months = plan === 'quarterly' ? 3 : 12;
  const monthlyCost = (config.price / months).toFixed(2);
  return `₹${monthlyCost} per month`;
}

/**
 * Format yearly savings string.
 * Example: "Save ₹37/year"
 */
export function formatYearlySavingsBadge(): string {
  return `Save ₹${BILLING_PRICING.yearly.savingsVsQuarterly}/year`;
}

/**
 * Detailed savings explanation.
 * Example: "Yearly saves ₹37 compared to quarterly billing"
 */
export function formatYearlySavingsComparison(): string {
  return `Yearly saves ₹${BILLING_PRICING.yearly.savingsVsQuarterly} compared to quarterly billing`;
}
