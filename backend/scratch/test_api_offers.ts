async function testApi() {
  const res = await fetch('http://localhost:5000/api/intelligence/offers');
  console.log('HTTP STATUS:', res.status);
  const data = await res.json();
  console.log('SUCCESS:', data.success);
  console.log('COUNT:', data.data?.count);
  
  if (data.data?.offers && data.data.offers.length > 0) {
    const sample = data.data.offers[0];
    console.log('SAMPLE OFFER KEYS:', Object.keys(sample));
    console.log('SAMPLE OFFER:', JSON.stringify(sample, null, 2));

    // Check required fields across all returned offers
    const missingCategory: string[] = [];
    const missingSubtype: string[] = [];
    const missingDestUrl: string[] = [];
    const missingScore: string[] = [];
    
    for (const o of data.data.offers) {
      if (!o.category) missingCategory.push(o.title);
      if (o.offerSubtype === undefined) missingSubtype.push(o.title);
      if (!o.destinationUrl) missingDestUrl.push(o.title);
      if (o.offerOpportunityScore === undefined) missingScore.push(o.title);
    }

    console.log('Offers missing category:', missingCategory.length);
    console.log('Offers missing destinationUrl:', missingDestUrl.length);
    console.log('Offers missing score:', missingScore.length);
  }
}

testApi().catch(console.error);
