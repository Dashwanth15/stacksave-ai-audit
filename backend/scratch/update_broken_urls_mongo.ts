import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function runMigration() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stacksave');
  const db = mongoose.connection.db!;
  const collection = db.collection('notificationevents');

  console.log('=== UPDATING BROKEN URLS IN NOTIFICATIONEVENTS ===');

  // 1. Jio 5G Google Gemini Offer
  const r1 = await collection.updateMany(
    {
      $or: [
        { sourceUrl: { $regex: 'jio\\.com/en-in/google-one-offer' } },
        { destinationUrl: { $regex: 'jio\\.com/en-in/google-one-offer' } }
      ]
    },
    {
      $set: {
        sourceUrl: 'https://www.jio.com/google-gemini-offer/',
        destinationUrl: 'https://www.jio.com/google-gemini-offer/'
      }
    }
  );
  console.log(`Updated Jio 5G Google Gemini offers: matched ${r1.matchedCount}, modified ${r1.modifiedCount}`);

  // 2. JioFiber Offer
  const r2 = await collection.updateMany(
    {
      $or: [
        { sourceUrl: { $regex: 'jio\\.com/en-in/fiber' } },
        { destinationUrl: { $regex: 'jio\\.com/en-in/fiber' } }
      ]
    },
    {
      $set: {
        sourceUrl: 'https://www.jio.com/fiber/',
        destinationUrl: 'https://www.jio.com/fiber/'
      }
    }
  );
  console.log(`Updated JioFiber offers: matched ${r2.matchedCount}, modified ${r2.modifiedCount}`);

  // 3. Telekom Perplexity Offer
  const r3 = await collection.updateMany(
    {
      $or: [
        { sourceUrl: { $regex: 'telekom-and-perplexity-bring-ai-to-smartphones' } },
        { destinationUrl: { $regex: 'telekom-and-perplexity-bring-ai-to-smartphones' } }
      ]
    },
    {
      $set: {
        sourceUrl: 'https://www.telekom.com/en/newsroom/latest-updates/media-information/2024/11/ai-for-everyone',
        destinationUrl: 'https://www.telekom.com/en/newsroom/latest-updates/media-information/2024/11/ai-for-everyone'
      }
    }
  );
  console.log(`Updated Telekom Perplexity offers: matched ${r3.matchedCount}, modified ${r3.modifiedCount}`);

  // 4. ASUS Google One AI Premium Offer
  const r4 = await collection.updateMany(
    {
      $or: [
        { sourceUrl: { $regex: 'asus\\.com/campaign/google-one-ai-premium' } },
        { destinationUrl: { $regex: 'asus\\.com/campaign/google-one-ai-premium' } }
      ]
    },
    {
      $set: {
        sourceUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
        destinationUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/'
      }
    }
  );
  console.log(`Updated ASUS offers: matched ${r4.matchedCount}, modified ${r4.modifiedCount}`);

  await mongoose.disconnect();
  console.log('=== MIGRATION COMPLETE ===');
}

runMigration().catch(console.error);
