// services/orchestration/orchestrator.ts
import { CampaignPlaybook, CampaignState, Phase, PhaseStatus, OrchestratorEvents, Mode } from "./types";
import { runAgent } from "../agentRunner"; // ton runner existant
import { z } from "zod"; // si tu valides la sortie par phase (optionnel)
// FIX: Imported defaultPlaybook to resolve the "Cannot find name 'defaultPlaybook'" error.
import { defaultPlaybook } from "./playbook";

// --- Observability Logger (Phase 2) ---

export type PhaseEvent = {
  phaseId: string;
  status: PhaseStatus;
  latency?: number;
  error?: string;
  timestamp: number;
  payload?: any; // NEW: To store agent outputs
};

export interface CampaignMetrics {
  totalPhases: number;
  completed: number;
  failed: number;
  avgLatency: number;
  totalDuration: number;
}


class CampaignLogger {
  private static instance: CampaignLogger;
  private logs: Map<string, PhaseEvent[]> = new Map();
  private readonly MAX_CAMPAIGNS = 50; // Limite pour éviter les fuites de mémoire

  private constructor() { }

  public static getInstance(): CampaignLogger {
    if (!CampaignLogger.instance) {
      CampaignLogger.instance = new CampaignLogger();
    }
    return CampaignLogger.instance;
  }

  public logPhase(campaignId: string, event: Omit<PhaseEvent, 'timestamp'>) {
    const logEntry: PhaseEvent = { ...event, timestamp: Date.now() };

    if (!this.logs.has(campaignId)) {
      if (this.logs.size >= this.MAX_CAMPAIGNS) {
        const oldestKey = this.logs.keys().next().value;
        this.logs.delete(oldestKey);
        console.warn(`[Logger] Removed logs for campaign ${oldestKey} (memory limit reached)`);
      }
      this.logs.set(campaignId, []);
    }
    this.logs.get(campaignId)?.push(logEntry);

    if (import.meta.env.DEV) {
      console.log(`[Logger][${campaignId}] Phase: ${logEntry.phaseId}, Status: ${logEntry.status}${logEntry.latency ? `, Latency: ${logEntry.latency.toFixed(0)}ms` : ''}`);
      if (logEntry.error) {
        console.error(`[Logger][${campaignId}] Error in ${logEntry.phaseId}:`, logEntry.error);
      }
    }
  }

  public getCampaignTimeline(campaignId: string): PhaseEvent[] {
    return this.logs.get(campaignId) || [];
  }

  public getCampaignMetrics(campaignId: string): CampaignMetrics {
    const timeline = this.getCampaignTimeline(campaignId);
    if (timeline.length === 0) {
      return { totalPhases: 0, completed: 0, failed: 0, avgLatency: 0, totalDuration: 0 };
    }

    const completedEvents = timeline.filter(e => e.status === 'completed' && e.latency);
    const totalLatency = completedEvents.reduce((sum, e) => sum + (e.latency || 0), 0);
    const failedPhases = new Set(timeline.filter(e => e.status === 'failed').map(e => e.phaseId)).size;
    const completedPhases = new Set(completedEvents.map(e => e.phaseId)).size;

    const playbookPhases = new Set(defaultPlaybook.phases.map(p => p.id)).size - 1; // Exclude briefing

    return {
      totalPhases: playbookPhases,
      completed: completedPhases,
      failed: failedPhases,
      avgLatency: totalLatency / (completedEvents.length || 1),
      totalDuration: timeline.length > 1 ? timeline[timeline.length - 1].timestamp - timeline[0].timestamp : 0
    };
  }
}

export const getCampaignLogger = () => CampaignLogger.getInstance();


// --- Orchestrator Logic ---

/**
 * Simple async mutex implementation to prevent race conditions
 */
class AsyncMutex {
  private locked: boolean = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }

  async runExclusive<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

const unlockMutex = new AsyncMutex();

