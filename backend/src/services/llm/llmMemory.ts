// services/llmMemory.ts

/**
 * Représente les statistiques de performance accumulées pour un seul modèle.
 * Ces données sont mises à jour en continu par le service de feedback.
 */
export interface ModelStats {
  calls: number;         // Nombre total d'appels
  avgLatency: number;    // Latence moyenne en millisecondes
  successRate: number;   // Taux de succès (0.0 à 1.0)
  satisfaction: number;  // Score de satisfaction (non utilisé actuellement, mais prêt pour le futur)
  costPer1k: number;     // Coût mesuré (non utilisé actuellement)
  score: number;         // Score de performance adaptatif global
}

/**
 * Registre en mémoire contenant les statistiques pour chaque modèle identifié par son ID.
 * Dans une application de production, cela serait stocké dans une base de données ou un cache comme Redis.
 */
export const modelMemory: Record<string, ModelStats> = {};
