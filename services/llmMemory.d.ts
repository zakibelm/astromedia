/**
 * Représente les statistiques de performance accumulées pour un seul modèle.
 * Ces données sont mises à jour en continu par le service de feedback.
 */
export interface ModelStats {
    calls: number;
    avgLatency: number;
    successRate: number;
    satisfaction: number;
    costPer1k: number;
    score: number;
}
/**
 * Registre en mémoire contenant les statistiques pour chaque modèle identifié par son ID.
 * Dans une application de production, cela serait stocké dans une base de données ou un cache comme Redis.
 */
export declare const modelMemory: Record<string, ModelStats>;
//# sourceMappingURL=llmMemory.d.ts.map