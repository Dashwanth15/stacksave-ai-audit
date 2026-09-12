/**
 * Debug script: does isPubliclyVerifiableOffer pass for our test offer?
 */
import { isPubliclyVerifiableOffer, isRegisteredOfficialSource } from '../src/pricing/offerTrust';
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

const registeredResult = isRegisteredOfficialSource('chatgpt', sourceUrl);
console.log('isRegisteredOfficialSource:', registeredResult);

const publicResult = isPubliclyVerifiableOffer(offer, { providerStatus: 'VERIFIED' });
console.log('isPubliclyVerifiableOffer:', publicResult);
console.log('evidenceText length:', offer.evidenceText?.trim().length);
console.log('detectedAt set?', !!offer.detectedAt);
