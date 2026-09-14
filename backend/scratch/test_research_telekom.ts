import { chromium } from 'playwright';
import { PlaywrightOfferResearchAgent } from '../src/pricing/offerResearchAgent';

async function test() {
  const browser = await chromium.launch({ headless: true });
  
  const partnerOffer = {
    partner: 'Deutsche Telekom',
    partnerType: 'telecom' as const,
    aiProvider: 'perplexity',
    aiProviderDisplayName: 'Perplexity',
    aiPlan: 'Perplexity Pro',
    offerTitle: '12 Months Perplexity Pro for Telekom Mobile Customers',
    benefit: '12 Months FREE',
    duration: '12 months',
    value: '€240 value',
    eligibility: 'Eligible Telekom mobile contract subscribers',
    activationMethod: 'Activate via MeinTelekom App / Partner Portal',
    country: 'DE',
    region: 'Germany / Europe',
    officialSourceUrl: 'https://www.telekom.de/unterwegs/tarife-und-optionen/perplexity-pro',
    termsUrl: 'https://www.telekom.de/unterwegs/tarife-und-optionen/perplexity-pro',
  };

  const res = await PlaywrightOfferResearchAgent.researchPartnerBundle(browser, partnerOffer);
  console.log('REAL RESEARCH RESULT FOR TELEKOM:', {
    status: res.status,
    statusReason: res.statusReason,
    hasVerifiedOffer: !!res.verifiedOffer,
    evidenceLogStatus: res.evidenceLog.status,
    evidenceLogReason: res.evidenceLog.statusReason,
    initialHttpStatus: res.evidenceLog.initialHttpStatus,
    finalHttpStatus: res.evidenceLog.finalHttpStatus,
  });

  await browser.close();
}

test().catch(console.error);
