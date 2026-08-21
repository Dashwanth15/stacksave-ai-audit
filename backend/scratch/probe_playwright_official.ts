import { chromium } from 'playwright';

interface Target {
  id: string;
  name: string;
  urls: string[];
}

const targets: Target[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    urls: ['https://openai.com/chatgpt/pricing', 'https://openai.com/pricing'],
  },
  {
    id: 'claude',
    name: 'Claude',
    urls: ['https://claude.com/pricing', 'https://www.anthropic.com/pricing'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    urls: ['https://one.google.com/about/ai-premium', 'https://gemini.google.com/pricing'],
  },
  {
    id: 'windsurf',
    name: 'Windsurf / Codeium',
    urls: ['https://codeium.com/pricing', 'https://windsurf.com/pricing'],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    urls: ['https://www.perplexity.ai/pro', 'https://www.perplexity.ai/pricing'],
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    urls: ['https://platform.moonshot.cn/docs/pricing/chat', 'https://platform.moonshot.cn/pricing'],
  },
  {
    id: 'anthropic-api',
    name: 'Anthropic API',
    urls: ['https://www.anthropic.com/pricing', 'https://docs.anthropic.com/en/docs/about-claude/models'],
  },
  {
    id: 'openai-api',
    name: 'OpenAI API',
    urls: ['https://openai.com/api/pricing'],
  },
];

async function probePlaywright(url: string, browser: any) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  try {
    console.log(`  → Visiting ${url}...`);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = response?.status() ?? 0;
    
    // Give dynamic JS 3 seconds to hydrate
    await page.waitForTimeout(3000);

    const title = await page.title();
    const finalUrl = page.url();
    const content = await page.content();
    const text = await page.innerText('body').catch(() => '');

    const isCloudflare =
      title.includes('Just a moment...') ||
      content.includes('cf-browser-verification') ||
      content.includes('cf-challenge') ||
      content.includes('Cloudflare') && status === 403;

    const isAuthRequired =
      finalUrl.includes('login') ||
      finalUrl.includes('auth') ||
      text.includes('Sign in to continue') ||
      text.includes('Log in');

    const dollarMatches = text.match(/\$\d+(?:\.\d+)?(?:\s*\/\s*(?:mo|month|user|seat|m|M))?/gi)?.slice(0, 10) || [];

    // Extract potential plan sections
    const planKeywords = ['Free', 'Plus', 'Pro', 'Team', 'Enterprise', 'Individual', 'Business', 'Advanced', 'Premium'];
    const foundKeywords = planKeywords.filter(kw => new RegExp(`\\b${kw}\\b`, 'i').test(text));

    await context.close();

    return {
      status,
      finalUrl,
      title,
      isCloudflare,
      isAuthRequired,
      dollarMatches,
      foundKeywords,
      sampleText: text.slice(0, 400).replace(/\s+/g, ' '),
    };
  } catch (err: any) {
    await context.close();
    return {
      error: err.message,
    };
  }
}

async function main() {
  console.log('STARTING PLAYWRIGHT HEADLESS BROWSER AUDIT OF OFFICIAL PAGES...\n');
  const browser = await chromium.launch({ headless: true });

  for (const t of targets) {
    console.log(`========================================================`);
    console.log(`AUDITING: ${t.name.toUpperCase()} (${t.id})`);
    console.log(`========================================================`);

    for (const u of t.urls) {
      const res = await probePlaywright(u, browser);
      console.log(`URL: ${u}`);
      console.log(`Result:`, JSON.stringify(res, null, 2));
      console.log();
    }
  }

  await browser.close();
  console.log('PLAYWRIGHT AUDIT COMPLETE.');
}

main().catch(console.error);
