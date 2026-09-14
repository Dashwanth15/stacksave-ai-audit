import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stacksave');
  const db = mongoose.connection.db!;
  const collection = db.collection('notificationevents');
  
  const offers = await collection.find({
    $or: [
      { aiProvider: { $regex: 'perplexity', $options: 'i' } },
      { providerId: { $regex: 'perplexity', $options: 'i' } },
      { title: { $regex: 'perplexity', $options: 'i' } }
    ]
  }).toArray();
  
  console.log(`Total Perplexity records in NotificationEvents: ${offers.length}\n`);
  for (const o of offers) {
    console.log({
      id: o._id,
      title: o.title,
      partner: o.partner,
      isActive: o.isActive,
      isPublic: o.isPublic,
      sourceStatus: o.sourceStatus,
      sourceUrl: o.sourceUrl,
      destinationUrl: o.destinationUrl
    });
  }
  await mongoose.disconnect();
}
check();
