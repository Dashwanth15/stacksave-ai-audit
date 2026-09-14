import app from '../src/app';
import http from 'http';

async function testRoute() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5055, resolve));
  
  try {
    const res = await fetch('http://localhost:5055/api/intelligence/offers');
    const data = await res.json();
    console.log('STATUS:', res.status);
    console.log('COUNT:', data.data?.count);
    if (data.data?.offers?.length > 0) {
      console.log('FIRST 5 OFFERS WITH CATEGORY:');
      for (const o of data.data.offers.slice(0, 5)) {
        console.log({
          title: o.title,
          category: o.category,
          offerSubtype: o.offerSubtype,
          destinationUrl: o.destinationUrl,
          score: o.offerOpportunityScore,
        });
      }

      const byCat: Record<string, number> = {};
      for (const o of data.data.offers) {
        byCat[o.category] = (byCat[o.category] || 0) + 1;
      }
      console.log('\nBREAKDOWN ACROSS ALL OFFERS IN API RESPONSE:');
      console.log(JSON.stringify(byCat, null, 2));
    }
  } finally {
    server.close();
    process.exit(0);
  }
}

testRoute().catch(console.error);
