import fetch from 'node-fetch';

interface ProbeTarget {
  id: string;
  name: string;
  urls: string[];
  offerUrls: string[];
}

const targets: ProbeTarget[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    urls: ['https://cursor.com/pricing'],
    offerUrls: ['https://cursor.com/pricing', 'https://cursor.com'],
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    urls: ['https://github.com/features/copilot/plans'],
    offerUrls: ['https://github.com/features/copilot/plans'],
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    urls: ['https://openai.com/chatgpt/pricing', 'https://openai.com/pricing'],
    offerUrls: ['https://openai.com/chatgpt/pricing', 'https://openai.com/blog'],
  },
  {
    id: 'claude',
    name: 'Claude',
    urls: ['https://claude.com/pricing', 'https://www.anthropic.com/pricing'],
    offerUrls: ['https://claude.com/pricing', 'https://www.anthropic.com/news'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    urls: ['https://one.google.com/about/ai-premium', 'https://gemini.google.com/pricing'],
    offerUrls: ['https://one.google.com/about/ai-premium', 'https://blog.google/technology/ai/'],
  },
  {
    id: 'windsurf',
    name: 'Windsurf / Codeium',
    urls: ['https://windsurf.com/pricing', 'https://codeium.com/pricing'],
    offerUrls: ['https://codeium.com/pricing', 'https://codeium.com/blog'],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    urls: ['https://www.perplexity.ai/pro', 'https://www.perplexity.ai/pricing'],
    offerUrls: ['https://www.perplexity.ai/pro', 'https://www.perplexity.ai/blog'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    urls: ['https://api-docs.deepseek.com/quick_start/pricing', 'https://platform.deepseek.com/pricing', 'https://www.deepseek.com'],
    offerUrls: ['https://api-docs.deepseek.com/quick_start/pricing', 'https://www.deepseek.com'],
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    urls: ['https://platform.moonshot.cn/pricing', 'https://platform.moonshot.cn/docs/pricing', 'https://kimi.moonshot.cn'],
    offerUrls: ['https://platform.moonshot.cn/pricing'],
  },
  {
    id: 'anthropic-api',
    name: 'Anthropic API',
    urls: ['https://www.anthropic.com/pricing', 'https://docs.anthropic.com/en/docs/about-claude/models'],
    offerUrls: ['https://www.anthropic.com/pricing', 'https://www.anthropic.com/news'],
  },
  {
    id: 'openai-api',
    name: 'OpenAI API',
    urls: ['https://openai.com/api/pricing', 'https://platform.openai.com/docs/pricing'],
    offerUrls: ['https://openai.com/api/pricing', 'https://openai.com/blog'],
  },
  {
    id: 'codex',
    name: 'Codex (OpenAI)',
    urls: ['https://openai.com/blog/openai-codex', 'https://platform.openai.com/docs/guides/code'],
    offerUrls: ['https://openai.com/blog/openai-codex'],
  },
  {
    id: 'github-models',
    name: 'GitHub Models',
    urls: ['https://github.com/marketplace/models', 'https://github.com/features/models'],
    offerUrls: ['https://github.com/marketplace/models'],
  },
];

async function probeUrl(url: string) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
    });

    const status = res.status;
    const finalUrl = res.url;
    const contentType = res.headers.get('content-type') || '';
    const body = await res.text();

    const hasJsonLd = body.includes('application/ld+json');
    const hasNextData = body.includes('__NEXT_DATA__') || body.includes('react-app.embeddedData');
    const hasPriceDollar = /\$\d+(\.\d+)?/g.test(body);
    const dollarMatches = body.match(/\$\d+(\.\d+)?/g)?.slice(0, 8) || [];
    const isCloudflare = body.includes('Just a moment...') || body.includes('Cloudflare') || status === 403;

    return {
      status,
      finalUrl,
      contentType,
      bodyLength: body.length,
      hasJsonLd,
      hasNextData,
      hasPriceDollar,
      dollarMatches,
      isCloudflare,
      sample: body.slice(0, 300).replace(/\s+/g, ' '),
    };
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
}

async function main() {
  console.log('PROBING ALL 13 PROVIDER OFFICIAL PAGES...\n');

  for (const t of targets) {
    console.log(`=== ${t.name.toUpperCase()} (${t.id}) ===`);
    for (const u of t.urls) {
      const info = await probeUrl(u);
      console.log(`  URL: ${u}`);
      console.log(`  Result:`, JSON.stringify(info, null, 2));
    }
    console.log();
  }
}

main();
