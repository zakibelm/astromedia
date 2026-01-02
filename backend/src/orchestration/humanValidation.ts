// services/orchestration/humanValidation.ts
import { CampaignPlaybook, CampaignState, OrchestratorEvents } from "./types";

function unlockDependents(
  phases: any[],
  state: CampaignState,
  events?: OrchestratorEvents
) {
    function depsCompleted(phase: any, statusByPhase: Record<string, any>) {
        if (!phase.dependsOn || phase.dependsOn.length === 0) return true;
        return phase.dependsOn.every((id: string) => statusByPhase[id] === "completed");
    }
    function hasInputs(phase: any, ctx: Record<string, any>) {
        return phase.inputs.every((k: string) => ctx[k] !== undefined);
    }

  for (const ph of phases) {
    if (state.statusByPhase[ph.id] === "idle" || state.statusByPhase[ph.id] === "skipped") {
      if (depsCompleted(ph, state.statusByPhase) && hasInputs(ph, state.context)) {
        state.statusByPhase[ph.id] = "ready";
        events?.onPhaseStatus?.(ph.id, "ready");
      }
    }
  }
}

export function approvePhase(
  playbook: CampaignPlaybook,
  state: CampaignState,
  events?: OrchestratorEvents,
  phaseId?: string,
  data?: any
) {
  if (!phaseId) return;
  if (state.awaitingHumanApproval.has(phaseId)) {
    if (data) {
        Object.assign(state.context, data);
        console.log('[Orchestrator] Merged approval data into context:', data);
    }
    state.awaitingHumanApproval.delete(phaseId);
    state.statusByPhase[phaseId] = "completed";
    events?.onPhaseStatus?.(phaseId, "completed");
    unlockDependents(playbook.phases, state, events);
  }
}

export function rejectPhase(
  playbook: CampaignPlaybook,
  state: CampaignState,
  events?: OrchestratorEvents,
  phaseId?: string,
  reason?: string
) {
  if (!phaseId) return;
  if (state.awaitingHumanApproval.has(phaseId)) {
    state.awaitingHumanApproval.delete(phaseId);
    // On repasse la phase en ready (pour regénération) — ou “idle” si tu veux forcer une édition préalable.
    state.statusByPhase[phaseId] = "ready";
    events?.onPhaseStatus?.(phaseId, "ready");
    // Tu peux logguer la raison pour améliorer les prompts (feedback loop)
    console.warn("Rejet humain:", phaseId, reason);
  }
}