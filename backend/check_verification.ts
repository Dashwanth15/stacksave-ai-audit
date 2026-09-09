import { KnowledgeLoader } from './src/audit-engine/services/KnowledgeLoader';

KnowledgeLoader.initialize();

const glm = KnowledgeLoader.getProvider('glm');
const gh = KnowledgeLoader.getProvider('github-copilot');

console.log('=== GLM ENTERPRISE BLOCK ===');
console.log(JSON.stringify(glm?.enterprise, null, 2));

console.log('\n=== GITHUB COPILOT ENTERPRISE BLOCK ===');
console.log(JSON.stringify(gh?.enterprise, null, 2));

console.log('\n=== GLM SIGNATURE ===');
console.log(JSON.stringify(glm?.enterprise, null, 2));

console.log('\n=== GITHUB COPILOT SIGNATURE ===');
console.log(JSON.stringify(gh?.enterprise, null, 2));

const glmStr = JSON.stringify(glm?.enterprise);
const ghStr = JSON.stringify(gh?.enterprise);

console.log('\n=== SIGNATURE COMPARISON ===');
console.log('Identical:', glmStr === ghStr);
