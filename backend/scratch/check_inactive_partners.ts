import 'dotenv/config';
import { connectDB, NotificationEventModel } from '../src/services/dbService';

async function check() {
  await connectDB();
  const partners = ['Samsung', 'Airtel', 'SoftBank', 'Nothing', 'Xiaomi', 'UNiDAYS'];
  for (const p of partners) {
    const docs = await NotificationEventModel.find({
      $or: [
        { partner: { $regex: new RegExp(p, 'i') } },
        { title: { $regex: new RegExp(p, 'i') } }
      ]
    }).lean();
    console.log(`=== PARTNER: ${p} | DOCS: ${docs.length}`);
    for (const d of docs) {
      console.log(`  Title: "${d.title}" | isActive: ${d.isActive} | status: ${d.status} | id: ${d._id}`);
    }
  }
  process.exit(0);
}

check().catch(console.error);
