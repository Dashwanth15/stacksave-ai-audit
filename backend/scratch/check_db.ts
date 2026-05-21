import { connectDB, AuditModel } from '../src/services/dbService';
import 'dotenv/config';

async function main() {
  await connectDB();
  console.log('Fetching last 10 audits...');
  const audits = await AuditModel.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .exec();

  for (const a of audits) {
    console.log(`AuditId: ${a.auditId}`);
    console.log(`  Version: ${a.auditVersion}`);
    console.log(`  reAuditOf: ${a.reAuditOf}`);
    console.log(`  isLatestVersion: ${a.isLatestVersion}`);
    console.log(`  createdAt: ${a.createdAt}`);
    console.log(`  companyName: ${a.companyName}`);
    console.log('------------------------------');
  }

  // Also query to see if there is any chain with more than 2 versions
  console.log('Checking for any chain with version > 2...');
  const v3OrMore = await AuditModel.find({ auditVersion: { $gt: 2 } }).exec();
  console.log(`Found ${v3OrMore.length} audits with version > 2.`);
  for (const a of v3OrMore) {
    console.log(`Chain Root: ${a.reAuditOf}, this version: ${a.auditVersion}, auditId: ${a.auditId}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
