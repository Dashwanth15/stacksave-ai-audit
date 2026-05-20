// ============================================================
// Pricing Change Detection Service — Batch 2
// ============================================================
// Detects when pricing data changes and identifies affected audits
// Uses stored pricing snapshots for deterministic comparison

import { PricingSnapshot, PricingComparison, ToolPriceChange, PlanPriceChange, AuditPricingChange, PricingChangeDetectionResult } from '../types';
import { TOOL_CATALOG } from '../audit-engine/catalog';
import { AuditModel, getFrontendUrl } from './dbService';
import { capturePricingSnapshot } from './pricingService';
import { sendReAuditNotification } from './emailService';
import { runReAudit } from './reAuditService';

/**
 * Compares two pricing snapshots and identifies what changed
 * Returns a structured comparison result
 *
 * @param oldSnapshot Pricing snapshot from earlier time
 * @param newSnapshot Pricing snapshot from later time
 * @returns PricingComparison with detailed change information
 */
export function comparePricingSnapshots(
  oldSnapshot: PricingSnapshot,
  newSnapshot: PricingSnapshot
): PricingComparison {
  const changedTools: ToolPriceChange[] = [];
  const affectedToolIds = new Set<string>();

  // Check existing tools for price changes
  for (const toolId of Object.keys(newSnapshot.tools)) {
    const oldTool = oldSnapshot.tools[toolId];
    const newTool = newSnapshot.tools[toolId];

    if (!oldTool) {
      // New tool added to catalog
      changedTools.push({
        toolId: toolId as any,
        toolName: newTool.name,
        hasAnyChange: true,
        planChanges: [],
        isNewTool: true,
      });
      affectedToolIds.add(toolId);
      continue;
    }

    // Compare plan prices for this tool
    const planChanges: PlanPriceChange[] = [];
    const allPlanIds = new Set([
      ...Object.keys(oldTool.plans),
      ...Object.keys(newTool.plans),
    ]);

    for (const planId of allPlanIds) {
      const oldPlan = oldTool.plans[planId];
      const newPlan = newTool.plans[planId];

      // Detect plan removed
      if (oldPlan && !newPlan) {
        planChanges.push({
          planId,
          planLabel: `${newTool.name} Plan`,
          oldMonthlyPrice: oldPlan.monthlyPricePerSeat,
          newMonthlyPrice: 0, // Price is gone
          monthlyDelta: -oldPlan.monthlyPricePerSeat,
          oldAnnualPrice: oldPlan.annualPricePerSeat,
          newAnnualPrice: undefined,
          annualDelta: oldPlan.annualPricePerSeat
            ? -oldPlan.annualPricePerSeat
            : undefined,
          priceChangePercent: -100,
        });
        continue;
      }

      // Detect plan added
      if (!oldPlan && newPlan) {
        planChanges.push({
          planId,
          planLabel: `${newTool.name} Plan`,
          oldMonthlyPrice: 0,
          newMonthlyPrice: newPlan.monthlyPricePerSeat,
          monthlyDelta: newPlan.monthlyPricePerSeat,
          oldAnnualPrice: undefined,
          newAnnualPrice: newPlan.annualPricePerSeat,
          annualDelta: newPlan.annualPricePerSeat,
          priceChangePercent: 100,
        });
        continue;
      }

      // Both exist — check for changes
      if (oldPlan && newPlan) {
        const monthlyDelta = newPlan.monthlyPricePerSeat - oldPlan.monthlyPricePerSeat;
        const annualDelta =
          (newPlan.annualPricePerSeat ?? 0) - (oldPlan.annualPricePerSeat ?? 0);

        // Calculate percentage change (avoid division by zero)
        let priceChangePercent = 0;
        if (oldPlan.monthlyPricePerSeat !== 0) {
          priceChangePercent =
            (monthlyDelta / oldPlan.monthlyPricePerSeat) * 100;
        } else if (monthlyDelta !== 0) {
          // Price went from 0 to something
          priceChangePercent = 100;
        }

        // Only include if there's an actual change
        if (monthlyDelta !== 0 || annualDelta !== 0) {
          planChanges.push({
            planId,
            planLabel: `${newTool.name} Plan`,
            oldMonthlyPrice: oldPlan.monthlyPricePerSeat,
            newMonthlyPrice: newPlan.monthlyPricePerSeat,
            monthlyDelta,
            oldAnnualPrice: oldPlan.annualPricePerSeat,
            newAnnualPrice: newPlan.annualPricePerSeat,
            annualDelta: annualDelta !== 0 ? annualDelta : undefined,
            priceChangePercent: Math.round(priceChangePercent * 100) / 100,
          });
        }
      }
    }

    // Only include tool if it has plan changes
    if (planChanges.length > 0) {
      changedTools.push({
        toolId: toolId as any,
        toolName: newTool.name,
        hasAnyChange: true,
        planChanges,
        isNewTool: false,
      });
      affectedToolIds.add(toolId);
    }
  }

  // Check for removed tools
  for (const toolId of Object.keys(oldSnapshot.tools)) {
    if (!newSnapshot.tools[toolId]) {
      changedTools.push({
        toolId: toolId as any,
        toolName: oldSnapshot.tools[toolId].name,
        hasAnyChange: true,
        planChanges: [],
        isRemovedTool: true,
      });
      affectedToolIds.add(toolId);
    }
  }

  return {
    changedTools,
    hasPricingChange: changedTools.length > 0,
    affectedToolCount: affectedToolIds.size,
    oldCatalogVersion: oldSnapshot.catalogVersion,
    newCatalogVersion: newSnapshot.catalogVersion,
    comparedAt: new Date().toISOString(),
  };
}

