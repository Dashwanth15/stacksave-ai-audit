import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function inspectDynamicOffers() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const collection = mongoose.connection.collection('notificationevents');
  
  const targets = [
    { name: 'Google Pixel', query: { title: /pixel/i, isActive: true } },
    { name: 'Notion for Startups', query: { providerId: 'notion-ai', title: /startup/i, isActive: true } },
    { name: 'ElevenLabs Startups', query: { providerId: 'elevenlabs', title: /startup|grant/i, isActive: true } },
    { name: 'Vercel / v0', query: { providerId: 'v0', title: /startup|vercel/i, isActive: true } },
    { name: 'American Express', query: { title: /american express|chatgpt.*statement|chatgpt.*credit/i, isActive: true } },
  ];

  for (const t of targets) {
    console.log('\n==================================================');
    console.log('TARGET:', t.name);
    const docs = await collection.find(t.query).toArray();
    for (const d of docs) {
      console.log({
        id: d._id,
        providerId: d.providerId,
        title: d.title,
        sourceUrl: d.sourceUrl,
        destinationUrl: d.destinationUrl,
        detectionMethod: d.detectionMethod,
        discount: d.discount,
        benefit: d.benefit,
        value: d.value,
        evidenceText: d.evidenceText ? d.evidenceText.slice(0, 150) : null,
        detectedAt: d.detectedAt,
        lastConfirmedAt: d.lastConfirmedAt,
        lastSuccessfulCheckAt: d.lastSuccessfulCheckAt,
      });
    }
  }

  await mongoose.disconnect();
}

inspectDynamicOffers().catch(err => {
  console.error(err);
  process.exit(1);
});
