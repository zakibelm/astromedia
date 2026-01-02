"use strict";
// services/llmCatalog.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmCatalog = void 0;
// Tested and working OpenRouter models
exports.llmCatalog = [
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
//# sourceMappingURL=llmCatalog.js.map