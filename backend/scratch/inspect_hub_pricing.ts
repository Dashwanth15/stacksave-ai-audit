import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  console.log('=== Checking https://perplexity.ai/hub/pricing ===');
  await page.goto('https://perplexity.ai/hub/pricing', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(4000);

  const data = await page.evaluate(() => {
    const text = document.body.innerText;
    const buttons = Array.from(document.querySelectorAll('button, a, div[role="tab"]')).map(el => ({
      tag: el.tagName,
      role: el.getAttribute('role'),
      text: el.textContent?.trim(),
      href: (el as HTMLAnchorElement).href,
    }));
    return {
      title: document.title,
      textSlice: text.slice(0, 4000),
      buttons: buttons.filter(b => b.text && (b.text.toLowerCase().includes('edu') || b.text.toLowerCase().includes('student') || b.text.toLowerCase().includes('pro') || b.text.toLowerCase().includes('personal'))),
    };
  });

  console.log('Page Title:', data.title);
  console.log('Tabs/Buttons:', data.buttons);
  console.log('Text snippet:\n', data.textSlice);

  await browser.close();
}

main();
