import 'dotenv/config';
import { connectDB, NotificationEventModel } from '../src/services/dbService';

async function cleanStaleAmex() {
  await connectDB();
  
  // Deactivate any Amex offer pointing to /detail/openai or generic cards page
  const res = await NotificationEventModel.updateMany(
    {
      $or: [
        { destinationUrl: { $regex: /detail\/openai/i } },
        { sourceUrl: { $regex: /detail\/openai/i } },
        { sourceUrl: 'https://www.americanexpress.com/us/credit-cards/business-cards/' }
      ]
    },
    {
      $set: {
        isActive: false,
        status: 'HISTORICAL',
      }
    }
  );

  console.log('Deactivated stale Amex records count:', res.modifiedCount);

  // Ensure canonical approved Amex offer is ACTIVE
  const canonical = await NotificationEventModel.findOne({
    destinationUrl: 'https://global.americanexpress.com/card-benefits/detail/chatgpt-business-credit/business-platinum'
  });

  if (canonical) {
    canonical.isActive = true;
    canonical.status = 'ACTIVE';
    canonical.isPublic = true;
    canonical.category = 'partner';
    canonical.offerSubtype = 'PARTNER_BUNDLE';
    await canonical.save();
    console.log('Canonical Amex record confirmed active:', canonical._id.toString());
  } else {
    console.log('Canonical Amex record not found by destinationUrl');
  }

  process.exit(0);
}

cleanStaleAmex().catch(console.error);
