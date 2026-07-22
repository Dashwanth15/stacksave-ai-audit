// ============================================================
// Knowledge Loader — StackSave AI Platform Intelligence
//
// Dynamically loads, validates, and caches provider JSON profiles
// from the independent knowledge repository.
// ============================================================

import fs from 'fs';
import path from 'path';
// __dirname is globally available in CommonJS target

export interface CapabilityEntry {
  score: number;
  evidence: string;
  source: string;
  lastVerified: string;
}

export interface ProviderProfile {
  id: string;
  name: string;
  category: 'ide' | 'chat' | 'api';
  vendor: string;
  primaryRole: string;
  secondaryRole: string;
  pricing: Record<string, number>;
  billingModels: string[];
  enterpriseAvailability: boolean;
  capabilities: Record<string, CapabilityEntry>;
  productivityScores: {
    reasoning: number;
    coding: number;
    planning: number;
    velocity: number;
    developerExperience: number;
    enterpriseReadiness: number;
    maintainability: number;
    learningCurve: 'Very Low' | 'Low' | 'Medium' | 'High';
    migrationCost: 'None' | 'Low' | 'Medium' | 'High';
    risk: 'Low' | 'Medium' | 'High';
  };
  knownStrengths: string[];
  knownWeaknesses: string[];
  bestUseCases: string[];
  typicalTeamSize: string;
  supportedModels: string[];
  ideSupport: string[];
  apiSupport: boolean;
  knowledgeVersion: string;
  lastUpdated: string;
  sources: string[];
}

export class KnowledgeLoader {
  private static cache = new Map<string, ProviderProfile>();
  private static initialized = false;

  /**
   * Initializes the repository by loading all JSON files dynamically.
   */
  public static initialize(): void {
    if (this.initialized) return;

    // Search paths to accommodate dev (src/) and build (dist/) layouts
    const searchDirs = [
      path.join(process.cwd(), 'src/knowledge/providers'),
      path.join(process.cwd(), 'knowledge/providers'),
      path.join(__dirname, '../../knowledge/providers'),
      path.join(__dirname, '../../../src/knowledge/providers')
    ];

    let loadedDir: string | null = null;
    let files: string[] = [];

    for (const dir of searchDirs) {
      try {
        if (fs.existsSync(dir)) {
          files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
          if (files.length > 0) {
            loadedDir = dir;
            break;
          }
        }
      } catch (err) {
        // Continue searching
      }
    }

    if (!loadedDir || files.length === 0) {
      console.warn('⚠️  Could not find any provider JSON profiles in search paths.');
      return;
    }

    for (const file of files) {
      try {
        const filePath = path.join(loadedDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const profile = JSON.parse(content) as ProviderProfile;
        
        // Normalize IDs to lowercase for strict validation lookup
        this.cache.set(profile.id.toLowerCase(), profile);
      } catch (err) {
        console.error(`❌ Failed to parse provider JSON file: ${file}`, err);
      }
    }

    this.initialized = true;
  }

  public static getProvider(id: string): ProviderProfile | null {
    this.initialize();
    return this.cache.get(id.toLowerCase()) || null;
  }

  public static getAllProviders(): ProviderProfile[] {
    this.initialize();
    return Array.from(this.cache.values());
  }

  public static clearCache(): void {
    this.cache.clear();
    this.weights = null;
    this.initialized = false;
  }

  private static weights: Record<string, Record<string, number>> | null = null;

  public static getWorkflowWeights(): Record<string, Record<string, number>> {
    if (this.weights) return this.weights;

    const searchDirs = [
      path.join(process.cwd(), 'src/knowledge'),
      path.join(process.cwd(), 'knowledge'),
      path.join(__dirname, '../../knowledge'),
      path.join(__dirname, '../../../src/knowledge')
    ];

    for (const dir of searchDirs) {
      try {
        const filePath = path.join(dir, 'workflow-weights.json');
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          this.weights = JSON.parse(content);
          return this.weights!;
        }
      } catch (err) {
        // Continue searching
      }
    }

    return {};
  }

  private static strategies: any = null;

  public static getStrategyConfig(): Record<string, any> {
    if (this.strategies) return this.strategies;

    const searchDirs = [
      path.join(process.cwd(), 'src/knowledge'),
      path.join(process.cwd(), 'knowledge'),
      path.join(__dirname, '../../knowledge'),
      path.join(__dirname, '../../../src/knowledge')
    ];

    for (const dir of searchDirs) {
      try {
        const filePath = path.join(dir, 'strategy-config.json');
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          this.strategies = JSON.parse(content);
          return this.strategies!;
        }
      } catch (err) {
        // Continue searching
      }
    }

    // Return hardcoded fallback if file cannot be read
    return {
      performance: {
        minimumCapability: 7,
        maximumCapabilityLoss: 2,
        minimumRetention: 95,
        weights: {
          workflowCapability: 0.45,
          monthlyCost: 0.05,
          capabilityRetention: 0.20,
          productivityImpact: 0.20,
          migrationRisk: 0.10
        }
      },
      savings: {
        minimumCapability: 6,
        maximumCapabilityLoss: 3,
        minimumRetention: 85,
        weights: {
          workflowCapability: 0.20,
          monthlyCost: 0.45,
          capabilityRetention: 0.20,
          productivityImpact: 0.10,
          migrationRisk: 0.05
        }
      }
    };
  }
}
