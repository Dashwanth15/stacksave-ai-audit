import 'dotenv/config';
import mongoose from 'mongoose';
import { AuditModel } from '../src/services/dbService';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  console.log('Fetching latest audit...');
  const latest = await AuditModel.findOne({}).sort({ createdAt: -1 }).exec();
  if (!latest) {
    console.log('No audits found.');
  } else {
    console.log('Audit ID:', latest.auditId);
    console.log('Created At:', latest.createdAt);
    console.log('Total Spend:', latest.totalMonthlySpend);
    console.log('Savings:', latest.estimatedMonthlySavings);
    console.log('Insights count:', latest.insights.length);
    console.log('Insights details:', JSON.stringify(latest.insights, null, 2));
  }

  await mongoose.disconnect();
}

main().catch(console.error);
