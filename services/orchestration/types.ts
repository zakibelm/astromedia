// services/orchestration/types.ts
export type ValidationRule = "required" | "mode_dependent" | "optional";
export type PhaseStatus = "idle" | "ready" | "running" | "waitingValidation" | "completed" | "failed" | "skipped";
export type Mode = "guided" | "semi_auto" | "auto";

export interface Phase {
  id: string;
  titleKey: string;
  descriptionKey: string;
  agent: string;                 // "CMO" | "SEO" | ...
  inputs: string[];              // clés requises dans context
  outputs: string[];             // clés produits dans context
  dependsOn?: string[];          // phases préalables (DAG)
  group?: string;                // optionnel: regrouper des phases (ex: "production")
  validation: ValidationRule;
  timeoutMs?: number;            // exécution max
  maxRetries?: number;           // relances auto
}

export interface CampaignPlaybook {
  phases: Phase[];
}

export interface CampaignState {
  mode: Mode;
  statusByPhase: Record<string, PhaseStatus>;
  triesByPhase: Record<string, number>;
  context: Record<string, any>;               // outputs cumulés
  awaitingHumanApproval: Set<string>;         // phases en attente d’une action humaine
}

export interface OrchestratorEvents {
  onPhaseStatus?: (phaseId: string, status: PhaseStatus) => void;
  onPhaseOutput?: (phaseId: string, output: Record<string, any>) => void;
  onPhaseError?: (phaseId: string, err: Error) => void;
  onAllDone?: (state: CampaignState) => void;
}
