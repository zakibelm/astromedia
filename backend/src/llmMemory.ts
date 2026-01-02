export interface ModelStats {
    calls: number;
    avgLatency: number;
    successRate: number;
    satisfaction: number;
    costPer1k: number;
    score: number;
}

export const modelMemory: Record<string, ModelStats> = {};
