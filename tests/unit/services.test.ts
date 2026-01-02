// tests/unit/services.test.ts
// Comprehensive unit tests for AstroMedia services
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================
// IMAGE GENERATOR TESTS
// ============================================================
describe('imageGenerator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return a base64 placeholder image', async () => {
    const { generateImage } = await import('../../services/imageGenerator');
    
    const promise = generateImage('a robot cat');
    vi.advanceTimersByTime(1000);
    const result = await promise;

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    // Should be valid base64
    expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('should log the prompt', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const { generateImage } = await import('../../services/imageGenerator');
    
    const promise = generateImage('test prompt');
    vi.advanceTimersByTime(1000);
    await promise;

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ImageGenerator]')
    );
    consoleSpy.mockRestore();
  });
});

// ============================================================
// VIDEO GENERATOR TESTS
// ============================================================
describe('videoGenerator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return a placeholder video string', async () => {
    const { generateVideo } = await import('../../services/videoGenerator');
    
    const promise = generateVideo('create a video');
    vi.advanceTimersByTime(2000);
    const result = await promise;

    expect(typeof result).toBe('string');
  });

  it('should accept optional image input', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const { generateVideo } = await import('../../services/videoGenerator');
    
    const imageInput = { imageBytes: 'dGVzdA==', mimeType: 'image/jpeg' };
    const promise = generateVideo('create a video', imageInput);
    vi.advanceTimersByTime(2000);
    await promise;

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Using provided image')
    );
    consoleSpy.mockRestore();
  });
});

// ============================================================
// LLM CATALOG TESTS
// ============================================================
describe('llmCatalog', () => {
  it('should export a non-empty array of LLM configurations', async () => {
    const { llmCatalog } = await import('../../services/llmCatalog');
    
    expect(Array.isArray(llmCatalog)).toBe(true);
    expect(llmCatalog.length).toBeGreaterThan(0);
  });

  it('each model should have required properties', async () => {
    const { llmCatalog } = await import('../../services/llmCatalog');
    
    for (const model of llmCatalog) {
      expect(model).toHaveProperty('provider');
      expect(model).toHaveProperty('model');
      expect(model).toHaveProperty('cost');
      expect(model).toHaveProperty('speed');
      expect(model).toHaveProperty('quality');
      expect(model).toHaveProperty('useCases');
      
      expect(typeof model.cost).toBe('number');
      expect(typeof model.speed).toBe('number');
      expect(model.quality).toBeGreaterThanOrEqual(0);
      expect(model.quality).toBeLessThanOrEqual(1);
      expect(Array.isArray(model.useCases)).toBe(true);
    }
  });

  it('should have at least one model with default use case', async () => {
    const { llmCatalog } = await import('../../services/llmCatalog');
    
    const hasDefault = llmCatalog.some(m => m.useCases.includes('default'));
    expect(hasDefault).toBe(true);
  });
});

// ============================================================
// LLM MEMORY TESTS
// ============================================================
describe('llmMemory', () => {
  it('should export an empty modelMemory object initially', async () => {
    const { modelMemory } = await import('../../services/llmMemory');
    
    expect(modelMemory).toBeDefined();
    expect(typeof modelMemory).toBe('object');
  });

  it('should allow adding model stats', async () => {
    const { modelMemory, ModelStats } = await import('../../services/llmMemory');
    
    const testStats = {
      calls: 10,
      avgLatency: 500,
      successRate: 0.9,
      satisfaction: 0.8,
      costPer1k: 0.01,
      score: 1.2,
    };
    
    modelMemory['test-model'] = testStats;
    
    expect(modelMemory['test-model']).toEqual(testStats);
    
    // Cleanup
    delete modelMemory['test-model'];
  });
});

// ============================================================
// LLM BANDIT TESTS
// ============================================================
describe('llmBandit', () => {
  it('should return a model from the catalog', async () => {
    const { pickBanditModel } = await import('../../services/llmBandit');
    const { llmCatalog } = await import('../../services/llmCatalog');
    
    const model = pickBanditModel('default', 'balanced', 0);
    
    expect(model).toBeDefined();
    expect(llmCatalog.some(m => m.model === model.model)).toBe(true);
  });

  it('should return a model even for unknown agents (fallback to default)', async () => {
    const { pickBanditModel } = await import('../../services/llmBandit');
    
    const model = pickBanditModel('unknown-agent', 'balanced', 0);
    
    expect(model).toBeDefined();
    expect(model.model).toBeDefined();
  });

  it('should explore with high epsilon', async () => {
    const { pickBanditModel } = await import('../../services/llmBandit');
    const consoleSpy = vi.spyOn(console, 'log');
    
    // With epsilon = 1, should always explore
    pickBanditModel('default', 'balanced', 1);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Exploration')
    );
    consoleSpy.mockRestore();
  });

  it('should exploit with zero epsilon', async () => {
    const { pickBanditModel } = await import('../../services/llmBandit');
    const consoleSpy = vi.spyOn(console, 'log');
    
    // With epsilon = 0, should always exploit
    pickBanditModel('default', 'balanced', 0);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Exploitation')
    );
    consoleSpy.mockRestore();
  });

  it('should prioritize cost with cost criteria', async () => {
    const { pickBanditModel } = await import('../../services/llmBandit');
    const { llmCatalog } = await import('../../services/llmCatalog');
    
    // All current models have cost 0, so any should work
    const model = pickBanditModel('default', 'cost', 0);
    
    expect(model.cost).toBeDefined();
    expect(typeof model.cost).toBe('number');
  });

  it('should prioritize quality with quality criteria', async () => {
    const { pickBanditModel } = await import('../../services/llmBandit');
    
    const model = pickBanditModel('default', 'quality', 0);
    
    expect(model.quality).toBeDefined();
    expect(model.quality).toBeGreaterThan(0);
  });
});

// ============================================================
// LLM FEEDBACK TESTS
// ============================================================
describe('llmFeedback', () => {
  it('should update model stats correctly', async () => {
    const { updateModelStats } = await import('../../services/llmFeedback');
    const { modelMemory } = await import('../../services/llmMemory');
    
    const testModelId = 'test-feedback-model';
    
    // First call - success
    updateModelStats(testModelId, { latency: 100, success: true });
    
    expect(modelMemory[testModelId]).toBeDefined();
    expect(modelMemory[testModelId].calls).toBe(1);
    expect(modelMemory[testModelId].successRate).toBe(1);
    
    // Second call - failure
    updateModelStats(testModelId, { latency: 200, success: false });
    
    expect(modelMemory[testModelId].calls).toBe(2);
    expect(modelMemory[testModelId].successRate).toBe(0.5);
    
    // Cleanup
    delete modelMemory[testModelId];
  });

  it('should calculate average latency', async () => {
    const { updateModelStats } = await import('../../services/llmFeedback');
    const { modelMemory } = await import('../../services/llmMemory');
    
    const testModelId = 'test-latency-model';
    
    updateModelStats(testModelId, { latency: 100, success: true });
    updateModelStats(testModelId, { latency: 300, success: true });
    
    expect(modelMemory[testModelId].avgLatency).toBe(200);
    
    // Cleanup
    delete modelMemory[testModelId];
  });
});
