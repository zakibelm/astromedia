// tests/unit/llmFeedback.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { updateModelStats } from '../../services/llmFeedback';
import { modelMemory } from '../../services/llmMemory';

describe('llmFeedback: updateModelStats', () => {
  const modelId = 'test-model-1';

  beforeEach(() => {
    // Vider la mémoire avant chaque test pour garantir l'isolation
    delete modelMemory[modelId];
  });

  it('doit initialiser les stats pour un nouveau modèle lors du premier appel réussi', () => {
    updateModelStats(modelId, { latency: 100, success: true });

    expect(modelMemory[modelId]).toBeDefined();
    const stats = modelMemory[modelId];
    expect(stats.calls).toBe(1);
    expect(stats.avgLatency).toBe(100);
    expect(stats.successRate).toBe(1);
    expect(stats.score).toBeGreaterThan(0);
  });

  it('doit initialiser les stats pour un nouveau modèle lors du premier appel échoué', () => {
    updateModelStats(modelId, { latency: 200, success: false });

    expect(modelMemory[modelId]).toBeDefined();
    const stats = modelMemory[modelId];
    expect(stats.calls).toBe(1);
    expect(stats.avgLatency).toBe(200);
    expect(stats.successRate).toBe(0);
  });

  it('doit mettre à jour correctement les stats après plusieurs appels réussis', () => {
    updateModelStats(modelId, { latency: 100, success: true });
    updateModelStats(modelId, { latency: 200, success: true });

    const stats = modelMemory[modelId];
    expect(stats.calls).toBe(2);
    expect(stats.avgLatency).toBe(150); // (100 + 200) / 2
    expect(stats.successRate).toBe(1);
  });

  it('doit diminuer correctement le taux de succès après un échec', () => {
    // Le premier appel est un succès
    updateModelStats(modelId, { latency: 100, success: true });
    expect(modelMemory[modelId].successRate).toBe(1);

    // Le deuxième appel est un échec
    updateModelStats(modelId, { latency: 300, success: false });
    const stats = modelMemory[modelId];
    expect(stats.calls).toBe(2);
    expect(stats.successRate).toBe(0.5); // (1 * 1 + 0) / 2
  });

  it('doit recalculer le score adaptatif en fonction de la performance', () => {
    // Premier appel : succès, faible latence -> bon score
    updateModelStats(modelId, { latency: 100, success: true });
    const initialScore = modelMemory[modelId].score;
    expect(initialScore).toBeGreaterThan(1); // Devrait être un score décent

    // Deuxième appel : échec, latence élevée -> le score devrait chuter de manière significative
    updateModelStats(modelId, { latency: 1000, success: false });
    const scoreAfterFailure = modelMemory[modelId].score;
    expect(scoreAfterFailure).toBeLessThan(initialScore);

    // Troisième appel : succès, très faible latence -> le score devrait s'améliorer
    updateModelStats(modelId, { latency: 50, success: true });
    const scoreAfterRecovery = modelMemory[modelId].score;
    expect(scoreAfterRecovery).toBeGreaterThan(scoreAfterFailure);
  });
});
