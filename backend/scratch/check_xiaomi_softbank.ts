import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import dotenv from 'dotenv';

dotenv.config();

async function check(): Promise<void> {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const offers = await NotificationEventModel.find({
    partner: { $in: ['Xiaomi', 'SoftBank'] },
  }).lean();
  
  console.log(JSON.stringify(offers.map(o => ({
    partner: o.partner,
    isActive: o.isActive,
    status: o.status,
    lastConfirmedAt: o.lastConfirmedAt,
    lastCheckedAt: o.lastCheckedAt,
    consecutiveMisses: o.consecutiveMisses,
  })), null, 2));
  
  await mongoose.disconnect();
}

check().catch(console.error);
