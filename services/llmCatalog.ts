// services/llmCatalog.ts

export interface LLMConfig {
  provider: "openrouter" | "huggingface";
  model: string;
  cost: number; // $/1M tokens, for scoring
  speed: number; // Relative speed score (higher is better)
  quality: number; // Relative quality score (0.0 to 1.0)
  useCases: string[]; // Matches Agent IDs from agentBrains.ts
}

// Tested and working OpenRouter models
export const llmCatalog: LLMConfig[] = [
  {
    provider: "openrouter",
    model: "mistralai/mistral-7b-instruct:free",
    cost: 0,
    speed: 1.0,
    quality: 0.7,
    useCases: ["default", "Copywriter", "Social"],
  },
  {
    provider: "openrouter",
    model: "google/gemma-2-9b-it:free",
    cost: 0,
    speed: 0.9,
    quality: 0.8,
    useCases: ["CMO", "ContentWriter", "MarketAnalyst"],
  },
  {
    provider: "openrouter",
    model: "meta-llama/llama-3.2-3b-instruct:free",
    cost: 0,
    speed: 1.2,
    quality: 0.75,
    useCases: ["SEO", "Analytics", "Scriptwriter"],
  }
];