function hasInputs(phase: Phase, ctx: Record<string, any>) {
  const result = phase.inputs.every((k) => ctx[k] !== undefined);

  if (!result) {
    const missing = phase.inputs.filter(k => ctx[k] === undefined);
    console.log(`[Orchestrator] Phase "${phase.id}" missing inputs:`, missing.join(', '));
  }

  return result;
}

function depsCompleted(phase: Phase, statusByPhase: Record<string, PhaseStatus>) {
  if (!phase.dependsOn || phase.dependsOn.length === 0) return true;
  const result = phase.dependsOn.every((id) => statusByPhase[id] === "completed");

  if (!result) {
    console.log(`[Orchestrator] Phase "${phase.id}" waiting for dependencies:`,
      phase.dependsOn.map(dep => `${dep}: ${statusByPhase[dep] || 'undefined'}`).join(', '));
  }

  return result;
}

function needsHumanValidation(phase: Phase, mode: Mode): boolean {
  if (phase.validation === "required" && phase.agent !== 'Human') return true;
  if (phase.validation === "optional") return false;
  return mode !== "auto";
}

async function withTimeout<T>(p: Promise<T>, ms = 60000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

export interface RunParallelOptions {
  playbook: CampaignPlaybook;
  state: CampaignState;
  events?: OrchestratorEvents;
  concurrency?: number;
  validators?: Record<string, z.ZodTypeAny>;
  campaignId: string;
}

function unlockDependents(
  phases: Phase[],
  state: CampaignState,
  events?: OrchestratorEvents
) {
  for (const ph of phases) {
    if (state.statusByPhase[ph.id] === "idle" || state.statusByPhase[ph.id] === "skipped") {
      if (depsCompleted(ph, state.statusByPhase) && hasInputs(ph, state.context)) {
        state.statusByPhase[ph.id] = "ready";
        events?.onPhaseStatus?.(ph.id, "ready");
      }
    }
  }
}

async function safeUnlockDependents(
  phases: Phase[],
  state: CampaignState,
  events?: OrchestratorEvents
): Promise<void> {
  await unlockMutex.runExclusive(() => {
    unlockDependents(phases, state, events);
  });
}

export function runPlaybookParallel({
  playbook,
  state,
  events,
  concurrency = 3,
  validators = {},
  campaignId,
}: RunParallelOptions) {
  const logger = getCampaignLogger();
  const { phases } = playbook;
  let shouldStop = false;

  const run = async () => {
    const briefingPhase = phases.find(p => p.id === 'briefing');
    if (briefingPhase && state.statusByPhase['briefing'] !== 'completed') {
      state.statusByPhase['briefing'] = 'completed';
      events?.onPhaseStatus?.('briefing', 'completed');
      logger.logPhase(campaignId, { phaseId: 'briefing', status: 'completed' });
    }

    for (const ph of phases) {
      if (state.statusByPhase[ph.id] == null) state.statusByPhase[ph.id] = "idle";
      if (depsCompleted(ph, state.statusByPhase) && hasInputs(ph, state.context) && state.statusByPhase[ph.id] === 'idle') {
        state.statusByPhase[ph.id] = "ready";
        events?.onPhaseStatus?.(ph.id, "ready");
      }
    }

    let loopCount = 0;
    while (!shouldStop) {
      const runningCount = phases.filter(p => state.statusByPhase[p.id] === 'running').length;

      // Log périodique de l'état du workflow
      if (loopCount % 10 === 0) {
        const statusSummary = phases.map(p => `${p.id}: ${state.statusByPhase[p.id] || 'undefined'}`).join(', ');
        console.log(`[Orchestrator] Workflow status check #${loopCount}: ${statusSummary}`);
      }
      loopCount++;

      const nextBatch = phases
        .filter((p) => state.statusByPhase[p.id] === "ready")
        .slice(0, concurrency - runningCount);

      if (nextBatch.length === 0) {
        const waiting = Object.values(state.statusByPhase).some(s => s === "running" || s === "waitingValidation" || s === "ready");
        if (!waiting && state.awaitingHumanApproval.size === 0) {
          events?.onAllDone?.(state);
          return; // End of the loop
        }
        await new Promise((r) => setTimeout(r, 150));
        continue;
      }

      await Promise.allSettled(nextBatch.map(async (phase) => {
        if (shouldStop) return;

        state.statusByPhase[phase.id] = "running";
        events?.onPhaseStatus?.(phase.id, "running");
        logger.logPhase(campaignId, { phaseId: phase.id, status: 'running' });
        const startTime = Date.now();

        const tries = (state.triesByPhase[phase.id] ?? 0) + 1;
        state.triesByPhase[phase.id] = tries;

        try {
          if (phase.agent === "Human") return;

          const output = await withTimeout(
            runAgent(phase.agent, { context: state.context, mode: state.mode }),
            phase.timeoutMs ?? 60000
          );

          const validator = validators[phase.id];
          if (validator) {
            const parsed = validator.safeParse(output);
            if (!parsed.success) {
              throw new Error(`Zod validation failed: ${JSON.stringify(parsed.error.issues)}`);
            }
          }

          // FIX: Handle cases where an agent produces a single output document.
          // This allows an agent (like MarketAnalyst) to return a JSON object with its own structure
          // (e.g., { slides: [...] }) and have it correctly assigned to the single output key
          // defined in the playbook (e.g., "marketAnalysisReport").
          if (phase.outputs.length === 1) {
            const outputKey = phase.outputs[0];
            // The agent's direct output is assigned to the context under the expected key.
            state.context[outputKey] = output;
          } else {
            // Original logic for multi-output phases
            for (const key of phase.outputs) {
              if (output[key] !== undefined) {
                state.context[key] = output[key];
              }
            }
          }
          events?.onPhaseOutput?.(phase.id, output);

          // Nettoyer le payload pour éviter les erreurs de rendu
          let cleanPayload;
          try {
            // Vérifier si l'output est sérialisable
            JSON.stringify(output);
            cleanPayload = output;
          } catch (error) {
            console.error(`[Orchestrator] Non-serializable output for phase ${phase.id}, using fallback`);
            cleanPayload = {
              error: "Non-serializable output",
              type: typeof output,
              phase: phase.id
            };
          }

          console.log(`[Orchestrator] Context keys after ${phase.id}:`, Object.keys(state.context));

          if (needsHumanValidation(phase, state.mode)) {
            state.statusByPhase[phase.id] = "waitingValidation";
            state.awaitingHumanApproval.add(phase.id);
            events?.onPhaseStatus?.(phase.id, "waitingValidation");
            logger.logPhase(campaignId, { phaseId: phase.id, status: 'waitingValidation', latency: Date.now() - startTime, payload: cleanPayload });
          } else {
            state.statusByPhase[phase.id] = "completed";
            events?.onPhaseStatus?.(phase.id, "completed");
            logger.logPhase(campaignId, { phaseId: phase.id, status: 'completed', latency: Date.now() - startTime, payload: cleanPayload });
            await safeUnlockDependents(phases, state, events);
          }
        } catch (err: any) {
          logger.logPhase(campaignId, { phaseId: phase.id, status: 'failed', latency: Date.now() - startTime, error: err.message });
          const canRetry = (phase.maxRetries ?? 0) >= (state.triesByPhase[phase.id]);
          if (canRetry) {
            state.statusByPhase[phase.id] = "ready";
            events?.onPhaseError?.(phase.id, err);
            events?.onPhaseStatus?.(phase.id, "ready");
          } else {
            state.statusByPhase[phase.id] = "failed";
            events?.onPhaseError?.(phase.id, err);
            events?.onPhaseStatus?.(phase.id, 'failed');
          }
        }
      }));
    }
  };

  const promise = run();

  return {
    state,
    promise,
    stop: () => {
      console.log('[Orchestrator] Stop signal received.');
      shouldStop = true;
    },
  };
}