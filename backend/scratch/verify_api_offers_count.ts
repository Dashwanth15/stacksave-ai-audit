import 'dotenv/config';
import { connectDB, NotificationEventModel } from '../src/services/dbService';

async function run() {
  await connectDB();
  const docs = await NotificationEventModel.find({
    providerId: { $in: ['fireworks-ai', 'together-ai', 'groq', 'cohere', 'anthropic-api', 'deepseek', 'kimi'] },
    isActive: true,
  }).lean();
  console.log(`Found ${docs.length} active API offers in MongoDB:`);
  for (const d of docs) {
    console.log({
      id: d._id.toString(),
      provider: d.providerId,
      title: d.title,
      offerType: d.offerType,
      offerSubtype: (d as any).offerSubtype,
      category: (d as any).category,
      benefit: d.benefit,
      sourceUrl: d.sourceUrl,
      destinationUrl: (d as any).destinationUrl,
      isActive: d.isActive,
      status: d.status,
    });
  }
  process.exit(0);
}

run().catch(console.error);
