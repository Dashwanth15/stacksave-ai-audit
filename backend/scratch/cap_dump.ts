import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
KnowledgeLoader.initialize();
for (const p of KnowledgeScoringEngine.scoreAll()) {
  const cv: any = p.capabilityVector;
  console.log(p.id.padEnd(16), 'cat=' + String(p.category).padEnd(5), 'entSec=' + cv.enterpriseSecurity, 'sso=' + cv.sso, 'saml=' + cv.saml, 'govVerified=' + p.governanceDataVerified);
}
