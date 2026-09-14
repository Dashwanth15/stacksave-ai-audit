import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const docs = await NotificationEventModel.find({
    $or: [
      { partner: /unidays/i },
      { title: /unidays/i },
      { partner: /nothing/i },
      { title: /nothing/i },
      { partner: /airtel/i },
      { title: /airtel/i },
      { providerId: 'perplexity' },
      { aiProvider: 'perplexity' },
    ],
  }).lean();

  console.log('Total found:', docs.length);
  for (const d of docs) {
    console.log(JSON.stringify({
      id: d._id.toString(),
      providerId: d.providerId,
      partner: d.partner,
      title: d.title,
      status: d.status,
      isActive: d.isActive,
      isPublic: d.isPublic,
      detectionMethod: d.detectionMethod,
      sourceUrl: d.sourceUrl,
      destinationUrl: (d as any).destinationUrl,
      lastConfirmedAt: d.lastConfirmedAt,
      lastCheckedAt: d.lastCheckedAt,
      detectedAt: d.detectedAt,
      fingerprint: d.fingerprint,
    }, null, 2));
  }
  await mongoose.disconnect();
}

run();
