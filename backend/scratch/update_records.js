const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Airtel update
  const airtelRes = await mongoose.connection.collection('notificationevents').updateOne(
    { _id: new mongoose.Types.ObjectId('6aa4fc87bb644a1c10c41b95') },
    {
      $set: {
        isActive: false,
        status: 'EXPIRED',
        lastCheckedAt: new Date(),
        evidenceText: '[EXPIRED] Perplexity official Help Center confirms 12-month Airtel promotion ended January 16, 2026. Source https://www.airtel.in/perplexity-pro redirects to homepage.',
      }
    }
  );
  console.log('Airtel updated modifiedCount:', airtelRes.modifiedCount);

  // 2. UNiDAYS verify / ensure inactive & UNAVAILABLE
  await mongoose.connection.collection('notificationevents').updateOne(
    { _id: new mongoose.Types.ObjectId('6aa5397f47861d3cda700b9c') },
    {
      $set: {
        isActive: false,
        status: 'UNAVAILABLE',
        lastCheckedAt: new Date(),
      }
    }
  );
  const unidays = await mongoose.connection.collection('notificationevents').findOne({ _id: new mongoose.Types.ObjectId('6aa5397f47861d3cda700b9c') });
  console.log('UNiDAYS record:', { id: unidays?._id, title: unidays?.title, isActive: unidays?.isActive, status: unidays?.status });

  // 3. Nothing verify / ensure inactive & UNAVAILABLE
  await mongoose.connection.collection('notificationevents').updateOne(
    { _id: new mongoose.Types.ObjectId('6aa5398147861d3cda700bad') },
    {
      $set: {
        isActive: false,
        status: 'UNAVAILABLE',
        lastCheckedAt: new Date(),
      }
    }
  );
  const nothing = await mongoose.connection.collection('notificationevents').findOne({ _id: new mongoose.Types.ObjectId('6aa5398147861d3cda700bad') });
  console.log('Nothing record:', { id: nothing?._id, title: nothing?.title, isActive: nothing?.isActive, status: nothing?.status });

  // 4. Check for any other active Perplexity education offers
  const allPerplexity = await mongoose.connection.collection('notificationevents').find({ providerId: 'perplexity' }).toArray();
  console.log('All Perplexity records now:');
  for (const doc of allPerplexity) {
    console.log(`- ${doc._id} | ${doc.title} | active=${doc.isActive} | status=${doc.status} | partner=${doc.partner || 'none'}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
