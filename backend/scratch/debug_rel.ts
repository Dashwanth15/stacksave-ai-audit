import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { RelationshipEngine } from '../src/audit-engine/services/RelationshipEngine';

KnowledgeLoader.initialize();

const r1 = RelationshipEngine.analyze('cursor', 'github-copilot', 'coding');
console.log('=== cursor vs github-copilot (coding) ===');
console.log('workflowOverlap:', r1?.workflowOverlap);
console.log('complementarity:', r1?.complementarity);
console.log('replacementConf:', r1?.replacementConfidence);
console.log('capSimilarity:  ', r1?.capabilitySimilarity);
console.log('type:           ', r1?.relationshipType);
console.log('dominance:      ', r1?.dominance.winnerId);

const r2 = RelationshipEngine.analyze('cursor', 'claude', 'coding');
console.log('\n=== cursor vs claude (coding) ===');
console.log('workflowOverlap:', r2?.workflowOverlap);
console.log('complementarity:', r2?.complementarity);
console.log('type:           ', r2?.relationshipType);

const clusters = RelationshipEngine.clusterByOverlap(['cursor', 'github-copilot', 'claude'], 'coding');
console.log('\n=== clusters (coding) ===');
console.log(JSON.stringify(clusters));
console.log('CLUSTER_OVERLAP_THRESHOLD:', RelationshipEngine.CLUSTER_OVERLAP_THRESHOLD);
