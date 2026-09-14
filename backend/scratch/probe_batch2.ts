import { chromium } from 'playwright';

interface BatchProbe {
  id: string;
  name: string;
  category: string;
  url: string;
  expectedOfferCategory: string;
}

const TARGETS: BatchProbe[] = [
  { id: 'notion-startups', name: 'Notion for Startups', category: 'Startup Grants', url: 'https://www.notion.so/startups', expectedOfferCategory: 'Startup Grants' },
  { id: 'notion-education', name: 'Notion for Education', category: 'Student & Education', url: 'https://www.notion.so/product/notion-for-education', expectedOfferCategory: 'Student & Education' },
  { id: 'notion-annual', name: 'Notion AI Pricing', category: 'Annual Savings', url: 'https://www.notion.so/product/ai', expectedOfferCategory: 'Annual Savings' },
  
  { id: 'canva-education', name: 'Canva for Education', category: 'Student & Education', url: 'https://www.canva.com/education/', expectedOfferCategory: 'Student & Education' },
  { id: 'canva-annual', name: 'Canva Pro Pricing', category: 'Annual Savings', url: 'https://www.canva.com/pricing/', expectedOfferCategory: 'Annual Savings' },

  { id: 'figma-education', name: 'Figma for Education', category: 'Student & Education', url: 'https://www.figma.com/education/', expectedOfferCategory: 'Student & Education' },
  
  { id: 'grammarly-plans', name: 'Grammarly AI', category: 'Annual Savings', url: 'https://www.grammarly.com/plans', expectedOfferCategory: 'Annual Savings' },
  { id: 'grammarly-education', name: 'Grammarly for Education', category: 'Student & Education', url: 'https://www.grammarly.com/edu', expectedOfferCategory: 'Student & Education' },

  { id: 'otter-pricing', name: 'Otter.ai', category: 'Annual Savings', url: 'https://otter.ai/pricing', expectedOfferCategory: 'Annual Savings' },
  { id: 'otter-education', name: 'Otter for Education', category: 'Student & Education', url: 'https://otter.ai/edu', expectedOfferCategory: 'Student & Education' },

  { id: 'deepl-pricing', name: 'DeepL Pro', category: 'Annual Savings', url: 'https://www.deepl.com/pro', expectedOfferCategory: 'Annual Savings' },

  { id: 'wandb-academic', name: 'W&B Academic', category: 'Student & Education', url: 'https://wandb.ai/site/academic/', expectedOfferCategory: 'Student & Education' },
  
  { id: 'elevenlabs-grants', name: 'ElevenLabs Startup Grants', category: 'Startup Grants', url: 'https://elevenlabs.io/grants', expectedOfferCategory: 'Startup Grants' },

  { id: 'vercel-startups', name: 'Vercel for Startups (v0)', category: 'Startup Grants', url: 'https://vercel.com/startups', expectedOfferCategory: 'Startup Grants' },

  { id: 'groq-pricing', name: 'Groq API', category: 'API Discounts', url: 'https://groq.com/pricing/', expectedOfferCategory: 'API Discounts' },

  { id: 'together-pricing', name: 'Together AI', category: 'API Discounts', url: 'https://www.together.ai/pricing', expectedOfferCategory: 'API Discounts' },

  { id: 'fireworks-pricing', name: 'Fireworks AI', category: 'API Discounts', url: 'https://fireworks.ai/pricing', expectedOfferCategory: 'API Discounts' },

  { id: 'mistral-chat', name: 'Mistral Le Chat', category: 'Trials & Free', url: 'https://chat.mistral.ai/', expectedOfferCategory: 'Trials & Free' },

  { id: 'notebooklm', name: 'Google NotebookLM', category: 'Trials & Free', url: 'https://notebooklm.google/', expectedOfferCategory: 'Trials & Free' },

  { id: 'bolt-pricing', name: 'Bolt.new Pro', category: 'Annual Savings', url: 'https://bolt.new/pricing', expectedOfferCategory: 'Annual Savings' },

  { id: 'runway-pricing', name: 'Runway Gen-3', category: 'Annual Savings', url: 'https://runwayml.com/pricing', expectedOfferCategory: 'Annual Savings' },

  { id: 'suno-pricing', name: 'Suno AI Music', category: 'Annual Savings', url: 'https://suno.com/pricing', expectedOfferCategory: 'Annual Savings' },

  { id: 'synthesia-pricing', name: 'Synthesia AI Video', category: 'Annual Savings', url: 'https://www.synthesia.io/pricing', expectedOfferCategory: 'Annual Savings' },

  { id: 'ideogram-pricing', name: 'Ideogram 2.0', category: 'Annual Savings', url: 'https://ideogram.ai/pricing', expectedOfferCategory: 'Annual Savings' },

  { id: 'gamma-pricing', name: 'Gamma AI', category: 'Annual Savings', url: 'https://gamma.app/pricing', expectedOfferCategory: 'Annual Savings' },
];

async function runBatch() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  });

  const detailedResults: any[] = [];

  for (const t of TARGETS) {
    console.log(`Checking ${t.name}...`);
    const page = await context.newPage();
    try {
      const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const status = res ? res.status() : null;
      const finalUrl = page.url();
      const title = await page.title();
      const body = (await page.innerText('body').catch(() => '')) || '';

      // Extract specific commercial paragraphs
      const paragraphs = body.split('\n').map(p => p.trim()).filter(p => p.length > 25);
      const relevant = paragraphs.filter(p => 
        /free|discount|\$|save|grant|credit|student|academic|educat|annual|month|startups|benefit/i.test(p)
      ).slice(0, 5);

      detailedResults.push({
        id: t.id,
        name: t.name,
        category: t.category,
        inputUrl: t.url,
        finalUrl,
        status,
        reachable: status ? status < 400 : false,
        title,
        relevantEvidence: relevant,
      });

      console.log(`   Status: ${status} | Landed: ${finalUrl}`);
    } catch (e: any) {
      console.log(`   Failed: ${e.message}`);
      detailedResults.push({
        id: t.id,
        name: t.name,
        category: t.category,
        inputUrl: t.url,
        status: 'ERROR',
        error: e.message,
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const fs = await import('fs');
  fs.writeFileSync('scratch/batch2_detailed.json', JSON.stringify(detailedResults, null, 2), 'utf8');
  console.log('\nSaved to scratch/batch2_detailed.json');
}

runBatch().catch(console.error);
