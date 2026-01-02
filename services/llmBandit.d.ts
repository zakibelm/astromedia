import { LLMConfig } from "./llmCatalog";
import { Criteria } from "./llmRouter";
/**
 * Sélectionne un modèle en utilisant la stratégie ε-Greedy (Multi-Armed Bandit).
 *
 * @param agent - L'ID de l'agent demandeur.
 * @param criteria - Les critères de sélection (qualité, coût, etc.).
 * @param epsilon - La probabilité (0.0 à 1.0) de choisir l'exploration plutôt que l'exploitation.
 * @returns La configuration du modèle LLM choisi.
 */
export declare function pickBanditModel(agent: string, criteria?: Criteria, epsilon?: number): LLMConfig;
//# sourceMappingURL=llmBandit.d.ts.map