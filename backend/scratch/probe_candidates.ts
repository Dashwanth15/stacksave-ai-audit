import { chromium } from 'playwright';

interface CandidateProbe {
  id: string;
  name: string;
  category: string;
  probeUrls: { label: string; url: string; candidateType: string }[];
}

const CANDIDATES: CandidateProbe[] = [
  // ── AI Video, Voice & Creative ─────────────────────────────
  {
    id: 'runway',
    name: 'Runway',
    category: 'AI Video & Creative',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://runwayml.com/pricing', candidateType: 'Annual Savings' },
      { label: 'Education Program', url: 'https://runwayml.com/education', candidateType: 'Student & Education' },
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'AI Voice & Audio',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://elevenlabs.io/pricing', candidateType: 'Annual Savings' },
      { label: 'Grants Program', url: 'https://elevenlabs.io/grants', candidateType: 'Startup Grants' },
    ],
  },
  {
    id: 'heygen',
    name: 'HeyGen',
    category: 'AI Video & Avatar',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://www.heygen.com/pricing', candidateType: 'Annual Savings' },
      { label: 'Education Program', url: 'https://www.heygen.com/education', candidateType: 'Student & Education' },
    ],
  },
  {
    id: 'synthesia',
    name: 'Synthesia',
    category: 'AI Video',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://www.synthesia.io/pricing', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'ideogram',
    name: 'Ideogram',
    category: 'AI Image Generation',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://ideogram.ai/pricing', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'leonardo-ai',
    name: 'Leonardo AI',
    category: 'AI Image Generation',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://leonardo.ai/pricing', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    category: 'AI Image Generation',
    probeUrls: [
      { label: 'Plans Doc', url: 'https://docs.midjourney.com/docs/plans', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'suno',
    name: 'Suno',
    category: 'AI Music & Audio',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://suno.com/pricing', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'gamma',
    name: 'Gamma',
    category: 'AI Presentations & Docs',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://gamma.app/pricing', candidateType: 'Annual Savings' },
    ],
  },

  // ── AI Coding & Developer Tools ────────────────────────────
  {
    id: 'notion-ai',
    name: 'Notion AI',
    category: 'AI Workspace & Productivity',
    probeUrls: [
      { label: 'Notion AI Pricing', url: 'https://www.notion.so/product/ai', candidateType: 'Annual Savings' },
      { label: 'Notion for Startups', url: 'https://www.notion.so/startups', candidateType: 'Startup Grants' },
      { label: 'Notion for Education', url: 'https://www.notion.so/product/notion-for-education', candidateType: 'Student & Education' },
    ],
  },
  {
    id: 'canva-ai',
    name: 'Canva AI (Magic Studio)',
    category: 'AI Design & Productivity',
    probeUrls: [
      { label: 'Canva for Education', url: 'https://www.canva.com/education/', candidateType: 'Student & Education' },
      { label: 'Canva Pricing', url: 'https://www.canva.com/pricing/', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'descript',
    name: 'Descript',
    category: 'AI Video & Audio Editor',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://www.descript.com/pricing', candidateType: 'Annual Savings' },
      { label: 'Education Pricing', url: 'https://www.descript.com/education', candidateType: 'Student & Education' },
    ],
  },
  {
    id: 'figma-ai',
    name: 'Figma AI',
    category: 'AI Design & Prototyping',
    probeUrls: [
      { label: 'Figma for Education', url: 'https://www.figma.com/education/', candidateType: 'Student & Education' },
      { label: 'Pricing Page', url: 'https://www.figma.com/pricing/', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'replit',
    name: 'Replit AI',
    category: 'AI Coding & Agent',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://replit.com/pricing', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'lovable',
    name: 'Lovable',
    category: 'AI Full-Stack App Builder',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://lovable.dev/pricing', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'bolt-new',
    name: 'Bolt.new (StackBlitz)',
    category: 'AI Web Development',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://bolt.new/pricing', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'devin',
    name: 'Devin (Cognition)',
    category: 'Autonomous AI Software Engineer',
    probeUrls: [
      { label: 'Cognition Pricing', url: 'https://cognition.ai/pricing', candidateType: 'Trials & Free' },
      { label: 'Devin Preview', url: 'https://preview.devin.ai/', candidateType: 'Trials & Free' },
    ],
  },
  {
    id: 'v0',
    name: 'v0 by Vercel',
    category: 'AI UI Generation',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://v0.dev/pricing', candidateType: 'Annual Savings' },
      { label: 'Vercel for Startups', url: 'https://vercel.com/startups', candidateType: 'Startup Grants' },
    ],
  },

  // ── AI APIs, Inference & Model Platforms ───────────────────
  {
    id: 'groq',
    name: 'Groq',
    category: 'Fast AI Inference (LPU)',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://groq.com/pricing/', candidateType: 'API Discounts' },
      { label: 'GroqCloud', url: 'https://console.groq.com/docs/rate-limits', candidateType: 'API Discounts' },
    ],
  },
  {
    id: 'together-ai',
    name: 'Together AI',
    category: 'AI Model Inference & Fine-tuning',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://www.together.ai/pricing', candidateType: 'API Discounts' },
      { label: 'Startups Program', url: 'https://www.together.ai/startups', candidateType: 'Startup Grants' },
    ],
  },
  {
    id: 'fireworks-ai',
    name: 'Fireworks AI',
    category: 'Production AI Inference Platform',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://fireworks.ai/pricing', candidateType: 'API Discounts' },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    category: 'Frontier AI Models & Le Chat',
    probeUrls: [
      { label: 'Technology Pricing', url: 'https://mistral.ai/technology/#pricing', candidateType: 'API Discounts' },
      { label: 'Le Chat', url: 'https://chat.mistral.ai/', candidateType: 'Trials & Free' },
    ],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    category: 'Enterprise AI & Search',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://cohere.com/pricing', candidateType: 'API Discounts' },
      { label: 'Startups Program', url: 'https://cohere.com/startups', candidateType: 'Startup Grants' },
    ],
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    category: 'AI Community & Model Platform',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://huggingface.co/pricing', candidateType: 'Annual Savings' },
      { label: 'Student Pack', url: 'https://education.github.com/pack', candidateType: 'Student & Education' },
    ],
  },
  {
    id: 'wandb',
    name: 'Weights & Biases (W&B)',
    category: 'AI Developer & MLOps Platform',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://wandb.ai/pricing', candidateType: 'Annual Savings' },
      { label: 'Academic Program', url: 'https://wandb.ai/site/academic/', candidateType: 'Student & Education' },
    ],
  },

  // ── AI Search, Research & Productivity ─────────────────────
  {
    id: 'notebooklm',
    name: 'Google NotebookLM',
    category: 'AI Research Assistant',
    probeUrls: [
      { label: 'Home Page', url: 'https://notebooklm.google/', candidateType: 'Trials & Free' },
      { label: 'Google Workspace Education', url: 'https://workspace.google.com/solutions/education/', candidateType: 'Student & Education' },
    ],
  },
  {
    id: 'genspark',
    name: 'Genspark',
    category: 'AI Search & Autopilot Agent',
    probeUrls: [
      { label: 'Pricing Page', url: 'https://www.genspark.ai/pricing', candidateType: 'Annual Savings' },
    ],
  },
  {
    id: 'phind',
    name: 'Phind',
    category: 'AI Developer Search Engine',
    probeUrls: [
      { label: 'Phind Home', url: 'https://www.phind.com/', candidateType: 'Trials & Free' },
    ],
  },
  {
    id: 'character-ai',
    name: 'Character.AI',
    category: 'Conversational AI Characters',
    probeUrls: [
      { label: 'Pricing Info', url: 'https://character.ai/', candidateType: 'Trials & Free' },
    ],
  },
  {
    id: 'manus',
    name: 'Manus',
    category: 'Autonomous General Agent',
    probeUrls: [
      { label: 'Manus Official', url: 'https://manus.im/', candidateType: 'Trials & Free' },
    ],
  },
  {
    id: 'qwen',
    name: 'Qwen (Alibaba Cloud)',
    category: 'Frontier AI Models & Chat',
    probeUrls: [
      { label: 'DashScope Pricing', url: 'https://www.alibabacloud.com/product/dashscope', candidateType: 'API Discounts' },
    ],
  },
];

