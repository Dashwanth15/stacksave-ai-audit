// Full inventory dump to JSON for forensic audit
import dotenv from 'dotenv';
dotenv.config();

async function inventoryOffers() {
  const r = await fetch('http://localhost:5000/api/intelligence/offers');
  const j = await r.json() as any;
  const all = j.data.offers as any[];

  const targets = all.filter((o: any) => {
    const ai = (o.aiProvider || o.providerId || '').toLowerCase();
    return ai === 'gemini' || ai === 'perplexity';
  });

  const gemini = targets.filter((o: any) => (o.aiProvider || o.providerId || '').toLowerCase() === 'gemini');
  const perplexity = targets.filter((o: any) => (o.aiProvider || o.providerId || '').toLowerCase() === 'perplexity');

  // Output compact summary of ALL offers including ASUS ones
  console.log(`GEMINI (${gemini.length}) + PERPLEXITY (${perplexity.length}) = ${targets.length} total offers\n`);

  for (const o of targets) {
    const platform = (o.aiProvider || o.providerId).toUpperCase();
    const partner = o.partner ? ` [${o.partner}]` : '';
    console.log(`[${platform}${partner}] ${o.title}`);
    console.log(`  sourceUrl:     ${o.sourceUrl}`);
    console.log(`  destinationUrl: ${o.destinationUrl}`);
    console.log(`  offerType: ${o.offerType} | offerSubtype: ${o.offerSubtype} | category: ${o.category}`);
    console.log(`  country: ${o.country} | region: ${o.region}`);
    console.log(`  ID: ${o.id}`);
    console.log('');
  }
}

inventoryOffers().catch(console.error);
