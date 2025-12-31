// services/demo.ts
import { defaultPlaybook } from "./orchestration/playbook";
import { runPlaybookParallel } from "./orchestration/orchestrator";
import { approvePhase, rejectPhase } from "./orchestration/humanValidation";
import { CampaignState, PhaseStatus } from "./orchestration/types";

export function demoExecution(): () => void {
  const state: CampaignState = {
    mode: "semi_auto",
    statusByPhase: {},
    triesByPhase: {},
    awaitingHumanApproval: new Set(),
    context: {
      brandProfile: "EcoVibes - casques audio écoresponsables",
      goals: "Notoriété +50% en 3 mois",
      persona: "Millennials éco-conscients",
      budget: 5000,
      timeline: "3 mois",
      briefContext: "Brief validé pour la campagne EcoVibes, axée sur l'authenticité et la durabilité.",
      // Adding a 'tone' input for the content phase
      tone: 'Inspirant et authentique',
      // Adding a 'visuals' input for the distribution phase
      visuals: 'Visuels de jeunes profitant de la nature avec les casques.',
    }
  };

  // Brancher des événements (UI)
  const events = {
    onPhaseStatus: (id: string, s: PhaseStatus) => console.log(`[STATUS] ${id} → ${s}`),
    onPhaseOutput: (id: string, o: any) => console.log(`[OUTPUT] ${id}`, o),
    onPhaseError: (id: string, e: any) => console.error(`[ERROR] ${id}`, e.message),
    onAllDone: (st: CampaignState) => console.log("[ALL PHASES DONE]", st)
  };
  
  console.log("=== Lancement de l'orchestrateur parallèle ===");

  // Lancement (en //)
  // FIX: Added the required `campaignId` property.
  runPlaybookParallel({ playbook: defaultPlaybook, state, events, concurrency: 2, campaignId: `demo_${crypto.randomUUID()}` });

  // FIX: Track timers to allow for cleanup.
  // FIX: Replaced NodeJS.Timeout with ReturnType<typeof setTimeout> for environment portability (browser/node).
  const timers: ReturnType<typeof setTimeout>[] = [];

  // Simuler de la validation humaine (ex: après 1,5s)
  timers.push(setTimeout(() => {
    console.log(">>> [ACTION HUMAINE] Approbation de 'strategy' et 'seo'");
    // Exemple: l’utilisateur valide “strategy” et “seo”
    approvePhase(defaultPlaybook, state, events, "strategy");
    approvePhase(defaultPlaybook, state, events, "seo");
  }, 1500));

  // Simuler un rejet (ex: “content” rejeté puis relancé)
  timers.push(setTimeout(() => {
     console.log(">>> [ACTION HUMAINE] Rejet de 'copy'");
    rejectPhase(defaultPlaybook, state, events, "copy", "Ton éditorial trop technique");
  }, 2500));

  // Puis l’utilisateur ré-approuve après regénération
  timers.push(setTimeout(() => {
    console.log(">>> [ACTION HUMAINE] Approbation de 'copy' (après regénération)");
    approvePhase(defaultPlaybook, state, events, "copy");
  }, 4500));

  // Final approval for content
   timers.push(setTimeout(() => {
    console.log(">>> [ACTION HUMAINE] Approbation de 'content'");
    approvePhase(defaultPlaybook, state, events, "content");
  }, 5500));

  // FIX: Return a cleanup function.
  return () => {
    timers.forEach(clearTimeout);
    console.log('[demo] All demo timers cleaned up.');
  };
}