async function probe() {
  console.log(`Starting Live Playwright Probing for ${CANDIDATES.length} Candidate Platforms...\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  });

  const results: any[] = [];

  for (const candidate of CANDIDATES) {
    console.log(`\n======================================================`);
    console.log(`🔍 Probing: ${candidate.name} (${candidate.category})`);
    console.log(`======================================================`);

    for (const probeItem of candidate.probeUrls) {
      const page = await context.newPage();
      const itemResult: any = {
        candidateId: candidate.id,
        candidateName: candidate.name,
        aiCategory: candidate.category,
        label: probeItem.label,
        initialUrl: probeItem.url,
        candidateType: probeItem.candidateType,
        finalUrl: probeItem.url,
        status: null,
        reachable: false,
        is404: false,
        isBlocked: false,
        title: '',
        evidenceSnippet: '',
        discountFound: null,
        eligibilityFound: null,
        hasAnnualDiscount: false,
        annualDiscountAmount: null,
        hasStudentOffer: false,
        hasStartupOffer: false,
        hasApiDiscount: false,
        hasFreeTierOrTrial: false,
        isExpired: false,
        expiredReason: null,
      };

      try {
        const response = await page.goto(probeItem.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        if (response) {
          itemResult.status = response.status();
          itemResult.finalUrl = response.url();
          itemResult.reachable = response.status() < 400;
          itemResult.is404 = response.status() === 404;
        }

        itemResult.title = await page.title();

        // Detect Cloudflare / Bot blocks
        if (itemResult.title.includes('Just a moment') || itemResult.title.includes('Cloudflare') || itemResult.status === 403) {
          itemResult.isBlocked = true;
        }

        // Extract body text
        const bodyText = (await page.innerText('body').catch(() => '')) || '';

        // Check 404 in DOM
        if (
          itemResult.title.includes('404') ||
          itemResult.title.includes('Not Found') ||
          bodyText.includes('Page not found') ||
          bodyText.includes('Error 404') ||
          bodyText.includes('This page could not be found')
        ) {
          itemResult.is404 = true;
          itemResult.reachable = false;
        }

        // Detect Expired signals
        if (
          /promotion\s+ended|offer\s+has\s+ended|no\s+longer\s+available|campaign\s+ended|program\s+closed/i.test(bodyText)
        ) {
          itemResult.isExpired = true;
          itemResult.expiredReason = 'Terms indicate promotion or program has ended';
        }

        // Detect Annual discount patterns
        const annualMatch =
          bodyText.match(/save\s+(?:up\s+to\s+)?(\d+%\s*(?:off|discount)?)/i) ||
          bodyText.match(/(\d+%\s*off)\s*(?:on\s+annual|billed\s+annually|when\s+billed\s+annually)/i) ||
          bodyText.match(/billed\s+annually[\s\S]{0,40}?save\s*(\d+%)/i) ||
          bodyText.match(/(\d+)\s+months\s+free/i);

        if (annualMatch) {
          itemResult.hasAnnualDiscount = true;
          itemResult.annualDiscountAmount = annualMatch[0].trim();
        }

        // Detect Student / Academic
        if (
          bodyText.match(/student|education|academic|educator|university|k-12|sheerid|student\s+beans/i) &&
          bodyText.match(/free|discount|50%|off|grant|pack/i)
        ) {
          itemResult.hasStudentOffer = true;
        }

        // Detect Startup
        if (
          bodyText.match(/startup|accelerator|founder|incubator/i) &&
          bodyText.match(/credit|grant|\$|free/i)
        ) {
          itemResult.hasStartupOffer = true;
        }

        // Detect API discount / credits
        if (
          bodyText.match(/prompt\s+caching|cache\s+read|batch|batch\s+api|off-peak|free\s+credits|developer\s+credits/i)
        ) {
          itemResult.hasApiDiscount = true;
        }

        // Detect Trial / Free Tier
        if (
          bodyText.match(/free\s+trial|14-day\s+trial|30-day\s+trial|start\s+for\s+free|free\s+tier|free\s+forever/i)
        ) {
          itemResult.hasFreeTierOrTrial = true;
        }

        // Sample evidence snippet (first 250 characters of meaningful content)
        itemResult.evidenceSnippet = bodyText
          .replace(/\s+/g, ' ')
          .slice(0, 300)
          .trim();

      } catch (err: any) {
        itemResult.error = err.message;
        itemResult.reachable = false;
      } finally {
        await page.close();
      }

      console.log(`   [${probeItem.label}] Status: ${itemResult.status} | Reachable: ${itemResult.reachable} | 404: ${itemResult.is404} | Blocked: ${itemResult.isBlocked}`);
      if (itemResult.hasAnnualDiscount) console.log(`      ✓ Annual Discount: ${itemResult.annualDiscountAmount}`);
      if (itemResult.hasStudentOffer) console.log(`      ✓ Student/Edu Signal detected`);
      if (itemResult.hasStartupOffer) console.log(`      ✓ Startup Grant Signal detected`);
      if (itemResult.hasApiDiscount) console.log(`      ✓ API Discount Signal detected`);
      if (itemResult.hasFreeTierOrTrial) console.log(`      ✓ Free Trial / Tier Signal detected`);
      if (itemResult.isExpired) console.log(`      ⚠️ EXPIRED: ${itemResult.expiredReason}`);

      results.push(itemResult);
    }
  }

  await browser.close();

  // Save raw probe results to scratch
  const fs = await import('fs');
  fs.writeFileSync('scratch/candidate_probe_results.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\n\n✅ Probing complete! Results saved to scratch/candidate_probe_results.json');
}

probe().catch(console.error);
