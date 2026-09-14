import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stacksave');
  const db = mongoose.connection.db!;
  const collection = db.collection('notificationevents');
  
  const offers = await collection.find({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
  }).toArray();
  
  console.log(`Total public active offers in NotificationEvents: ${offers.length}\n`);

  const targets = offers.filter((o: any) => {
    const ai = (o.aiProvider || o.providerId || '').toLowerCase();
    const partner = (o.partner || '').toLowerCase();
    const title = (o.title || '').toLowerCase();
    return ai.includes('gemini') || ai.includes('perplexity') || partner.includes('jio') || partner.includes('telekom') || title.includes('gemini') || title.includes('perplexity');
  });

  console.log(`Found ${targets.length} Gemini / Perplexity / Jio / Telekom offers:\n`);
  for (const o of targets) {
    console.log(`ID: ${o._id}`);
    console.log(`  Fingerprint: ${o.fingerprint}`);
    console.log(`  Provider: ${o.providerId} | AI Provider: ${o.aiProvider} | Partner: ${o.partner}`);
    console.log(`  Title: ${o.title}`);
    console.log(`  sourceUrl: ${o.sourceUrl}`);
    console.log(`  destinationUrl: ${o.destinationUrl}`);
    console.log(`  termsUrl: ${o.termsUrl}`);
    console.log(`  category: ${o.category} | offerType: ${o.offerType}`);
    console.log('---');
  }

  await mongoose.disconnect();
}

inspect();
