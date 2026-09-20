import { checkGenericExpiration } from '../src/pricing/dateExpiryUtils';
import { isOfferQuarantined } from '../src/pricing/offerTrust';

export interface CandidateOffer {
  id: string;
  providerId: string;
  providerDisplayName: string;
  offerTitle: string;
  category: 'student' | 'annual' | 'startup' | 'api' | 'trial' | 'free' | 'partner';
  offerSubtype: string;
  benefit: string;
  eligibility: string;
  officialSourceUrl: string;
  destinationUrl: string;
  evidenceText: string;
  monthlyPrice?: number;
  annualPrice?: number;
  expectedSavingsPct?: number;
  notes?: string;
}

export const CANDIDATE_OFFERS: CandidateOffer[] = [
  // 1. Lovable
  {
    id: 'lovable-student',
    providerId: 'lovable',
    providerDisplayName: 'Lovable',
    offerTitle: 'Lovable Pro Student Discount',
    category: 'student',
    offerSubtype: 'STUDENT_DISCOUNT',
    benefit: '50% OFF Pro ($12.50/mo)',
    eligibility: 'Verified Students with .edu email',
    officialSourceUrl: 'https://lovable.dev/pricing',
    destinationUrl: 'https://lovable.dev/pricing',
    evidenceText: 'Students with a valid .edu email address or university verification receive 50% off Lovable Pro plans to build AI applications.',
  },
  {
    id: 'lovable-annual',
    providerId: 'lovable',
    providerDisplayName: 'Lovable',
    offerTitle: 'Lovable Pro Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: 'Up to 20% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://lovable.dev/pricing',
    destinationUrl: 'https://lovable.dev/pricing',
    monthlyPrice: 50,
    annualPrice: 480,
    expectedSavingsPct: 20,
    evidenceText: 'Save 20% with annual billing on Lovable Pro ($40/month billed annually at $480/yr vs $50/month monthly billing).',
  },

  // 2. Replit
  {
    id: 'replit-student',
    providerId: 'replit-ai',
    providerDisplayName: 'Replit AI & Agent',
    offerTitle: 'Replit Core Student Discount',
    category: 'student',
    offerSubtype: 'STUDENT_DISCOUNT',
    benefit: '50% OFF Replit Core ($10/mo)',
    eligibility: 'Verified Students via GitHub Student Developer Pack',
    officialSourceUrl: 'https://replit.com/pricing',
    destinationUrl: 'https://replit.com/pricing',
    evidenceText: 'Students enrolled through GitHub Student Developer Pack receive 50% discount on Replit Core with AI Agent access.',
  },
  {
    id: 'replit-startups',
    providerId: 'replit-ai',
    providerDisplayName: 'Replit AI & Agent',
    offerTitle: 'Replit for Startups',
    category: 'startup',
    offerSubtype: 'STARTUP_GRANT',
    benefit: 'Up to $25,000 in Replit Credits',
    eligibility: 'Early-stage startups affiliated with partner accelerators',
    officialSourceUrl: 'https://replit.com/pricing',
    destinationUrl: 'https://replit.com/pricing',
    evidenceText: 'Eligible early-stage startups receive up to $25,000 in Replit cloud and AI agent compute credits.',
  },
  {
    id: 'replit-annual',
    providerId: 'replit-ai',
    providerDisplayName: 'Replit AI & Agent',
    offerTitle: 'Replit Core Annual Billing',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: '10% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://replit.com/pricing',
    destinationUrl: 'https://replit.com/pricing',
    monthlyPrice: 20,
    annualPrice: 216,
    expectedSavingsPct: 10,
    evidenceText: 'Billed annually at $216/year ($18/month equivalent) vs $20/month billed monthly (10% annual savings).',
    notes: 'MUST BE REJECTED: Annual savings of 10% fails StackSave 15% quality gate threshold.',
  },

  // 3. Framer
  {
    id: 'framer-education',
    providerId: 'framer',
    providerDisplayName: 'Framer',
    offerTitle: 'Framer for Education (100% Free Plan)',
    category: 'student',
    offerSubtype: 'ACADEMIC_FREE',
    benefit: '100% FREE',
    eligibility: 'Students & Educators with accredited academic email',
    officialSourceUrl: 'https://www.framer.com/pricing/',
    destinationUrl: 'https://www.framer.com/pricing/',
    evidenceText: 'Students and teachers get a free Framer subscription for 1 year with full design and AI website publishing tools.',
  },
  {
    id: 'framer-annual',
    providerId: 'framer',
    providerDisplayName: 'Framer',
    offerTitle: 'Framer Pro Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: 'Up to 25% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://www.framer.com/pricing/',
    destinationUrl: 'https://www.framer.com/pricing/',
    monthlyPrice: 40,
    annualPrice: 360,
    expectedSavingsPct: 25,
    evidenceText: 'Save 25% with annual billing on Framer Pro ($30/month billed annually at $360/yr vs $40/month monthly billing).',
  },

  // 4. Kling AI
  {
    id: 'kling-annual',
    providerId: 'kling-ai',
    providerDisplayName: 'Kling AI',
    offerTitle: 'Kling AI Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: 'Up to 45% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://klingai.com/',
    destinationUrl: 'https://klingai.com/',
    monthlyPrice: 37,
    annualPrice: 244,
    expectedSavingsPct: 45,
    evidenceText: 'Kling AI offers up to 45% discount on annual subscriptions for Pro and Premier video generation tiers.',
  },
  {
    id: 'kling-free-credits',
    providerId: 'kling-ai',
    providerDisplayName: 'Kling AI',
    offerTitle: 'Kling AI Daily Free Credits',
    category: 'free',
    offerSubtype: 'PROMOTIONAL_FREE',
    benefit: '66 Daily Free Credits',
    eligibility: 'All registered users daily',
    officialSourceUrl: 'https://klingai.com/',
    destinationUrl: 'https://klingai.com/',
    evidenceText: 'Registered users receive 66 complimentary credits every single day to generate high-definition AI videos.',
  },

  // 5. Luma AI
  {
    id: 'luma-annual',
    providerId: 'luma-ai',
    providerDisplayName: 'Luma AI',
    offerTitle: 'Luma Dream Machine Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: '20% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://lumalabs.ai/dream-machine',
    destinationUrl: 'https://lumalabs.ai/dream-machine',
    monthlyPrice: 29.99,
    annualPrice: 287.88,
    expectedSavingsPct: 20,
    evidenceText: 'Save 20% on Luma Dream Machine Standard and Pro video subscription tiers when billed annually.',
  },

  // 6. Udio
  {
    id: 'udio-annual',
    providerId: 'udio',
    providerDisplayName: 'Udio',
    offerTitle: 'Udio Music Pro Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: '20% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://www.udio.com/',
    destinationUrl: 'https://www.udio.com/',
    monthlyPrice: 30,
    annualPrice: 288,
    expectedSavingsPct: 20,
    evidenceText: 'Save 20% with annual subscription billing on Udio Standard ($8/mo vs $10/mo) and Pro ($24/mo vs $30/mo) music creator plans.',
  },
  {
    id: 'udio-free-tier',
    providerId: 'udio',
    providerDisplayName: 'Udio',
    offerTitle: 'Udio Music Free Creator Plan',
    category: 'free',
    offerSubtype: 'FREE_PLAN',
    benefit: '100 Free Monthly Credits',
    eligibility: 'All registered users',
    officialSourceUrl: 'https://www.udio.com/',
    destinationUrl: 'https://www.udio.com/',
    evidenceText: 'Free plan includes 10 daily prompt credits plus 100 bonus monthly credits for full AI music track generation.',
  },

  // 7. Speechify
  {
    id: 'speechify-student',
    providerId: 'speechify',
    providerDisplayName: 'Speechify',
    offerTitle: 'Speechify Premium Student Discount',
    category: 'student',
    offerSubtype: 'STUDENT_DISCOUNT',
    benefit: '25% OFF Premium',
    eligibility: 'Verified Students with academic ID',
    officialSourceUrl: 'https://speechify.com/',
    destinationUrl: 'https://speechify.com/',
    evidenceText: 'Verified students receive 25% off Speechify Premium for AI text-to-speech reading and audio study summaries.',
  },
  {
    id: 'speechify-annual',
    providerId: 'speechify',
    providerDisplayName: 'Speechify',
    offerTitle: 'Speechify Premium Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: '60% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://speechify.com/',
    destinationUrl: 'https://speechify.com/',
    monthlyPrice: 29,
    annualPrice: 139,
    expectedSavingsPct: 60,
    evidenceText: 'Save 60% with annual billing on Speechify Premium ($139/year equivalent to $11.58/mo vs $29/mo monthly).',
  },

  // 8. Mistral AI
  {
    id: 'mistral-student',
    providerId: 'mistral',
    providerDisplayName: 'Mistral AI (Le Chat)',
    offerTitle: 'Mistral Le Chat Student Discount',
    category: 'student',
    offerSubtype: 'STUDENT_DISCOUNT',
    benefit: 'Free Le Chat Pro Access for Students',
    eligibility: 'Verified academic students and educators',
    officialSourceUrl: 'https://mistral.ai/',
    destinationUrl: 'https://mistral.ai/',
    evidenceText: 'Mistral offers complimentary Le Chat Pro access and student developer API allowances for verified academic domains.',
  },
  {
    id: 'mistral-mistralship',
    providerId: 'mistral',
    providerDisplayName: 'Mistral AI (Le Chat)',
    offerTitle: 'Mistralship Startup Accelerator Grants',
    category: 'startup',
    offerSubtype: 'STARTUP_GRANT',
    benefit: '€30,000 in Mistral API Credits',
    eligibility: 'Early-stage AI startups building on Mistral frontier models',
    officialSourceUrl: 'https://mistral.ai/',
    destinationUrl: 'https://mistral.ai/',
    evidenceText: 'Mistralship program provides up to €30,000 in model API credits, dedicated engineering support, and technical office hours.',
  },

  // 9. Cerebras
  {
    id: 'cerebras-api-allowance',
    providerId: 'cerebras',
    providerDisplayName: 'Cerebras',
    offerTitle: 'Cerebras Inference Free Daily Allowance',
    category: 'api',
    offerSubtype: 'API_DISCOUNT',
    benefit: '1,000,000 Free Tokens / Day',
    eligibility: 'All registered developer accounts',
    officialSourceUrl: 'https://cerebras.ai/',
    destinationUrl: 'https://inference.cerebras.ai/',
    evidenceText: 'Cerebras provides 1M free input/output tokens daily on ultra-fast wafer-scale Llama 3.1 8B and 70B models.',
  },
  {
    id: 'cerebras-credit-signup',
    providerId: 'cerebras',
    providerDisplayName: 'Cerebras',
    offerTitle: 'Cerebras Developer $5 Signup Credit',
    category: 'api',
    offerSubtype: 'API_DISCOUNT',
    benefit: '$5 Free Credit',
    eligibility: 'New developer accounts',
    officialSourceUrl: 'https://cerebras.ai/',
    destinationUrl: 'https://inference.cerebras.ai/',
    evidenceText: 'Sign up for Cerebras Inference and receive $5 in complimentary API credits for high-throughput model endpoints.',
  },

  // 10. SambaNova
  {
    id: 'sambanova-credit',
    providerId: 'sambanova',
    providerDisplayName: 'SambaNova',
    offerTitle: 'SambaNova Cloud Developer $5 Credit & Free Tier',
    category: 'api',
    offerSubtype: 'API_DISCOUNT',
    benefit: '$5 Free API Credit & Free Tier',
    eligibility: 'All registered developer accounts',
    officialSourceUrl: 'https://sambanova.ai/',
    destinationUrl: 'https://cloud.sambanova.ai/',
    evidenceText: 'SambaNova Cloud provides a free developer tier with $5 in free credits to test high-speed open foundation models.',
  },

  // 11. Beautiful.ai
  {
    id: 'beautiful-ai-edu',
    providerId: 'beautiful-ai',
    providerDisplayName: 'Beautiful.ai',
    offerTitle: 'Beautiful.ai for Education (1-Year Free Pro)',
    category: 'student',
    offerSubtype: 'ACADEMIC_FREE',
    benefit: '100% FREE for 1 Year ($144 value)',
    eligibility: 'Verified college and university students with .edu address',
    officialSourceUrl: 'https://www.beautiful.ai/',
    destinationUrl: 'https://www.beautiful.ai/education',
    evidenceText: 'Beautiful.ai offers a free 1-year Pro subscription for students with an accredited .edu email address.',
  },
  {
    id: 'beautiful-ai-annual',
    providerId: 'beautiful-ai',
    providerDisplayName: 'Beautiful.ai',
    offerTitle: 'Beautiful.ai Pro Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: 'Up to 73% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://www.beautiful.ai/',
    destinationUrl: 'https://www.beautiful.ai/pricing',
    monthlyPrice: 45,
    annualPrice: 144,
    expectedSavingsPct: 73,
    evidenceText: 'Save 73% on Beautiful.ai Pro with annual billing ($12/month billed annually at $144/year vs $45/month monthly billing).',
  },

  // 12. Gamma
  {
    id: 'gamma-annual',
    providerId: 'gamma',
    providerDisplayName: 'Gamma',
    offerTitle: 'Gamma Pro Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: 'Up to 25% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://gamma.app/pricing',
    destinationUrl: 'https://gamma.app/pricing',
    monthlyPrice: 20,
    annualPrice: 180,
    expectedSavingsPct: 25,
    evidenceText: 'Save 25% with annual billing on Gamma Pro ($15/month billed annually at $180/yr vs $20/month monthly billing).',
  },
  {
    id: 'gamma-credits',
    providerId: 'gamma',
    providerDisplayName: 'Gamma',
    offerTitle: 'Gamma 400 Free AI Onboarding Credits',
    category: 'free',
    offerSubtype: 'PROMOTIONAL_FREE',
    benefit: '400 Free AI Credits',
    eligibility: 'All new registered accounts',
    officialSourceUrl: 'https://gamma.app/pricing',
    destinationUrl: 'https://gamma.app/pricing',
    evidenceText: 'New users receive 400 free AI generation credits at signup to create interactive presentations, webpages, and docs.',
  },

  // 13. Consensus
  {
    id: 'consensus-academic',
    providerId: 'consensus',
    providerDisplayName: 'Consensus',
    offerTitle: 'Consensus AI Academic Discount',
    category: 'student',
    offerSubtype: 'STUDENT_DISCOUNT',
    benefit: '40% OFF Premium',
    eligibility: 'Students, researchers, and university staff with .edu email',
    officialSourceUrl: 'https://consensus.app/',
    destinationUrl: 'https://consensus.app/',
    evidenceText: 'Verified academic users receive 40% discount on Consensus Premium for AI research search and paper synthesis.',
  },
  {
    id: 'consensus-annual',
    providerId: 'consensus',
    providerDisplayName: 'Consensus',
    offerTitle: 'Consensus Premium Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: '40% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://consensus.app/',
    destinationUrl: 'https://consensus.app/',
    monthlyPrice: 14.99,
    annualPrice: 107.88,
    expectedSavingsPct: 40,
    evidenceText: 'Save 40% with annual subscription billing on Consensus Premium ($8.99/mo billed annually vs $14.99/mo monthly).',
  },

  // 14. Amazon Q Developer
  {
    id: 'amazon-q-free',
    providerId: 'amazon-q',
    providerDisplayName: 'Amazon Q Developer',
    offerTitle: 'Amazon Q Developer Free Tier',
    category: 'free',
    offerSubtype: 'FREE_PLAN',
    benefit: '100% Free Developer Tier',
    eligibility: 'All AWS Builder ID developers (no credit card required)',
    officialSourceUrl: 'https://aws.amazon.com/q/developer/',
    destinationUrl: 'https://aws.amazon.com/q/developer/',
    evidenceText: 'Amazon Q Developer includes unlimited inline code suggestions, reference tracking, and security scanning in the Free tier.',
  },

  // 15. Jasper
  {
    id: 'jasper-edu',
    providerId: 'jasper',
    providerDisplayName: 'Jasper',
    offerTitle: 'Jasper Education & Nonprofit Discount',
    category: 'student',
    offerSubtype: 'STUDENT_DISCOUNT',
    benefit: '20% OFF for Education & Nonprofits',
    eligibility: 'Registered educators, universities, and 501(c)(3) nonprofits',
    officialSourceUrl: 'https://www.jasper.ai/',
    destinationUrl: 'https://www.jasper.ai/',
    evidenceText: 'Eligible educators, students, and 501(c)(3) nonprofit organizations receive a 20% discount on Jasper AI plans.',
  },
  {
    id: 'jasper-annual',
    providerId: 'jasper',
    providerDisplayName: 'Jasper',
    offerTitle: 'Jasper Creator Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: '20% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://www.jasper.ai/',
    destinationUrl: 'https://www.jasper.ai/',
    monthlyPrice: 49,
    annualPrice: 468,
    expectedSavingsPct: 20,
    evidenceText: 'Save 20% on Jasper Creator with annual billing ($39/month billed annually at $468/year vs $49/month monthly billing).',
  },

  // 16. Copy.ai
  {
    id: 'copy-ai-annual',
    providerId: 'copy-ai',
    providerDisplayName: 'Copy.ai',
    offerTitle: 'Copy.ai Pro Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: 'Up to 26% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://www.copy.ai/',
    destinationUrl: 'https://www.copy.ai/',
    monthlyPrice: 49,
    annualPrice: 432,
    expectedSavingsPct: 26,
    evidenceText: 'Save 26% with annual billing on Copy.ai Starter ($36/mo billed annually at $432/yr vs $49/mo monthly).',
  },

  // 17. Writesonic
  {
    id: 'writesonic-annual',
    providerId: 'writesonic',
    providerDisplayName: 'Writesonic',
    offerTitle: 'Writesonic Individual Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: '20% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://writesonic.com/',
    destinationUrl: 'https://writesonic.com/',
    monthlyPrice: 20,
    annualPrice: 192,
    expectedSavingsPct: 20,
    evidenceText: 'Save 20% with annual subscription billing on Writesonic Individual ($16/mo billed annually at $192/yr vs $20/mo monthly).',
  },

  // 18. Uizard
  {
    id: 'uizard-annual',
    providerId: 'uizard',
    providerDisplayName: 'Uizard',
    offerTitle: 'Uizard Pro Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: 'Up to 37% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://uizard.io/',
    destinationUrl: 'https://uizard.io/',
    monthlyPrice: 19,
    annualPrice: 144,
    expectedSavingsPct: 37,
    evidenceText: 'Save 37% with annual billing on Uizard Pro ($12/month billed annually at $144/year vs $19/month monthly billing).',
  },

  // 19. Elicit
  {
    id: 'elicit-annual',
    providerId: 'elicit',
    providerDisplayName: 'Elicit',
    offerTitle: 'Elicit Plus Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: '17% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://elicit.com/',
    destinationUrl: 'https://elicit.com/',
    monthlyPrice: 12,
    annualPrice: 120,
    expectedSavingsPct: 17,
    evidenceText: 'Save 17% with annual billing on Elicit Plus ($10/month billed annually at $120/year vs $12/month monthly billing).',
  },

  // 20. Scite
  {
    id: 'scite-annual',
    providerId: 'scite',
    providerDisplayName: 'Scite',
    offerTitle: 'Scite Individual Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: '37.5% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://scite.ai/',
    destinationUrl: 'https://scite.ai/',
    monthlyPrice: 20,
    annualPrice: 150,
    expectedSavingsPct: 38,
    evidenceText: 'Save 37.5% with annual billing on Scite Individual ($12.50/month billed annually at $150/year vs $20/month monthly billing).',
  },

  // 21. Bolt.new
  {
    id: 'bolt-annual',
    providerId: 'bolt-new',
    providerDisplayName: 'Bolt.new',
    offerTitle: 'Bolt.new Pro Annual Savings',
    category: 'annual',
    offerSubtype: 'ANNUAL_DISCOUNT',
    benefit: '28% OFF',
    eligibility: 'All Users',
    officialSourceUrl: 'https://bolt.new/',
    destinationUrl: 'https://bolt.new/',
    monthlyPrice: 25,
    annualPrice: 216,
    expectedSavingsPct: 28,
    evidenceText: 'Save 28% with annual billing on Bolt.new Pro ($18/month billed annually at $216/year vs $25/month monthly billing).',
  },
];

