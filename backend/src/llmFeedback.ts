import { modelMemory } from "./llmMemory";

export function updateModelStats(modelId: string, metrics: {
    latency: number;
    success: boolean;
    satisfaction?: number;
    tokens?: number;
    costPer1k?: number;
}) {
    let stats = modelMemory[modelId] || {
        calls: 0,
        avgLatency: 0,
        successRate: 1,
        satisfaction: 1,
        costPer1k: metrics.costPer1k ?? 0.01,
        score: 1
    };

    stats.calls += 1;
    stats.avgLatency = (stats.avgLatency * (stats.calls - 1) + metrics.latency) / stats.calls;
    stats.successRate = (stats.successRate * (stats.calls - 1) + (metrics.success ? 1 : 0)) / stats.calls;
    stats.satisfaction = (stats.satisfaction * (stats.calls - 1) + (metrics.satisfaction ?? 1)) / stats.calls;

    const latencyScore = 1000 / (stats.avgLatency + 50);
    const costScore = 1 / (stats.costPer1k + 0.01);

    stats.score = (stats.successRate * 0.4) +
        (stats.satisfaction * 0.3) +
        (latencyScore * 0.2) +
        (costScore * 0.1);

    modelMemory[modelId] = stats;
}
