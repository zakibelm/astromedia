export type Criteria = "cost" | "speed" | "quality" | "balanced";
/**
 * Executes an LLM call with intelligent provider routing.
 * Automatically detects provider and routes to appropriate API.
 */
export declare function runLLM(task: {
    agent: string;
    input: string;
    systemInstruction?: string;
    criteria?: Criteria;
    responseMimeType?: "application/json" | "text/plain";
}): Promise<{
    response: any | null;
    modelId: string;
    latency: number;
    success: boolean;
    error?: Error;
}>;
//# sourceMappingURL=llmRouter.d.ts.map