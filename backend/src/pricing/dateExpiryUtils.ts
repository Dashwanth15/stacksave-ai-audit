// ============================================================
// Date & Expiration Utilities — StackSave AI Spend & Intelligence
// Generic detection of promotion expiry dates and ended signals.
// Pure utility — no external dependencies.
// ============================================================

export interface DateExpiryCheckResult {
  isExpired: boolean;
  expiredReason?: string;
  endDate?: string;
  hasNegativeSignal: boolean;
  negativeReason?: string;
}

/**
 * Generic expiration check for promotional content.
 * Evaluates explicit end dates, past year references, and negative status language.
 */
export function checkGenericExpiration(
  text: string,
  referenceDate: Date = new Date()
): DateExpiryCheckResult {
  const result: DateExpiryCheckResult = {
    isExpired: false,
    hasNegativeSignal: false,
  };

  if (!text || text.trim().length === 0) {
    return result;
  }

  // 1. Negative status language patterns
  const negativePatterns: { regex: RegExp; reason: string }[] = [
    {
      regex: /(?:promotional\s+offer|promotion|offer|deal|campaign|scheme|benefit|redemption|programme)\s+(?:has\s+)?(?:ended|expired|closed|concluded|lapsed|terminated|discontinued)/i,
      reason: 'Official terms explicitly state promotion has ended',
    },
    {
      regex: /(?:this|the)\s+(?:promotional\s+offer|promotion|offer|deal|campaign)\s+is\s+(?:no longer available|closed|over|ended|expired)/i,
      reason: 'Official source indicates offer is no longer available',
    },
    {
      regex: /(?:offer|promotion|redemption)\s+(?:period|window)\s+(?:is\s+)?(?:over|ended|closed|lapsed)/i,
      reason: 'Promotion redemption window has ended',
    },
    {
      regex: /\b(?:campaign ended|promotion ended|promotional offer ended|offer ended|deal ended)\b/i,
      reason: 'Official terms state campaign/promotion has ended',
    },
    {
      regex: /\b(?:page not found|error 404|404 not found|page you are looking for has been deleted)\b/i,
      reason: 'Page returned not found / deleted error',
    },
  ];

  for (const p of negativePatterns) {
    if (p.regex.test(text)) {
      result.hasNegativeSignal = true;
      result.negativeReason = p.reason;
      result.isExpired = true;
      result.expiredReason = p.reason;
      break;
    }
  }

  // 2. Explicit end date detection
  const endPatterns: RegExp[] = [
    /(?:valid|offer|promotion|deal|campaign|available)\s+(?:until|through|thru|to|ends\s+on)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    /(?:expires|expiry|ends|validity|end\s+date)\s*[:\-–]?\s*(?:on\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    /(?:validity|period|offer|promotion|deal|promotional\s+offer)\s+(?:ended|concluded|expired|closed)\s+(?:on\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    /(?:ended|expired|concluded)\s+(?:on\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    /(?:redemption|claim|activate|redeem)\s+(?:by|deadline|until|through)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    /(?:until|before)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const pat of endPatterns) {
    const match = pat.exec(text);
    if (match && match[1]) {
      const rawDateStr = match[1].trim();
      result.endDate = rawDateStr;
      const parsed = Date.parse(rawDateStr);
      if (!isNaN(parsed)) {
        const expDate = new Date(parsed);
        expDate.setHours(23, 59, 59, 999);
        if (referenceDate.getTime() > expDate.getTime()) {
          result.isExpired = true;
          result.expiredReason = `Promotion validity ended on ${rawDateStr} (prior to current date ${referenceDate.toISOString().split('T')[0]})`;
          return result;
        }
      }
    }
  }

  // 3. Past year mentions in promotion validity context
  const pastYearMatch = /(?:valid\s+in|during|promotion\s+period\s*:\s*.*?)(\b202[0-5]\b)/i.exec(text);
  if (pastYearMatch && pastYearMatch[1] && referenceDate.getFullYear() >= 2026) {
    result.isExpired = true;
    result.expiredReason = `Promotion references past year ${pastYearMatch[1]} and has concluded`;
    return result;
  }

  return result;
}
