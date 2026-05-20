// ============================================================
// Pricing Service — Capture & Manage Pricing Snapshots
// ============================================================
// Batch 1: Utilities for capturing pricing snapshots at audit time
// Used for change detection in future batches

import { PricingSnapshot } from '../types';
import { TOOL_CATALOG } from '../audit-engine/catalog';

/**
 * Captures current pricing catalog as immutable snapshot
 * Called at audit time; later used for comparison in re-audits
 *
 * @returns PricingSnapshot object
 */
export function capturePricingSnapshot(): PricingSnapshot {
  const snapshot: PricingSnapshot = {
    capturedAt: new Date().toISOString(),
    catalogVersion: '1.0', // Increment when pricing schema changes
    tools: {},
  };

  // Extract pricing for each tool in catalog
  for (const toolData of TOOL_CATALOG) {
    snapshot.tools[toolData.id] = {
      name: toolData.name,
      plans: {},
    };

    // Store plan prices for this tool
    for (const plan of toolData.plans) {
      snapshot.tools[toolData.id].plans[plan.id] = {
        monthlyPricePerSeat: plan.monthlyPricePerSeat,
        annualPricePerSeat: plan.annualPricePerSeat,
      };
    }
  }

  return snapshot;
}

/**
 * Generates hash of pricing snapshot for fast comparison
 * Used to detect if pricing has changed between audits
 *
 * @param snapshot PricingSnapshot to hash
 * @returns SHA256 hex string
 */
export function hashPricingSnapshot(snapshot: PricingSnapshot): string {
  // For Batch 1: simple JSON serialization
  // Future: implement with crypto.createHash('sha256')
  const crypto = require('crypto');
  const data = JSON.stringify(snapshot, Object.keys(snapshot).sort());
  return crypto.createHash('sha256').update(data).digest('hex');
}
