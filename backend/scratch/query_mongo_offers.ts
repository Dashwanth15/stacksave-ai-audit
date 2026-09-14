import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stacksave');
  const db = mongoose.connection.db!;
  const collection = db.collection('carrieroffers');
  
  const offers = await collection.find({
    $or: [
      { aiProvider: { $regex: /perplexity|gemini/i } },
      { providerId: { $regex: /perplexity|gemini/i } },
      { title: { $regex: /perplexity|gemini/i } }
    ]
  }).toArray();
  
  console.log(`Found ${offers.length} offers in carrieroffers collection:\n`);
  for (const o of offers) {
    console.log(JSON.stringify({
      id: o._id?.toString() || o.id,
      title: o.title,
      aiProvider: o.aiProvider,
      providerId: o.providerId,
      partner: o.partner,
      status: o.status,
      verificationStatus: o.verificationStatus,
      isPublished: o.isPublished,
      sourceUrl: o.sourceUrl,
      destinationUrl: o.destinationUrl,
      officialSourceUrl: o.officialSourceUrl,
      termsUrl: o.termsUrl,
      url: o.url
    }, null, 2));
  }
  await mongoose.disconnect();
}
check();
