import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';

async function checkCanva() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const offers = await NotificationEventModel.find({ 
    $or: [
      { partner: /canva/i },
      { providerId: /canva/i },
      { title: /canva/i }
    ]
  }).lean();
  console.log(`Found ${offers.length} Canva offer(s) in DB:`);
  for (const o of offers) {
    console.log(JSON.stringify({
      title: o.title,
      partner: o.partner,
      providerId: o.providerId,
      status: o.status,
      isActive: o.isActive,
      isPartnerOffer: o.isPartnerOffer,
      offerType: o.offerType,
      offerSubtype: o.offerSubtype,
      category: o.category,
      officialSourceUrl: o.sourceUrl,
      destinationUrl: (o as any).destinationUrl,
      detectionMethod: o.detectionMethod,
      sourceStatus: o.sourceStatus,
      lastSuccessfulCheckAt: o.lastSuccessfulCheckAt,
      evidenceText: o.evidenceText
    }, null, 2));
  }
  await mongoose.disconnect();
}

checkCanva().catch(console.error);
