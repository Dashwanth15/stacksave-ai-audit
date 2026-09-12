import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/accurate_audit_results_final.json', 'utf8'));

console.log('=== PART A - M: COMPLETE AUDIT TABLE ===\n');
console.log('| # | Provider | Offer | Type | View URL | HTTP | Final URL | Final HTTP | Language | Official Domain | Result |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');

for (const r of data) {
  const isOff = r.isOfficialDomain ? 'YES' : 'NO';
  console.log(`| ${r.index} | ${r.providerName} | ${r.title} | ${r.offerType} | ${r.frontendHref} | ${r.initialStatus} | ${r.finalUrl} | ${r.finalStatus} | ${r.detectedLanguage} | ${isOff} | ${r.classification} |`);
}

console.log('\n=== NON-ENGLISH OFFERS & ENGLISH DISCOVERY ===\n');
const nonEng = data.filter((r: any) => r.classification.includes('NON_ENGLISH'));
for (const n of nonEng) {
  console.log(`Offer: ${n.providerName} - ${n.title}`);
  console.log(`Current URL: ${n.frontendHref}`);
  console.log(`Final URL: ${n.finalUrl}`);
  console.log(`Language: ${n.detectedLanguage}`);
  console.log(`English Equivalent: ${n.hasEnglishEquivalent ? 'YES' : 'NO'}`);
  console.log(`English URL: ${n.englishEquivalentUrl || 'N/A'}`);
  console.log(`Discovery Method: ${n.englishDiscoveryMethod || 'N/A'}`);
  console.log('---');
}

console.log('\n=== BROKEN / 404 OFFERS REQUIRING CORRECTION ===\n');
const broken = data.filter((r: any) => r.classification === 'NOT_FOUND_404');
for (const b of broken) {
  console.log(`[${b.index}] ${b.providerName} - ${b.title}`);
  console.log(`  Source URL: ${b.apiSourceUrl}`);
  console.log(`  Final Destination: ${b.finalUrl} (${b.finalStatus})`);
  console.log(`  Reason: ${b.relevanceNotes}`);
  console.log('---');
}

console.log('\n=== FRONTEND VS API CONSISTENCY ===\n');
const mismatches = data.filter((r: any) => r.apiSourceUrl !== r.frontendHref);
console.log(`Total Mismatches: ${mismatches.length}`);
for (const m of mismatches) {
  console.log(`Mismatch in [${m.index}] ${m.providerName}: API="${m.apiSourceUrl}" vs Frontend="${m.frontendHref}"`);
}
