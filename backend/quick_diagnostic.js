const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stacksave';

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 10000,
  family: 4,
}).then(() => {
  console.log('✅ MongoDB connected');
  
  // Query directly
  const db = mongoose.connection.db;
  
  Promise.all([
    db.collection('notificationevents').countDocuments({}),
    db.collection('notificationevents').countDocuments({ eventType: 'NEW_OFFER' }),
    db.collection('notificationevents').countDocuments({ isActive: { $ne: false } }),
    db.collection('notificationevents').countDocuments({ isPublic: true }),
    db.collection('notificationevents').countDocuments({ sourceStatus: 'VERIFIED' }),
    db.collection('notificationevents').countDocuments({ evidenceText: { $exists: true, $ne: null } }),
    db.collection('notificationevents').countDocuments({ lastConfirmedAt: { $exists: true, $ne: null } }),
    db.collection('notificationevents').countDocuments({ sourceFetchedAt: { $exists: true, $ne: null } }),
    db.collection('notificationevents').countDocuments({ lastSuccessfulCheckAt: { $exists: true, $ne: null } }),
  ]).then(([total, newOffers, active, public_, verified, evidence, lastConfirmed, sourceFetched, lastCheck]) => {
    console.log(`\n📊 Individual field counts:`);
    console.log(`  Total: ${total}`);
    console.log(`  eventType: NEW_OFFER: ${newOffers}`);
    console.log(`  isActive !== false: ${active}`);
    console.log(`  isPublic: true: ${public_}`);
    console.log(`  sourceStatus: VERIFIED: ${verified}`);
    console.log(`  evidenceText: ${evidence}`);
    console.log(`  lastConfirmedAt: ${lastConfirmed}`);
    console.log(`  sourceFetchedAt: ${sourceFetched}`);
    console.log(`  lastSuccessfulCheckAt: ${lastCheck}`);
    
    return db.collection('notificationevents').countDocuments({
      eventType: 'NEW_OFFER',
      isActive: { $ne: false },
      isPublic: true,
      sourceStatus: 'VERIFIED',
      evidenceText: { $exists: true, $ne: null },
      lastConfirmedAt: { $exists: true, $ne: null },
      sourceFetchedAt: { $exists: true, $ne: null },
      lastSuccessfulCheckAt: { $exists: true, $ne: null },
    });
  }).then(finalCount => {
    console.log(`\n🔍 ALL CONDITIONS COMBINED: ${finalCount}`);
    
    if (finalCount === 0) {
      console.log(`\n❌ RESULT: No offers pass all API filter conditions`);
    } else {
      console.log(`\n✅ RESULT: ${finalCount} offers should appear on Offers page`);
    }
    
    mongoose.disconnect();
  });
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
