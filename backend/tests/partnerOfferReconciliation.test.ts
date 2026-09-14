/**
 * Partner Offer Reconciliation Tests
 * 
 * These tests verify that stale offers (404, expired, unavailable) are properly
 * deactivated after the grace period when they are not confirmed in extraction runs.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import { PartnerOfferScanner } from '../src/pricing/partnerOfferScanner';
import { buildPartnerOfferFingerprint } from '../src/pricing/partnerDiscoveryService';

// MongoDB connection for tests
beforeEach(async () => {
  if (mongoose.connection.readyState === 0) {
    const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI || 'mongodb://localhost:27017/stacksave-test';
    await mongoose.connect(uri);
  }
});

afterEach(async () => {
  // Clean up test data
  await NotificationEventModel.deleteMany({ partner: /TEST_/ });
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Partner Offer Reconciliation', () => {
  describe('Stale Offer Detection', () => {
    it('should NOT deactivate offers within 7-day grace period', async () => {
      // Create a test offer that was last confirmed 5 days ago
      const fingerprint = buildPartnerOfferFingerprint({
        partner: 'TEST_RecentOffer',
        aiProvider: 'test-ai',
        aiPlan: 'Test Plan',
        offerType: 'TELECOM_BUNDLE',
        region: 'Test Region',
      });

      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      await NotificationEventModel.create({
        providerId: 'gemini',
        providerName: 'Google Gemini',
        eventType: 'NEW_OFFER',
        fingerprint,
        title: 'TEST Recent Offer',
        description: 'Test description for recent offer',
        evidenceText: 'Eligible Jio users receive 18 months Google AI Pro complimentary with active 5G plan.',
        partner: 'TEST_RecentOffer',
        partnerType: 'telecom',
        isPartnerOffer: true,
        offerType: 'TELECOM_BUNDLE',
        sourceUrl: 'https://www.jio.com/en-in/google-one-offer',
        detectedAt: fiveDaysAgo,
        lastConfirmedAt: fiveDaysAgo,
        lastCheckedAt: fiveDaysAgo,
        isActive: true,
        status: 'ACTIVE',
      });

      // Run reconciliation with empty confirmed set
      const result = await PartnerOfferScanner.reconcileStaleOffers(new Set(), true);

      // This specific test offer should be preserved (within grace period)
      const offer = await NotificationEventModel.findOne({ fingerprint });
      expect(offer?.isActive).toBe(true);
      expect(offer?.status).toBe('ACTIVE');
    });

    it('should deactivate offers older than 7 days', async () => {
      // Create a test offer that was last confirmed 10 days ago
      const fingerprint = buildPartnerOfferFingerprint({
        partner: 'TEST_StaleOffer',
        aiProvider: 'test-ai',
        aiPlan: 'Test Plan',
        offerType: 'TELECOM_BUNDLE',
        region: 'Test Region',
      });

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      await NotificationEventModel.create({
        providerId: 'test-ai',
        providerName: 'Test AI',
        eventType: 'NEW_OFFER',
        fingerprint,
        title: 'TEST Stale Offer',
        description: 'Test description for stale offer',
        partner: 'TEST_StaleOffer',
        partnerType: 'telecom',
        isPartnerOffer: true,
        offerType: 'TELECOM_BUNDLE',
        sourceUrl: 'https://test.example.com/stale',
        detectedAt: tenDaysAgo,
        lastConfirmedAt: tenDaysAgo,
        lastCheckedAt: tenDaysAgo,
        isActive: true,
        status: 'ACTIVE',
      });

      // Run reconciliation with empty confirmed set
      const result = await PartnerOfferScanner.reconcileStaleOffers(new Set(), true);

      // Offer should be deactivated (beyond grace period)
      const offer = await NotificationEventModel.findOne({ fingerprint });
      expect(offer?.isActive).toBe(false);
      expect(['EXPIRED', 'UNAVAILABLE']).toContain(offer?.status);
    });

    it('should NOT deactivate confirmed offers', async () => {
      // Create a test offer that is confirmed in current scan
      const fingerprint = buildPartnerOfferFingerprint({
        partner: 'TEST_ConfirmedOffer',
        aiProvider: 'test-ai',
        aiPlan: 'Test Plan',
        offerType: 'TELECOM_BUNDLE',
        region: 'Test Region',
      });

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      await NotificationEventModel.create({
        providerId: 'test-ai',
        providerName: 'Test AI',
        eventType: 'NEW_OFFER',
        fingerprint,
        title: 'TEST Confirmed Offer',
        description: 'Test description for confirmed offer',
        partner: 'TEST_ConfirmedOffer',
        partnerType: 'telecom',
        isPartnerOffer: true,
        offerType: 'TELECOM_BUNDLE',
        sourceUrl: 'https://test.example.com/confirmed',
        detectedAt: tenDaysAgo,
        lastConfirmedAt: tenDaysAgo,
        lastCheckedAt: tenDaysAgo,
        isActive: true,
        status: 'ACTIVE',
      });

      // Run reconciliation WITH this offer in confirmed set
      const confirmedSet = new Set([fingerprint]);
      const result = await PartnerOfferScanner.reconcileStaleOffers(confirmedSet, true);

      // Offer should remain active (confirmed in current scan)
      const offer = await NotificationEventModel.findOne({ fingerprint });
      expect(offer?.isActive).toBe(true);
      expect(offer?.status).toBe('ACTIVE');
    });
  });

  describe('Scan Failure Handling', () => {
    it('should preserve all offers when scan fails', async () => {
      // Create a test offer
      const fingerprint = buildPartnerOfferFingerprint({
        partner: 'TEST_FailedScanOffer',
        aiProvider: 'test-ai',
        aiPlan: 'Test Plan',
        offerType: 'TELECOM_BUNDLE',
        region: 'Test Region',
      });

      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      await NotificationEventModel.create({
        providerId: 'test-ai',
        providerName: 'Test AI',
        eventType: 'NEW_OFFER',
        fingerprint,
        title: 'TEST Failed Scan Offer',
        description: 'Test description for failed scan offer',
        partner: 'TEST_FailedScanOffer',
        partnerType: 'telecom',
        isPartnerOffer: true,
        offerType: 'TELECOM_BUNDLE',
        sourceUrl: 'https://test.example.com/failedscan',
        detectedAt: twentyDaysAgo,
        lastConfirmedAt: twentyDaysAgo,
        lastCheckedAt: twentyDaysAgo,
        isActive: true,
        status: 'ACTIVE',
      });

      // Run reconciliation with scanSuccessful=false
      const result = await PartnerOfferScanner.reconcileStaleOffers(new Set(), false);

      // No offers should be deactivated (scan failed)
      expect(result.deactivatedCount).toBe(0);

      const offer = await NotificationEventModel.findOne({ fingerprint });
      expect(offer?.isActive).toBe(true);
      expect(offer?.status).toBe('ACTIVE');
    });
  });

  describe('Real-World Regression Tests', () => {
    it('CRITICAL: SoftBank × Perplexity should be deactivated after 7 days unconfirmed', async () => {
      const fingerprint = buildPartnerOfferFingerprint({
        partner: 'TEST_SoftBank',
        aiProvider: 'perplexity',
        aiPlan: 'Perplexity Pro',
        offerType: 'TELECOM_BUNDLE',
        region: 'Japan',
      });

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      // Simulate SoftBank offer that hasn't been confirmed in 10 days
      await NotificationEventModel.create({
        providerId: 'perplexity',
        providerName: 'Perplexity',
        eventType: 'NEW_OFFER',
        fingerprint,
        title: 'SoftBank × Perplexity Test Offer',
        description: 'Test description for SoftBank offer',
        partner: 'TEST_SoftBank',
        partnerType: 'telecom',
        isPartnerOffer: true,
        offerType: 'TELECOM_BUNDLE',
        sourceUrl: 'https://www.softbank.jp/mobile/special/perplexity/',
        detectedAt: tenDaysAgo,
        lastConfirmedAt: tenDaysAgo,
        lastCheckedAt: tenDaysAgo,
        isActive: true,
        status: 'ACTIVE',
      });

      // Run reconciliation (SoftBank NOT in confirmed set)
      const result = await PartnerOfferScanner.reconcileStaleOffers(new Set(), true);

      // SoftBank offer should be deactivated
      const offer = await NotificationEventModel.findOne({ fingerprint });
      expect(offer?.isActive).toBe(false);
      expect(['EXPIRED', 'UNAVAILABLE']).toContain(offer?.status);
    });

    it('CRITICAL: Airtel × Perplexity should be deactivated if not confirmed', async () => {
      const fingerprint = buildPartnerOfferFingerprint({
        partner: 'TEST_Airtel',
        aiProvider: 'perplexity',
        aiPlan: 'Perplexity Pro',
        offerType: 'TELECOM_BUNDLE',
        region: 'India',
      });

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      await NotificationEventModel.create({
        providerId: 'perplexity',
        providerName: 'Perplexity',
        eventType: 'NEW_OFFER',
        fingerprint,
        title: 'Airtel × Perplexity Test Offer',
        description: 'Test description for Airtel offer',
        partner: 'TEST_Airtel',
        partnerType: 'telecom',
        isPartnerOffer: true,
        offerType: 'TELECOM_BUNDLE',
        sourceUrl: 'https://www.airtel.in/perplexity-pro',
        detectedAt: tenDaysAgo,
        lastConfirmedAt: tenDaysAgo,
        lastCheckedAt: tenDaysAgo,
        isActive: true,
        status: 'ACTIVE',
      });

      // Run reconciliation (Airtel NOT in confirmed set)
      const result = await PartnerOfferScanner.reconcileStaleOffers(new Set(), true);

      // Airtel offer should be deactivated
      const offer = await NotificationEventModel.findOne({ fingerprint });
      expect(offer?.isActive).toBe(false);
      expect(['EXPIRED', 'UNAVAILABLE']).toContain(offer?.status);
    });

    it('Valid offers (Jio, ASUS, etc.) should remain active when confirmed', async () => {
      const jioFingerprint = buildPartnerOfferFingerprint({
        partner: 'TEST_Jio',
        aiProvider: 'gemini',
        aiPlan: 'Google AI Pro',
        offerType: 'TELECOM_BUNDLE',
        region: 'India',
      });

      await NotificationEventModel.create({
        providerId: 'gemini',
        providerName: 'Google Gemini',
        eventType: 'NEW_OFFER',
        fingerprint: jioFingerprint,
        title: 'Jio × Google AI Pro Test Offer',
        description: 'Test description for Jio offer',
        partner: 'TEST_Jio',
        partnerType: 'telecom',
        isPartnerOffer: true,
        offerType: 'TELECOM_BUNDLE',
        sourceUrl: 'https://www.jio.com/en-in/google-one-offer',
        detectedAt: new Date(),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        isActive: true,
        status: 'ACTIVE',
      });

      // Run reconciliation WITH Jio in confirmed set
      const confirmedSet = new Set([jioFingerprint]);
      await PartnerOfferScanner.reconcileStaleOffers(confirmedSet, true);

      // Jio offer should remain active
      const offer = await NotificationEventModel.findOne({ fingerprint: jioFingerprint });
      expect(offer?.isActive).toBe(true);
      expect(offer?.status).toBe('ACTIVE');
    });
  });
});
