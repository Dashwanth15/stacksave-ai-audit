import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function reconcileCounts() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const collection = mongoose.connection.collection('notificationevents');
  
  const allDocs = await collection.find({}).toArray();
  console.log('TOTAL DOCS IN DB:', allDocs.length);

  // Check duplicate fingerprints
  const fpMap = new Map<string, any[]>();
  for (const doc of allDocs) {
    if (doc.fingerprint) {
      const list = fpMap.get(doc.fingerprint) || [];
      list.push(doc);
      fpMap.set(doc.fingerprint, list);
    }
  }

  const duplicates: any[] = [];
  fpMap.forEach((docs, fp) => {
    if (docs.length > 1) {
      duplicates.push({ fingerprint: fp, count: docs.length, titles: docs.map(d => d.title) });
    }
  });
  console.log('DUPLICATE FINGERPRINTS FOUND:', duplicates);

  const activeDocs = allDocs.filter(d => d.isActive === true);
  const inactiveDocs = allDocs.filter(d => d.isActive !== true);

  console.log('TOTAL ACTIVE OFFERS:', activeDocs.length);
  console.log('TOTAL INACTIVE OFFERS:', inactiveDocs.length);

  // Breakdown of active offers by categories
  // Using the 6 requested public categories
  const categoryCounts = {
    partner: 0,
    student: 0,
    api: 0,
    annual: 0,
    startup: 0,
    trial_free: 0,
  };

  for (const d of activeDocs) {
    const combined = `${d.title} ${d.description || ''} ${d.eligibility || ''} ${d.offerType || ''} ${d.offerSubtype || ''}`.toLowerCase();
    const pType = (d.partnerType || '').toLowerCase();
    const sub = (d.offerSubtype || '').toUpperCase();

    if (sub === 'STUDENT_DISCOUNT' || sub === 'ACADEMIC_FREE' || pType === 'education' || combined.includes('student') || combined.includes('educat') || combined.includes('teacher') || combined.includes('.edu')) {
      categoryCounts.student++;
    } else if (sub === 'STARTUP_GRANT' || pType === 'cloud' || combined.includes('startup') || combined.includes('founder') || combined.includes('accelerator')) {
      categoryCounts.startup++;
    } else if (sub === 'API_DISCOUNT' || sub === 'API_RATE_DISCOUNT' || sub === 'API_CREDIT' || (d.providerId && d.providerId.includes('api')) || combined.includes('prompt caching') || combined.includes('off-peak') || combined.includes('batch')) {
      categoryCounts.api++;
    } else if (sub === 'ANNUAL_DISCOUNT' || combined.includes('annual') || combined.includes('billed annually')) {
      categoryCounts.annual++;
    } else if (d.isPartnerOffer || (d.partner && ['telecom', 'devices', 'banking', 'broadband', 'membership', 'credit_card'].includes(pType))) {
      categoryCounts.partner++;
    } else {
      categoryCounts.trial_free++;
    }
  }

  console.log('BREAKDOWN BY 6 PUBLIC CATEGORIES (Active):', categoryCounts);

  // Check Quarantined / Inactive
  const quarantined = allDocs.filter(d => 
    /galaxy ai|softbank|nothing|unidays.*perplexity/i.test(d.title) ||
    /galaxy ai|softbank|nothing|unidays.*perplexity/i.test(d.description || '')
  );
  console.log('QUARANTINED / HISTORICAL TOTAL:', quarantined.length, 'ACTIVE:', quarantined.filter(d => d.isActive).length);

  await mongoose.disconnect();
}

reconcileCounts().catch(err => {
  console.error(err);
  process.exit(1);
});
