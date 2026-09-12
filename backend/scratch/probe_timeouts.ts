import { execSync } from 'child_process';
import * as fs from 'fs';

const specific = [
  { name: 'Nothing Technology', url: 'https://nothing.tech/pages/news' },
  { name: 'Deutsche Telekom', url: 'https://www.telekom.com/en/media' },
  { name: 'American Express', url: 'https://www.americanexpress.com/us/credit-cards/business-cards/' },
  { name: 'JetBrains', url: 'https://education.github.com/pack' },
  { name: 'Kimi (Moonshot)', url: 'https://platform.moonshot.cn/pricing' },
  { name: 'Leonardo AI', url: 'https://leonardo.ai/pricing' },
];

for (const s of specific) {
  try {
    const cmd = `curl.exe -s -L -4 --connect-timeout 8 --max-time 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" -w "\\n---META---\\n%{http_code}\\n%{url_effective}" "${s.url}"`;
    const out = execSync(cmd, { encoding: 'utf8' });
    const parts = out.split('---META---');
    const html = parts[0] || '';
    const meta = (parts[1] || '').trim().split('\n');
    const code = meta[0];
    const finalUrl = meta[1];
    const is404 = code === '404' || html.includes('404 Not Found') || html.includes('Page Not Found');
    console.log(`[${code}] ${s.name.padEnd(20)} -> ${finalUrl} (is404: ${is404}, size: ${html.length})`);
  } catch (e: any) {
    console.log(`[ERR] ${s.name.padEnd(20)} -> ${e.message}`);
  }
}
