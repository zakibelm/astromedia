export interface LLMConfig {
    provider: "openrouter" | "huggingface";
    model: string;
    cost: number;
    speed: number;
    quality: number;
    useCases: string[];
}
export declare const llmCatalog: LLMConfig[];
//# sourceMappingURL=llmCatalog.d.ts.map