import { AIStackRecommendationEngine } from './src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeScoringEngine } from './src/audit-engine/services/KnowledgeScoringEngine';
import { StackBuilderRequest } from './src/types/stackBuilder';

const baseRequest: StackBuilderRequest = {
  domain: 'general-productivity',
  requirements: [],
  strategy: 'balanced',
  monthlyBudget: 1000,
  teamSize: 10,
  preferences: {
    preferOpenSource: false,
    avoidLockIn: false,
    maximizeSavings: false,
    preferEstablishedVendors: false,
    requireZeroRetention: false,
  },
};

const req: StackBuilderRequest = {
  ...baseRequest,
  domain: 'software-engineering',
  strategy: 'enterprise-security',
  requirements: ['editor-code-generation', 'enterprise-governance'],
  debug: true,
};

console.log('TEST B DEBUG AFTER GOVERNANCE CORRECTION');
console.log('Request:', JSON.stringify(req, null, 2));

const allScores = KnowledgeScoringEngine.scoreAll();
const glmProfile = allScores.find((p) => p.id === 'glm');
const githubCopilotProfile = allScores.find((p) => p.id === 'github-copilot');

console.log('\n=== GLM PROFILE ===');
console.log('ID:', glmProfile?.id);
console.log('Name:', glmProfile?.name);
console.log('Category:', glmProfile?.category);
console.log('Security Score:', glmProfile?.securityScore);
console.log('Governance Data Verified:', glmProfile?.governanceDataVerified);
console.log('Enterprise Score:', glmProfile?.enterpriseScore);
console.log('Compliance Score:', glmProfile?.complianceScore);

console.log('\n=== GITHUB COPILOT PROFILE ===');
console.log('ID:', githubCopilotProfile?.id);
console.log('Name:', githubCopilotProfile?.name);
console.log('Category:', githubCopilotProfile?.category);
console.log('Security Score:', githubCopilotProfile?.securityScore);
console.log('Governance Data Verified:', githubCopilotProfile?.governanceDataVerified);
console.log('Enterprise Score:', githubCopilotProfile?.enterpriseScore);
console.log('Compliance Score:', githubCopilotProfile?.complianceScore);

const res = AIStackRecommendationEngine.run(req);

console.log('\n=== RECOMMENDATION RESULT ===');
console.log('Best Overall Primary:', res.stacks.bestOverall.primary);
console.log('Best Enterprise Primary:', res.categories.bestEnterprise.recommendedStack.primary);

console.log('\n=== ALL CANDIDATES ===');
if (res.trace?.candidateAudit) {
  const glmCandidate = res.trace.candidateAudit.find((c) => c.providerId === 'glm');
  const githubCopilotCandidate = res.trace.candidateAudit.find((c) => c.providerId === 'github-copilot');
  
  console.log('\nGLM Candidate:', JSON.stringify(glmCandidate, null, 2));
  console.log('\nGitHub Copilot Candidate:', JSON.stringify(githubCopilotCandidate, null, 2));
}
