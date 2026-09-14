async function verifyContract() {
  const res = await fetch('http://127.0.0.1:5000/api/intelligence/offers');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const offers = json.data?.offers || [];
  console.log(`Received ${offers.length} active public offers from GET /api/intelligence/offers\n`);

  const missingFields: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  for (const o of offers) {
    // Check required fields
    if (!o.category) missingFields.category = (missingFields.category || 0) + 1;
    if (o.isPartnerOffer === undefined) missingFields.isPartnerOffer = (missingFields.isPartnerOffer || 0) + 1;
    if (!o.providerId) missingFields.providerId = (missingFields.providerId || 0) + 1;
    if (!o.sourceUrl) missingFields.sourceUrl = (missingFields.sourceUrl || 0) + 1;
    if (!o.destinationUrl) missingFields.destinationUrl = (missingFields.destinationUrl || 0) + 1;
    if (!o.sourceStatus) missingFields.sourceStatus = (missingFields.sourceStatus || 0) + 1;
    if (!o.detectedAt) missingFields.detectedAt = (missingFields.detectedAt || 0) + 1;
    if (o.offerOpportunityScore === undefined) missingFields.offerOpportunityScore = (missingFields.offerOpportunityScore || 0) + 1;

    categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1;
  }

  console.log('MISSING FIELDS AUDIT (0 = perfect):', JSON.stringify(missingFields, null, 2));
  console.log('\nCATEGORY BREAKDOWN RETURNED BY API:');
  console.log(JSON.stringify(categoryCounts, null, 2));

  // Map to the 6 public frontend categories
  const sixCategories = {
    '1. Partner Bundles': categoryCounts['partner'] || 0,
    '2. Student & Education': categoryCounts['student'] || 0,
    '3. API Discounts': categoryCounts['api'] || 0,
    '4. Annual Savings': categoryCounts['annual'] || 0,
    '5. Startup Grants': categoryCounts['startup'] || 0,
    '6. Trials & Free': (categoryCounts['trial'] || 0) + (categoryCounts['free'] || 0),
  };

  console.log('\nSIX FRONTEND PUBLIC CATEGORIES DERIVATION:');
  console.log(JSON.stringify(sixCategories, null, 2));

  // Sample offer inspection
  console.log('\nSAMPLE OFFER DATA CONTRACT:');
  console.log(JSON.stringify(offers[0], null, 2));
}

verifyContract().catch(console.error);
