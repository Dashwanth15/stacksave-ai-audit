import claudeSonnet from '../src/knowledge/providers/claude/models/claude-3-5-sonnet.json';
import claudeHaiku from '../src/knowledge/providers/claude/models/claude-3-5-haiku.json';
import claudeOpus from '../src/knowledge/providers/claude/models/claude-3-opus.json';

import gpt4o from '../src/knowledge/providers/chatgpt/models/gpt-4o.json';
import o1Mini from '../src/knowledge/providers/chatgpt/models/o1-mini.json';
import o1 from '../src/knowledge/providers/chatgpt/models/o1.json';

import geminiPro from '../src/knowledge/providers/gemini/models/gemini-1-5-pro.json';
import geminiFlash from '../src/knowledge/providers/gemini/models/gemini-1-5-flash.json';

console.log('====================================================');
console.log('MODEL KNOWLEDGE CAPABILITY COMPARISON VERIFICATION');
console.log('====================================================\n');

console.log('1. CLAUDE MODELS:');
console.log('   Sonnet 3.5 -> Reasoning:', claudeSonnet.capabilities.reasoning.score, '| Coding:', claudeSonnet.capabilities.coding.score, '| Vision:', claudeSonnet.capabilities.vision.score);
console.log('   Haiku 3.5  -> Reasoning:', claudeHaiku.capabilities.reasoning.score, '| Coding:', claudeHaiku.capabilities.coding.score, '| Vision:', claudeHaiku.capabilities.vision.score);
console.log('   Opus 3     -> Reasoning:', claudeOpus.capabilities.reasoning.score, '| Coding:', claudeOpus.capabilities.coding.score, '| Vision:', claudeOpus.capabilities.vision.score);

console.log('\n2. CHATGPT MODELS:');
console.log('   GPT-4o    -> Reasoning:', gpt4o.capabilities.reasoning.score, '| Coding:', gpt4o.capabilities.coding.score, '| Vision:', gpt4o.capabilities.vision.score);
console.log('   o1-mini   -> Reasoning:', o1Mini.capabilities.reasoning.score, '| Coding:', o1Mini.capabilities.coding.score, '| Vision:', o1Mini.capabilities.vision.score);
console.log('   o1        -> Reasoning:', o1.capabilities.reasoning.score, '| Coding:', o1.capabilities.coding.score, '| Vision:', o1.capabilities.vision.score);

console.log('\n3. GEMINI MODELS:');
console.log('   1.5 Pro   -> Reasoning:', geminiPro.capabilities.reasoning.score, '| Coding:', geminiPro.capabilities.coding.score, '| Context:', geminiPro.capabilities.largeCodebaseUnderstanding.evidence.split(' ')[0]);
console.log('   1.5 Flash -> Reasoning:', geminiFlash.capabilities.reasoning.score, '| Coding:', geminiFlash.capabilities.coding.score, '| Context:', geminiFlash.capabilities.largeCodebaseUnderstanding.evidence.split(' ')[0]);
