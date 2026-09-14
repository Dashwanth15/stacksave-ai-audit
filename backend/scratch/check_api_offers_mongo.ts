import 'dotenv/config';
import { connectDB, NotificationEventModel } from '../src/services/dbService';

async function run() {
  await connectDB();
  const all = await NotificationEventModel.find({
    $or: [
      { providerId: { $in: ['anthropic-api', 'deepseek', 'kimi', 'groq', 'fireworks', 'together', 'cohere', 'qwen'] } },
      { title: { $regex: /caching|batch|off-peak|credit|allowance/i } }
    ]
  }).lean();

  console.log('Found docs:', all.length);
  for (const doc of all) {
    console.log({
      id: doc._id.toString(),
      providerId: doc.providerId,
      title: doc.title,
      offerType: doc.offerType,
      offerSubtype: (doc as any).offerSubtype,
      category: (doc as any).category,
      benefit: doc.benefit,
      sourceUrl: doc.sourceUrl,
      destinationUrl: (doc as any).destinationUrl,
      isActive: doc.isActive
    });
  }
  process.exit(0);
}

run().catch(console.error);
