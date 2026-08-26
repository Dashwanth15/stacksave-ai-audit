import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
KnowledgeLoader.initialize();
const fm = KnowledgeLoader.getFeatureMap();
for (const p of KnowledgeScoringEngine.scoreAll()) {
  const cv: any = p.capabilityVector;
  const fitCC = StackCoverageAnalyzer.capabilityFit(p, fm.features['code-completion']);
  const fitEG = StackCoverageAnalyzer.capabilityFit(p, fm.features['editor-code-generation']);
  console.log(p.id.padEnd(16), 'autocomplete=' + String(cv.autocomplete).padEnd(4), 'ideIntegration=' + String(cv.ideIntegration).padEnd(4), 'coding=' + String(cv.coding).padEnd(4), 'multiFile=' + String(cv.multiFileEditing).padEnd(5), 'fit(code-completion)=' + String(fitCC).padEnd(5), 'fit(editor-code-gen)=' + fitEG);
}
