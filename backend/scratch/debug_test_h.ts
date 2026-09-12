/**
 * Debug script for Test H failure
 * Trace the consecutiveMisses logic manually
 */
import { buildCanonicalOfferFingerprint } from '../src/pricing/offerTrust';
import type { NormalizedOffer } from '../src/pricing/types';

const sourceUrl = 'https://openai.com/chatgpt/pricing';
const now = new Date();
const day0 = new Date(now.getTime() - 60 * 60 * 1000);

const offer: NormalizedOffer = {
  providerId: 'chatgpt',
  title: 'ChatGPT Summer Promo',
  description: 'Summer promo',
  evidenceText: 'Discounted access for summer promotion',
  detectionMethod: 'PLAYWRIGHT_DOM',
  sourceStatus: 'VERIFIED',
  fingerprint: 'chatgpt-summer-fp',
  sourceUrl,
  detectedAt: day0,
  lastConfirmedAt: day0,
};

const computedFp = buildCanonicalOfferFingerprint(offer);
console.log('Payload fingerprint:', offer.fingerprint);
console.log('Computed fingerprint (used for storage):', computedFp);
console.log('Are they the same?', offer.fingerprint === computedFp);

// Simulate what mockOffers[0] looks like after day0 create
const mockOffer = {
  _id: 'doc_abc123',
  providerId: 'chatgpt',
  sourceUrl,
  fingerprint: computedFp,  // stored as computed hash
  consecutiveMisses: 0,
  isActive: true,
  lastConfirmedAt: day0,
  detectedAt: day0,
};

console.log('\nmockOffer._id:', mockOffer._id);
console.log('mockOffer.fingerprint:', mockOffer.fingerprint);

// Simulate day1: offers = [] -> currentDetectedFps is empty
const currentDetectedFps = new Set<string>();
console.log('\ncurrentDetectedFps.has(mockOffer.fingerprint):', currentDetectedFps.has(mockOffer.fingerprint));
// This should be false -> miss detected

const nextMissCount = (mockOffer.consecutiveMisses || 0) + 1;
const lastConfirmed = mockOffer.lastConfirmedAt;
const hoursSinceConfirmed = (Date.now() - new Date(lastConfirmed).getTime()) / (1000 * 60 * 60);

console.log('\nnextMissCount:', nextMissCount);
console.log('hoursSinceConfirmed:', hoursSinceConfirmed.toFixed(2));
console.log('Should go to grace period (1 miss, <48h)?', nextMissCount < 2 && hoursSinceConfirmed < 48);
