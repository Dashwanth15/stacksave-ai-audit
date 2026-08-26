import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
KnowledgeLoader.initialize();
const fm = KnowledgeLoader.getFeatureMap();
const entry = fm.features['private-deployment'];
for (const p of KnowledgeScoringEngine.scoreAll()) {
  const raw: any = p.raw;
  const covered = StackCoverageAnalyzer.fullyCoveredBy(p, [], ['private-deployment']).length > 0;
  console.log(p.id.padEnd(16), 'covers=' + String(covered).padEnd(6), 'fit=' + String(StackCoverageAnalyzer.capabilityFit(p, entry)).padEnd(5), 'privateDeployment=' + raw.enterprise?.security?.privateDeployment, 'govVerified=' + p.governanceDataVerified);
}
