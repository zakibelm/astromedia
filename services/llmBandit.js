"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickBanditModel = pickBanditModel;
// services/llmBandit.ts
const llmCatalog_1 = require("./llmCatalog");
const llmMemory_1 = require("./llmMemory");
/**
 * Calcule un score de base pour un modèle en fonction des critères statiques du catalogue.
 */
function getBaseScore(model, criteria) {
    switch (criteria) {
        case "cost":
            return 1 / (model.cost + 0.01); // Epsilon pour éviter la division par zéro
        case "speed":
            return model.speed;
        case "quality":
            return model.quality;
        case "balanced":
        default:
            const costScore = 1 / (model.cost + 0.01);
            return (model.quality * 0.5) + (model.speed * 0.3) + (costScore * 0.2);
    }
}
/**
 * Sélectionne un modèle en utilisant la stratégie ε-Greedy (Multi-Armed Bandit).
 *
 * @param agent - L'ID de l'agent demandeur.
 * @param criteria - Les critères de sélection (qualité, coût, etc.).
 * @param epsilon - La probabilité (0.0 à 1.0) de choisir l'exploration plutôt que l'exploitation.
 * @returns La configuration du modèle LLM choisi.
 */
function pickBanditModel(agent, criteria = "balanced", epsilon = 0.1) {
    // Filtrer les candidats éligibles pour l'agent, avec un fallback sur "default"
    const candidates = llmCatalog_1.llmCatalog.filter(m => m.useCases.includes(agent) || m.useCases.includes("default"));
    if (candidates.length === 0) {
        // Si aucun candidat, on retourne le premier modèle du catalogue par sécurité
        return llmCatalog_1.llmCatalog[0];
    }
    // Phase d'exploration (choix aléatoire)
    if (Math.random() < epsilon) {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        const randomModel = candidates[randomIndex];
        console.log(`[Bandit] 🎲 Exploration -> selected "${randomModel.model}"`);
        return randomModel;
    }
    // Phase d'exploitation (choix du meilleur modèle connu)
    const ranked = candidates.map(m => {
        const memory = llmMemory_1.modelMemory[m.model] || { score: 1.0 };
        const baseScore = getBaseScore(m, criteria);
        const finalScore = baseScore * memory.score;
        return { ...m, finalScore };
    }).sort((a, b) => b.finalScore - a.finalScore);
    const bestModel = ranked[0];
    console.log(`[Bandit] ✅ Exploitation -> selected "${bestModel.model}" (Final Score: ${bestModel.finalScore.toFixed(3)})`);
    return bestModel;
}
//# sourceMappingURL=llmBandit.js.map