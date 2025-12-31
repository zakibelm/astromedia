// services/llmFeedback.ts
import { modelMemory } from "./llmMemory";

/**
 * Met à jour les statistiques d'un modèle dans la mémoire après un appel.
 * Cette fonction est le moteur de la boucle de rétroaction adaptative.
 *
 * @param modelId - L'identifiant unique du modèle (ex: "openai/gpt-4o").
 * @param metrics - Les métriques de performance de l'appel qui vient de se terminer.
 */
export function updateModelStats(modelId: string, metrics: {
  latency: number;
  success: boolean;
  satisfaction?: number; // Prêt pour le feedback utilisateur futur
  tokens?: number;       // Prêt pour le calcul de coût futur
  costPer1k?: number;    // Prêt pour le calcul de coût futur
}) {
  // Récupère les stats existantes ou initialise un nouvel enregistrement pour le modèle
  let stats = modelMemory[modelId] || {
    calls: 0,
    avgLatency: 0,
    successRate: 1,
    satisfaction: 1,
    costPer1k: metrics.costPer1k ?? 0.01,
    score: 1
  };

  // Met à jour les statistiques avec les nouvelles données
  stats.calls += 1;
  stats.avgLatency = (stats.avgLatency * (stats.calls - 1) + metrics.latency) / stats.calls;
  stats.successRate = (stats.successRate * (stats.calls - 1) + (metrics.success ? 1 : 0)) / stats.calls;
  stats.satisfaction = (stats.satisfaction * (stats.calls - 1) + (metrics.satisfaction ?? 1)) / stats.calls;

  // Recalcule le score adaptatif. C'est une heuristique pondérée:
  // 40% Taux de succès
  // 30% Satisfaction
  // 20% Vitesse (inverse de la latence)
  // 10% Coût (inverse du coût)
  // De petits epsilons sont ajoutés pour éviter la division par zéro.
  const latencyScore = 1000 / (stats.avgLatency + 50); // Normalise la latence
  const costScore = 1 / (stats.costPer1k + 0.01);
  
  stats.score = (stats.successRate * 0.4) +
                (stats.satisfaction * 0.3) +
                (latencyScore * 0.2) +
                (costScore * 0.1);
  
  // Sauvegarde les nouvelles statistiques dans la mémoire
  modelMemory[modelId] = stats;
}
