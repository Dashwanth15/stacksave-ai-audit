import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('=== STEP 1: INSPECTING MONGODB DATABASE ===');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI configured in backend/.env');
    return;
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    console.error('No db connected');
    return;
  }

  const allRecords = await db.collection('notificationevents').find({}).toArray();
  const newOfferRecords = await db.collection('notificationevents').find({ eventType: 'NEW_OFFER' }).toArray();
  const activeOffers = await db.collection('notificationevents').find({ eventType: 'NEW_OFFER', isActive: { $ne: false } }).toArray();
  const inactiveOffers = await db.collection('notificationevents').find({ eventType: 'NEW_OFFER', isActive: false }).toArray();

  console.log('Total notificationevents records in DB:', allRecords.length);
  console.log('Total eventType="NEW_OFFER" records:', newOfferRecords.length);
  console.log('Total ACTIVE (isActive != false) records:', activeOffers.length);
  console.log('Total INACTIVE (isActive == false) records:', inactiveOffers.length);

  console.log('\n--- ACTIVE OFFERS LIST IN MONGODB ---');
  activeOffers.forEach((o, i) => {
    console.log(`${i + 1}. [${o.providerId}] "${o.title}" | discount: "${o.discount}" | detectedAt: ${o.detectedAt} | lastSeenAt: ${o.lastSeenAt} | fingerprint: ${o.fingerprint} | id: ${o._id}`);
  });

  console.log('\n--- INACTIVE OFFERS LIST IN MONGODB ---');
  inactiveOffers.forEach((o, i) => {
    console.log(`${i + 1}. [${o.providerId}] "${o.title}" | detectedAt: ${o.detectedAt} | lastSeenAt: ${o.lastSeenAt}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