export async function runDryRunVerification() {
  console.log('====================================================');
  console.log('STARTING STACKSAVE OFFER DRY-RUN RE-VERIFICATION');
  console.log('====================================================');

  const results = {
    totalCandidates: CANDIDATE_OFFERS.length,
    currentlyValid: 0,
    newOffers: 0,
    duplicates: 0,
    expired: 0,
    rejected: 0,
    manualReview: 0,
    pricingOnly: 0,
    blocked: 0,
    insufficientEvidence: 0,
    details: [] as any[],
  };

  const seenFingerprints = new Set<string>();

  for (const candidate of CANDIDATE_OFFERS) {
    let status = 'VALID';
    let rejectionReason = '';

    // 1. Evidence Check
    const evidence = candidate.evidenceText.trim();
    if (evidence.length < 20) {
      status = 'INSUFFICIENT_EVIDENCE';
      rejectionReason = `Evidence text too short (${evidence.length} chars < 20 chars)`;
      results.insufficientEvidence++;
    }

    // 2. Generic Expiration Check
    const combined = `${candidate.offerTitle} ${evidence} ${candidate.notes || ''}`;
    const expCheck = checkGenericExpiration(combined);
    if (expCheck.isExpired) {
      status = 'EXPIRED';
      rejectionReason = expCheck.expiredReason || 'Detected expired signals';
      results.expired++;
    }

    // 3. Quarantine Check
    const qCheck = isOfferQuarantined({
      partner: candidate.providerDisplayName,
      title: candidate.offerTitle,
      description: evidence,
    });
    if (qCheck.isQuarantined) {
      status = 'BLOCKED';
      rejectionReason = `Quarantined: ${qCheck.reason}`;
      results.blocked++;
    }

    // 4. Annual Savings Quality Gate Check (>= 15%)
    if (candidate.category === 'annual' && candidate.monthlyPrice && candidate.annualPrice) {
      const monthlyTotal = candidate.monthlyPrice * 12;
      const savingsAmount = monthlyTotal - candidate.annualPrice;
      const savingsPercent = Math.round((savingsAmount / monthlyTotal) * 100);
      const monthlyEquivalent = Number((candidate.annualPrice / 12).toFixed(2));

      if (savingsPercent < 15) {
        status = 'REJECTED';
        rejectionReason = `Annual savings ${savingsPercent}% is below the required 15% quality gate threshold`;
        results.rejected++;
      }
    }

    // 5. Duplication Check
    const fp = `${candidate.providerId}::${candidate.offerTitle}`;
    if (seenFingerprints.has(fp)) {
      status = 'DUPLICATE';
      rejectionReason = 'Duplicate offer fingerprint detected';
      results.duplicates++;
    } else {
      seenFingerprints.add(fp);
    }

    if (status === 'VALID') {
      results.currentlyValid++;
      results.newOffers++;
    }

    results.details.push({
      id: candidate.id,
      platform: candidate.providerDisplayName,
      providerId: candidate.providerId,
      offer: candidate.offerTitle,
      category: candidate.category,
      subtype: candidate.offerSubtype,
      benefit: candidate.benefit,
      eligibility: candidate.eligibility,
      source: candidate.officialSourceUrl,
      destination: candidate.destinationUrl,
      expiry: 'CURRENT_ACTIVE (NO_EXPIRATION_STATED)',
      evidence: candidate.evidenceText,
      status,
      rejectionReason: rejectionReason || undefined,
    });
  }

  console.log('\n====================================================');
  console.log('DRY-RUN VERIFICATION SUMMARY');
  console.log('====================================================');
  console.log(`TOTAL CANDIDATES:         ${results.totalCandidates}`);
  console.log(`CURRENTLY VALID:          ${results.currentlyValid}`);
  console.log(`NEW OFFERS:               ${results.newOffers}`);
  console.log(`DUPLICATES:               ${results.duplicates}`);
  console.log(`EXPIRED:                  ${results.expired}`);
  console.log(`REJECTED:                 ${results.rejected}`);
  console.log(`MANUAL REVIEW:            ${results.manualReview}`);
  console.log(`PRICING ONLY:             ${results.pricingOnly}`);
  console.log(`BLOCKED:                  ${results.blocked}`);
  console.log(`INSUFFICIENT EVIDENCE:    ${results.insufficientEvidence}`);
  console.log('====================================================\n');

  return results;
}

if (require.main === module) {
  runDryRunVerification();
}
