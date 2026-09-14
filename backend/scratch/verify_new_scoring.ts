// Verify the new scoring fields in the live API
async function verify() {
  const r = await fetch('http://localhost:5000/api/intelligence/offers');
  const j = await r.json() as any;
  const offers = j.data.offers as any[];
  
  console.log('\n=== BACKEND API: RECOMMENDED ORDER (first 16 offers) ===');
  console.log('Format: rank. [aiProvider] partner x providerName | platIS=X offOpp=Y final=Z');
  console.log('');

  offers.slice(0, 16).forEach((o: any, i: number) => {
    const ai = o.aiProvider ? `[${o.aiProvider}] ` : '';
    const pt = o.partner ? `${o.partner} x ` : '';
    console.log(
      `${String(i + 1).padStart(2)}. ${ai}${pt}${o.providerName}` +
      ` | platIS=${o.platformIntelligenceScore}` +
      ` offOpp=${o.offerOpportunityScore}` +
      ` final=${o.finalRecommendedScore}`
    );
  });

  console.log('\n=== SCORE FIELDS PRESENT ===');
  const sample = offers[0];
  console.log('platformIntelligenceScore:', sample?.platformIntelligenceScore, '(type:', typeof sample?.platformIntelligenceScore, ')');
  console.log('offerOpportunityScore:', sample?.offerOpportunityScore, '(type:', typeof sample?.offerOpportunityScore, ')');
  console.log('finalRecommendedScore:', sample?.finalRecommendedScore, '(type:', typeof sample?.finalRecommendedScore, ')');

  console.log('\n=== ASUS / PIXEL GEMINI GROUPING VERIFICATION ===');
  const asusMatcher = offers.filter((o: any) => o.partner && /asus/i.test(o.partner));
  const pixelMatcher = offers.filter((o: any) => o.partner && /pixel/i.test(o.partner));
  if (asusMatcher.length) {
    console.log('ASUS offer aiProvider:', asusMatcher[0].aiProvider, '(should be gemini)');
    console.log('ASUS platformIntelligenceScore:', asusMatcher[0].platformIntelligenceScore, '(should be Gemini score ~94)');
  }
  if (pixelMatcher.length) {
    console.log('Pixel offer aiProvider:', pixelMatcher[0].aiProvider, '(should be gemini)');
    console.log('Pixel platformIntelligenceScore:', pixelMatcher[0].platformIntelligenceScore, '(should be Gemini score ~94)');
  }

  console.log('\ntotal offers:', offers.length);
  console.log('note:', j.data.note);
}

verify().catch(console.error);
