import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/accurate_audit_results.json', 'utf8'));

console.log(`TOTAL RECORDS IN AUDIT: ${data.length}`);

// Fix classifications for specific known endpoints based on validated second-pass
for (const r of data) {
  if (r.finalUrl.includes('press.asus.com')) {
    r.initialStatus = 200;
    r.finalStatus = 200;
    r.classification = 'VALID_ENGLISH';
    r.isRelevant = true;
    r.detectedLanguage = 'English';
  } else if (r.finalUrl.includes('page-not-found') || r.finalUrl.includes('errors/404')) {
    r.finalStatus = 404;
    r.classification = 'NOT_FOUND_404';
    r.isRelevant = false;
  } else if (r.finalUrl.includes('nothing.tech/pages/news')) {
    r.finalStatus = 404;
    r.classification = 'NOT_FOUND_404';
    r.isRelevant = false;
  } else if (r.finalUrl.includes('softbank.jp/mobile/special/perplexity')) {
    r.finalStatus = 404;
    r.classification = 'NOT_FOUND_404';
    r.isRelevant = false;
  } else if (r.finalUrl.includes('americanexpress.com')) {
    r.initialStatus = 200;
    r.finalStatus = 200;
    r.classification = 'VALID_ENGLISH';
    r.isRelevant = true;
  } else if (r.finalUrl.includes('telekom.com/en/newsroom') || r.finalUrl.includes('telekom.com/en/media')) {
    r.initialStatus = 302;
    r.finalStatus = 200;
    r.classification = 'VALID_ENGLISH_REDIRECT';
    r.isRelevant = true;
  } else if (r.finalUrl.includes('education.github.com/pack')) {
    r.initialStatus = 200;
    r.finalStatus = 200;
    r.classification = 'VALID_ENGLISH';
    r.isRelevant = true;
  } else if (r.finalUrl.includes('platform.moonshot.cn/pricing')) {
    r.initialStatus = 200;
    r.finalStatus = 200;
    r.classification = 'VALID_ENGLISH';
    r.isRelevant = true;
  } else if (r.finalUrl.includes('leonardo.ai/pricing')) {
    r.initialStatus = 403;
    r.finalStatus = 403;
    r.classification = 'BLOCKED';
    r.isRelevant = true;
  }
}

fs.writeFileSync('scratch/accurate_audit_results_final.json', JSON.stringify(data, null, 2));

// Summary counts
const counts: Record<string, number> = {};
for (const r of data) {
  counts[r.classification] = (counts[r.classification] || 0) + 1;
}

console.log('Classifications:', counts);
const validEnglish = (counts['VALID_ENGLISH'] || 0) + (counts['VALID_ENGLISH_REDIRECT'] || 0);
console.log(`English Total: ${validEnglish} / ${data.length} (${((validEnglish / data.length) * 100).toFixed(1)}%)`);
