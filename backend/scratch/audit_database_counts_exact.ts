import 'dotenv/config';
import { connectDB, NotificationEventModel } from '../src/services/dbService';

async function reconcileDatabaseCounts() {
  await connectDB();
  const allDocs = await NotificationEventModel.find({}).lean();
  console.log(`TOTAL DOCUMENTS IN MONGODB: ${allDocs.length}`);

  // Duplicate fingerprints check
  const fpMap = new Map<string, any[]>();
  for (const doc of allDocs) {
    const fp = doc.fingerprint;
    if (!fpMap.has(fp)) fpMap.set(fp, []);
    fpMap.get(fp)!.push(doc);
  }

  const duplicates = Array.from(fpMap.entries()).filter(([_, docs]) => docs.length > 1);
  console.log(`DUPLICATE FINGERPRINTS: ${duplicates.length}`);

  // Active vs Inactive
  const activeDocs = allDocs.filter(d => d.isActive === true && d.isPublic === true);
  const inactiveDocs = allDocs.filter(d => d.isActive === false || d.status === 'EXPIRED' || d.status === 'UNAVAILABLE' || d.status === 'HISTORICAL' || d.status === 'QUARANTINED');

  console.log(`TOTAL ACTIVE PUBLIC OFFERS: ${activeDocs.length}`);
  console.log(`TOTAL INACTIVE OFFERS: ${inactiveDocs.length}`);

  // Quarantined & Historical breakdown
  const quarantined = allDocs.filter(d => d.status === 'QUARANTINED' || (d.isActive === false && (d.title.includes('Galaxy AI') || d.title.includes('SoftBank') || d.title.includes('Airtel') || d.title.includes('Nothing') || d.title.includes('UNiDAYS') || d.title.includes('Xiaomi'))));
  const otherInactive = inactiveDocs.filter(d => !quarantined.some(q => q._id.toString() === d._id.toString()));

  console.log(`QUARANTINED / BLOCKED OFFERS: ${quarantined.length}`);
  console.log(`HISTORICAL / EXPIRED / STALE OFFERS: ${otherInactive.length}`);

  // Active Category Breakdown
  const catBreakdown: Record<string, number> = {
    'Partner Bundles': 0,
    'Student & Education': 0,
    'API Discounts': 0,
    'Annual Savings': 0,
    'Startup Grants': 0,
    'Trials & Free': 0,
  };

  for (const d of activeDocs) {
    const cat = (d as any).category;
    const sub = ((d as any).offerSubtype || '').toUpperCase();
    const type = (d.offerType || '').toUpperCase();
    const pType = (d.partnerType || '').toLowerCase();
    const combined = `${d.title} ${d.description || ''} ${d.benefit || ''}`.toLowerCase();

    if (cat === 'api' || sub.includes('API') || combined.includes('prompt caching') || combined.includes('off-peak') || combined.includes('batch')) {
      catBreakdown['API Discounts']++;
    } else if (cat === 'student' || sub === 'STUDENT_DISCOUNT' || sub === 'ACADEMIC_FREE' || pType === 'education' || type.includes('EDUCATION')) {
      catBreakdown['Student & Education']++;
    } else if (cat === 'startup' || sub === 'STARTUP_GRANT' || pType === 'cloud' || type.includes('STARTUP') || type === 'CLOUD_BUNDLE') {
      catBreakdown['Startup Grants']++;
    } else if (cat === 'annual' || sub === 'ANNUAL_DISCOUNT' || combined.includes('annual') || combined.includes('billed annually')) {
      catBreakdown['Annual Savings']++;
    } else if (cat === 'partner' || d.isPartnerOffer || ['telecom', 'devices', 'banking', 'broadband'].includes(pType)) {
      catBreakdown['Partner Bundles']++;
    } else {
      catBreakdown['Trials & Free']++;
    }
  }

  console.log('\nACTIVE CATEGORY BREAKDOWN IN DATABASE:');
  console.log(JSON.stringify(catBreakdown, null, 2));

  process.exit(0);
}

reconcileDatabaseCounts().catch(console.error);
