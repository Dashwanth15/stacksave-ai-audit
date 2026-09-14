async function test() {
  const r = await fetch('http://localhost:5000/api/intelligence/offers');
  const j = await r.json() as any;
  const offers = j.data.offers as any[];
  
  const targets = offers.filter((o: any) => {
    const ai = (o.aiProvider || o.providerId || '').toLowerCase();
    const partner = (o.partner || '').toLowerCase();
    const title = (o.title || '').toLowerCase();
    return ai.includes('gemini') || ai.includes('perplexity') || partner.includes('jio') || partner.includes('telekom') || title.includes('gemini') || title.includes('perplexity');
  });

  console.log(`Total matching offers from /api/intelligence/offers: ${targets.length}\n`);
  for (const o of targets) {
    console.log(`Title: ${o.title}`);
    console.log(`  AI: ${o.aiProvider} | Partner: ${o.partner}`);
    console.log(`  sourceUrl:      ${o.sourceUrl}`);
    console.log(`  destinationUrl: ${o.destinationUrl}`);
    console.log('');
  }
}
test().catch(console.error);
