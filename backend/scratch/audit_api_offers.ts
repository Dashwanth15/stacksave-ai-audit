import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const collection = mongoose.connection.collection('notificationevents');
  
  const apiDocs = await collection.find({
    $or: [
      { providerId: { $in: ['anthropic-api', 'openai-api', 'deepseek', 'kimi', 'groq', 'fireworks-ai', 'together-ai', 'cohere'] } },
      { title: /api|cache|batch|off-peak|credit/i },
      { description: /api|cache|batch|off-peak|credit/i },
    ]
  }).toArray();

  console.log('FOUND API-RELATED DOCS TOTAL:', apiDocs.length);
  console.log('ACTIVE API-RELATED DOCS:', apiDocs.filter(d => d.isActive).length);
  
  for (const d of apiDocs) {
    console.log({
      id: d._id,
      providerId: d.providerId,
      title: d.title,
      isActive: d.isActive,
      offerType: d.offerType,
      offerSubtype: d.offerSubtype,
      discount: d.discount,
      benefit: d.benefit,
      sourceUrl: d.sourceUrl,
      destinationUrl: d.destinationUrl,
    });
  }

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