/**
 * Generates human-readable summary of pricing changes
 *
 * @param changedTools Tools that changed
 * @returns Human-readable summary string
 */
function generatePricingChangeSummary(changedTools: ToolPriceChange[]): string {
  if (changedTools.length === 0) {
    return 'No pricing changes detected';
  }

  const parts: string[] = [];

  for (const tool of changedTools) {
    if (tool.isNewTool) {
      parts.push(`${tool.toolName} added to catalog`);
    } else if (tool.isRemovedTool) {
      parts.push(`${tool.toolName} removed from catalog`);
    } else {
      const changes = tool.planChanges
        .map((p) => {
          const sign = p.monthlyDelta > 0 ? '+' : '';
          return `${p.planLabel}: ${sign}$${p.monthlyDelta.toFixed(2)}/mo`;
        })
        .join(', ');
      parts.push(`${tool.toolName}: ${changes}`);
    }
  }

  return parts.join(' | ');
}

/**
 * Scans all saved audits and detects which ones are affected by pricing changes
 * Compares each audit's pricing snapshot against current pricing
 *
 * @returns PricingChangeDetectionResult with affected audits
 */
export async function scanAuditsForPricingChanges(): Promise<PricingChangeDetectionResult> {
  const startTime = Date.now();

  try {
    // Get current pricing snapshot
    const currentSnapshot = capturePricingSnapshot();

    // Fetch all audits from database
    const allAudits = await AuditModel.find({}).lean();

    const affectedAudits: AuditPricingChange[] = [];
    let auditsScanned = 0;
    let auditsWithChanges = 0;

    // Compare each audit against current pricing
    for (const audit of allAudits) {
      // Skip historical versions — we only check and notify for the latest active version
      if (audit.isLatestVersion === false) {
        continue;
      }
      
      auditsScanned++;

      // Skip audits without pricing snapshot (shouldn't happen, but be safe)
      if (!audit.pricingSnapshot) {
        continue;
      }

      // Compare pricing snapshots
      const comparison = comparePricingSnapshots(
        audit.pricingSnapshot as any,
        currentSnapshot
      );

      if (comparison.hasPricingChange) {
        auditsWithChanges++;

        // Generate summary
        const summary = generatePricingChangeSummary(comparison.changedTools);

        const affectedAudit: AuditPricingChange = {
          auditId: audit.auditId,
          userEmail: audit.email,
          companyName: audit.companyName,
          auditCreatedAt: audit.createdAt.toISOString(),
          detectedAt: currentSnapshot.capturedAt,
          changedTools: comparison.changedTools,
          hasPricingChange: true,
          summary,
        };

        affectedAudits.push(affectedAudit);

        // Update audit document with pricing change flag
        await AuditModel.updateOne(
          { auditId: audit.auditId },
          {
            pricingChanged: true,
            lastPricingCheck: new Date(),
            outdatedReason: summary,
          }
        );

        // ── Batch 5: Send transactional notification & trigger runReAudit ──
        const alreadyNotified = audit.pricingChanged || 
          (audit.lastNotificationSentAt && audit.notificationVersion === (audit.auditVersion || 1));

        if (audit.email && !alreadyNotified) {
          try {
            console.log(`✉️ Sending re-audit notification to ${audit.email} for audit ${audit.auditId}...`);
            const frontendUrl = getFrontendUrl();
            
            // Run re-audit immediately so comparison page is fully ready
            const { diff } = await runReAudit(audit.auditId, frontendUrl);
            const comparisonUrl = `${frontendUrl}/audit/${audit.auditId}/diff`;

            await sendReAuditNotification({
              email: audit.email,
              auditId: audit.auditId,
              comparisonUrl,
              companyName: audit.companyName,
              changedToolsSummary: summary,
              savingsDelta: diff.savingsDelta,
              oldSavings: diff.oldSavings,
              newSavings: diff.newSavings,
            });

            // Record notification metrics for duplicate protection
            await AuditModel.updateOne(
              { auditId: audit.auditId },
              {
                lastNotificationSentAt: new Date(),
                notificationVersion: audit.auditVersion || 1,
              }
            );
          } catch (err) {
            console.error(`❌ Failed to send re-audit notification for audit ${audit.auditId}:`, err);
          }
        }
      }
    }

    const elapsedMs = Date.now() - startTime;
    console.log(
      `✅ Pricing detection complete: scanned ${auditsScanned} audits, found ${auditsWithChanges} with changes (${elapsedMs}ms)`
    );

    return {
      success: true,
      detectionTimestamp: currentSnapshot.capturedAt,
      auditsScanned,
      auditsWithChanges,
      affectedAudits,
    };
  } catch (error) {
    console.error('❌ Pricing change detection failed:', error);
    return {
      success: false,
      detectionTimestamp: new Date().toISOString(),
      auditsScanned: 0,
      auditsWithChanges: 0,
      affectedAudits: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Utility: Get current pricing to use for comparisons
 * Can be called to manually check if pricing has changed
 *
 * @returns Current PricingSnapshot
 */
export function getCurrentPricingSnapshot(): PricingSnapshot {
  return capturePricingSnapshot();
}
