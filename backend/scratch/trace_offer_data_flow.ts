/**
 * Complete Offer Data Flow Tracer
 * 
 * Traces offers from GitHub Actions extraction through to API response
 * to identify where offers are lost in the pipeline.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models from dbService
import { NotificationEventModel, PricingSourceModel } from '../src/services/dbService';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  OFFER DATA FLOW TRACER                                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // STEP 1: Check what's in the database
  console.log('═══ STEP 1: DATABASE OFFERS ═══\n');

  const allOffers = await NotificationEventModel.find({ eventType: 'NEW_OFFER' })
    .sort({ detectedAt: -1 })
    .select('providerId providerName title isActive isPublic partner sourceUrl detectedAt lastConfirmedAt')
    .lean();

  console.log(`Total offers in database: ${allOffers.length}\n`);

  const activeOffers = allOffers.filter((o: any) => o.isActive !== false);
  const publicOffers = allOffers.filter((o: any) => o.isPublic === true && o.isActive !== false);

  console.log(`Active offers (isActive !== false): ${activeOffers.length}`);
  console.log(`Public offers (isPublic === true && isActive !== false): ${publicOffers.length}\n`);

  // Group by provider
  const byProvider = new Map<string, number>();
  for (const offer of publicOffers) {
    const count = byProvider.get(offer.providerId) || 0;
    byProvider.set(offer.providerId, count + 1);
  }

  console.log('Offers by Provider:');
  for (const [providerId, count] of Array.from(byProvider.entries()).sort((a, b) => b[1] - a[1])) {
    const sample = publicOffers.find((o: any) => o.providerId === providerId);
    console.log(`  ${providerId.padEnd(20)} | ${count.toString().padStart(2)} offers | ${(sample as any)?.providerName || providerId}`);
  }

  // STEP 2: Check for JetBrains specifically
  console.log('\n\n═══ STEP 2: JETBRAINS INVESTIGATION ═══\n');

  const jetbrainsOffers = allOffers.filter((o: any) => 
    o.providerId?.toLowerCase().includes('jetbrains') ||
    o.providerName?.toLowerCase().includes('jetbrains') ||
    o.title?.toLowerCase().includes('jetbrains') ||
    o.partner?.toLowerCase().includes('jetbrains')
  );

  if (jetbrainsOffers.length > 0) {
    console.log(`Found ${jetbrainsOffers.length} JetBrains-related offer(s):\n`);
    for (const offer of jetbrainsOffers) {
      console.log(`  Title: ${offer.title}`);
      console.log(`  Provider: ${offer.providerId} (${offer.providerName})`);
      console.log(`  Partner: ${(offer as any).partner || 'N/A'}`);
      console.log(`  Active: ${offer.isActive !== false ? 'YES' : 'NO'}`);
      console.log(`  Public: ${offer.isPublic === true ? 'YES' : 'NO'}`);
      console.log(`  Detected: ${offer.detectedAt}`);
      console.log(`  Source: ${offer.sourceUrl}`);
      console.log('');
    }
  } else {
    console.log('❌ NO JetBrains offers found in database');
  }

  // STEP 3: Check specific providers from GitHub Actions log
  console.log('\n═══ STEP 3: GITHUB ACTIONS PROVIDERS CHECK ═══\n');

  const githubActionsProviders = [
    'cursor', 'github-copilot', 'deepseek', 'claude', 'chatgpt', 'gemini',
    'windsurf', 'perplexity', 'openai-api', 'anthropic-api', 'kimi', 'grok',
    'antigravity', 'glm', 'muse', 'mistral', 'elevenlabs', 'midjourney',
    'runway', 'suno', 'replit-ai', 'gamma', 'heygen', 'synthesia', 
    'ideogram', 'leonardo-ai', 'poe'
  ];

  console.log('Checking which GitHub Actions providers have offers in DB:\n');

  for (const providerId of githubActionsProviders) {
    const count = publicOffers.filter((o: any) => o.providerId === providerId).length;
    const status = count > 0 ? '✅' : '❌';
    const sample = publicOffers.find((o: any) => o.providerId === providerId);
    console.log(`  ${status} ${providerId.padEnd(20)} | ${count} offer(s)${sample ? ` | ${(sample as any).title?.slice(0, 50)}...` : ''}`);
  }

  // STEP 4: Check publication gates
  console.log('\n\n═══ STEP 4: PUBLICATION GATE ANALYSIS ═══\n');

  const unpublishedOffers = allOffers.filter((o: any) => o.isActive !== false && o.isPublic !== true);
  console.log(`Offers NOT published (active but not public): ${unpublishedOffers.length}\n`);

  if (unpublishedOffers.length > 0) {
    console.log('Sample unpublished offers:');
    for (const offer of unpublishedOffers.slice(0, 5)) {
      console.log(`  ${offer.providerId} - ${offer.title}`);
      console.log(`    isActive: ${offer.isActive !== false}`);
      console.log(`    isPublic: ${offer.isPublic === true}`);
      console.log(`    sourceUrl: ${offer.sourceUrl}`);
      console.log('');
    }
  }

  // STEP 5: Compare with pricing sources
  console.log('\n═══ STEP 5: PRICING SOURCES vs OFFERS ═══\n');

  const pricingSources = await PricingSourceModel.find()
    .select('providerId displayName status lastCheckedAt')
    .lean();

  console.log(`Total pricing sources: ${pricingSources.length}\n`);

  const providersWithOffers = new Set(publicOffers.map((o: any) => o.providerId));
  const providersWithoutOffers: string[] = [];

  for (const source of pricingSources) {
    if (!providersWithOffers.has(source.providerId)) {
      providersWithoutOffers.push(source.providerId);
    }
  }

  if (providersWithoutOffers.length > 0) {
    console.log(`Providers with pricing data but NO public offers (${providersWithoutOffers.length}):`);
    for (const pid of providersWithoutOffers) {
      const source = pricingSources.find((s: any) => s.providerId === pid);
      console.log(`  - ${pid.padEnd(20)} | ${(source as any)?.displayName || pid} | ${(source as any)?.status}`);
    }
  }

  // STEP 6: Recent offers
  console.log('\n\n═══ STEP 6: RECENT OFFERS (Last 24 hours) ═══\n');

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOffers = publicOffers.filter((o: any) => new Date(o.detectedAt) > oneDayAgo);

  console.log(`Offers detected in last 24 hours: ${recentOffers.length}\n`);

  if (recentOffers.length > 0) {
    for (const offer of recentOffers.slice(0, 10)) {
      console.log(`  ${offer.providerId.padEnd(20)} | ${offer.title}`);
    }
  }

  // Summary
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log(`Database Total:     ${allOffers.length} offers`);
  console.log(`Active:             ${activeOffers.length} offers`);
  console.log(`Public (API ready): ${publicOffers.length} offers`);
  console.log(`Unique Providers:   ${byProvider.size} providers`);
  console.log(`\nJetBrains in DB:    ${jetbrainsOffers.length > 0 ? 'YES' : 'NO'}`);

  await mongoose.disconnect();
  console.log('\n✅ Done!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
