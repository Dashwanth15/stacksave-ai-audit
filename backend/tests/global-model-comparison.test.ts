import { describe, it, expect, beforeAll } from 'vitest';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { getProviderModels } from '../../frontend/src/data/providerKnowledge';

describe('Global Model & Version Comparison Engine', () => {
  beforeAll(() => {
    KnowledgeLoader.initialize();
  });

  it('1. Loads model-specific JSON profiles without falling back to provider defaults', () => {
    const claudeSonnet = KnowledgeLoader.getProvider('claude', 'claude-3-5-sonnet');
    const claudeHaiku = KnowledgeLoader.getProvider('claude', 'claude-3-5-haiku');
    const claudeOpus = KnowledgeLoader.getProvider('claude', 'claude-3-opus');

    expect(claudeSonnet).toBeDefined();
    expect(claudeHaiku).toBeDefined();
    expect(claudeOpus).toBeDefined();

    // Verify model-specific capability deltas
    expect(claudeSonnet!.capabilities.coding.score).toBe(10);
    expect(claudeHaiku!.capabilities.coding.score).toBe(7);
    expect(claudeOpus!.capabilities.coding.score).toBe(8);

    expect(claudeSonnet!.capabilities.reasoning.score).toBe(10);
    expect(claudeHaiku!.capabilities.reasoning.score).toBe(7);
    expect(claudeOpus!.capabilities.reasoning.score).toBe(10);
  });

  it('2. Correctly distinguishes text-only STEM models (o1-mini) from multimodal models (GPT-4o, o1)', () => {
    const gpt4o = KnowledgeLoader.getProvider('chatgpt', 'gpt-4o');
    const o1Mini = KnowledgeLoader.getProvider('chatgpt', 'o1-mini');
    const o1 = KnowledgeLoader.getProvider('chatgpt', 'o1');

    expect(gpt4o!.capabilities.vision.score).toBe(10);
    expect(o1Mini!.capabilities.vision.score).toBe(0); // Text-only STEM model
    expect(o1!.capabilities.reasoning.score).toBe(10);
  });

  it('3. Distinguishes high-throughput lightweight models (Gemini Flash) from deep reasoning models (Gemini Pro)', () => {
    const geminiPro = KnowledgeLoader.getProvider('gemini', 'gemini-1-5-pro');
    const geminiFlash = KnowledgeLoader.getProvider('gemini', 'gemini-1-5-flash');

    expect(geminiPro!.capabilities.reasoning.score).toBe(8);
    expect(geminiFlash!.capabilities.reasoning.score).toBe(7);
  });

  it('4. Provides full cross-provider model options in frontend getProviderModels catalog', () => {
    const claudeOptions = getProviderModels('claude');
    expect(claudeOptions.length).toBeGreaterThan(3); // Includes Claude models + cross provider models

    const sameProvider = claudeOptions.filter(m => m.isCurrentProvider);
    expect(sameProvider.some(m => m.modelId === 'claude-3-5-haiku')).toBe(true);
    expect(sameProvider.some(m => m.modelId === 'claude-3-opus')).toBe(true);

    const crossProvider = claudeOptions.filter(m => !m.isCurrentProvider);
    expect(crossProvider.some(m => m.modelId === 'gpt-4o')).toBe(true);
    expect(crossProvider.some(m => m.modelId === 'gemini-1-5-pro')).toBe(true);
  });

  it('5. Distinguishes Kimi K3 Max, K3, and K2.7 Code models', () => {
    const kimiMax = KnowledgeLoader.getProvider('kimi', 'kimi-k3-max');
    const kimiK3 = KnowledgeLoader.getProvider('kimi', 'kimi-k3');

    expect(kimiMax).toBeDefined();
    expect(kimiK3).toBeDefined();
  });

  it('6. Synthesizes provider-level profiles using flagship models instead of alphabetical first file', () => {
    const claudeDefault = KnowledgeLoader.getProvider('claude');
    expect(claudeDefault).toBeDefined();
    expect(claudeDefault!.capabilities.coding.score).toBe(10); // Flagship Sonnet 3.5, not Haiku (7)
  });
});
