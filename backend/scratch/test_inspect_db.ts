import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const collection = mongoose.connection.collection('notificationevents');
  const activeOffers = await collection.find({ isActive: true }).toArray();
  console.log('TOTAL ACTIVE OFFERS:', activeOffers.length);
  
  const byCategory: Record<string, number> = {};
  const bySubtype: Record<string, number> = {};
  activeOffers.forEach(o => {
    const cat = o.offerType || 'UNKNOWN';
    const sub = o.offerSubtype || 'NONE';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    bySubtype[sub] = (bySubtype[sub] || 0) + 1;
  });
  console.log('BY OFFER TYPE / CATEGORY:', JSON.stringify(byCategory, null, 2));
  console.log('BY SUBTYPE:', JSON.stringify(bySubtype, null, 2));
  
  const sampleActive = activeOffers.map(o => ({
    providerId: o.providerId,
    title: o.title,
    offerType: o.offerType,
    offerSubtype: o.offerSubtype,
    benefit: o.benefit || o.discount,
    destinationUrl: o.destinationUrl || o.sourceUrl,
    detectionMethod: o.detectionMethod,
  }));
  console.log('SAMPLE ACTIVE OFFERS (first 10):', JSON.stringify(sampleActive.slice(0, 10), null, 2));

  const quarantined = await collection.find({
    $or: [
      { title: /galaxy ai/i },
      { title: /softbank/i },
      { title: /nothing/i },
      { title: /unidays.*perplexity/i },
    ]
  }).toArray();
  console.log('QUARANTINED / HISTORICAL (isActive should be false):', quarantined.map(q => ({
    title: q.title,
    isActive: q.isActive,
    status: q.status,
  })));

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
