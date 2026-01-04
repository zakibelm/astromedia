// Campaign Orchestrator - Parallel Phase Execution

import { logger } from '../utils/logger';
import {
  CampaignState,
  Phase,
  PhaseStatus,
  RunPlaybookOptions,
  OrchestratorResult,
} from './types';

class Orchestrator {
  private state: CampaignState;
  private playbook: RunPlaybookOptions['playbook'];
  private events: RunPlaybookOptions['events'];
  private campaignId: string;
  private concurrency: number;
  private isPaused = false;
  private isCancelled = false;
  private activePhases = new Set<string>();
  private resolve?: (value: CampaignState) => void;
  private reject?: (error: Error) => void;

  constructor(options: RunPlaybookOptions) {
    this.state = options.state;
    this.playbook = options.playbook;
    this.events = options.events;
    this.campaignId = options.campaignId;
    this.concurrency = options.concurrency || 3;
  }

  async run(): Promise<CampaignState> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.startExecution();
    });
  }

  private async startExecution() {
    try {
      logger.info(
        { campaignId: this.campaignId, playbook: this.playbook.id },
        'Starting campaign orchestration'
      );

      // Initialize phase statuses
      for (const phase of this.playbook.phases) {
        if (!this.state.statusByPhase[phase.id]) {
          this.state.statusByPhase[phase.id] = 'pending';
        }
      }

      // Execute phases
      await this.executePhases();

      // Check if all phases completed
      const allCompleted = this.playbook.phases.every(
        (phase) => this.state.statusByPhase[phase.id] === 'completed'
      );

      if (allCompleted && !this.isCancelled) {
        await this.events.onAllDone(this.state);
        this.resolve?.(this.state);
      } else if (!this.isCancelled) {
        const failedPhases = this.playbook.phases.filter(
          (phase) => this.state.statusByPhase[phase.id] === 'failed'
        );
        throw new Error(
          `Campaign execution incomplete. Failed phases: ${failedPhases.map((p) => p.id).join(', ')}`
        );
      }
    } catch (error) {
      logger.error(
        { campaignId: this.campaignId, err: error },
        'Campaign orchestration failed'
      );
      this.reject?.(error as Error);
    }
  }

  private async executePhases() {
    const queue: Phase[] = [...this.playbook.phases];
    const executing: Promise<void>[] = [];

    while (queue.length > 0 || executing.length > 0) {
      if (this.isCancelled) {
        break;
      }

      if (this.isPaused) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      // Find ready phases (dependencies met, not running/completed)
      const readyPhases = queue.filter((phase) => {
        const status = this.state.statusByPhase[phase.id];
        if (status === 'completed' || status === 'running' || status === 'failed') {
          return false;
        }

        // Check if dependencies are met
        if (phase.dependsOn) {
          return phase.dependsOn.every(
            (depId) => this.state.statusByPhase[depId] === 'completed'
          );
        }

        return true;
      });

      // Execute ready phases up to concurrency limit
      while (
        readyPhases.length > 0 &&
        executing.length < this.concurrency
      ) {
        const phase = readyPhases.shift()!;
        const index = queue.indexOf(phase);
        if (index > -1) {
          queue.splice(index, 1);
        }

        const promise = this.executePhase(phase).finally(() => {
          const idx = executing.indexOf(promise);
          if (idx > -1) {
            executing.splice(idx, 1);
          }
        });

        executing.push(promise);
      }

      // Wait for at least one phase to complete before checking again
      if (executing.length > 0) {
        await Promise.race(executing);
      }

      // If no phases are ready and none are executing, we're stuck
      if (readyPhases.length === 0 && executing.length === 0 && queue.length > 0) {
        logger.error(
          { campaignId: this.campaignId, remainingPhases: queue.map((p) => p.id) },
          'Deadlock detected: phases remaining but none can execute'
        );
        break;
      }
    }

    // Wait for all executing phases to complete
    await Promise.all(executing);
  }

  private async executePhase(phase: Phase): Promise<void> {
    const phaseId = phase.id;

    try {
      logger.info(
        { campaignId: this.campaignId, phaseId },
        'Starting phase execution'
      );

      this.activePhases.add(phaseId);
      this.state.statusByPhase[phaseId] = 'running';
      await this.events.onPhaseStatus(phaseId, 'running');

      // Check if required inputs are available
      if (phase.requiredInputs) {
        for (const input of phase.requiredInputs) {
          if (!this.state.context[input]) {
            throw new Error(`Required input "${input}" not available for phase ${phaseId}`);
          }
        }
      }

      // Execute phase with retry logic
      const maxRetries = phase.maxRetries || 1;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (!this.state.triesByPhase[phaseId]) {
            this.state.triesByPhase[phaseId] = 0;
          }
          this.state.triesByPhase[phaseId]++;

          // Simulate phase execution (in production, this would call the actual agent)
          const output = await this.runPhaseAgent(phase);

          // Store output in context
          if (phase.outputKey) {
            this.state.context[phase.outputKey] = output;
          }

          await this.events.onPhaseOutput(phaseId, output);

          // Phase completed successfully
          this.state.statusByPhase[phaseId] = 'completed';
          await this.events.onPhaseStatus(phaseId, 'completed');

          logger.info(
            { campaignId: this.campaignId, phaseId, attempt: attempt + 1 },
            'Phase completed successfully'
          );

          this.activePhases.delete(phaseId);
          return;
        } catch (error) {
          lastError = error as Error;
          logger.warn(
            {
              campaignId: this.campaignId,
              phaseId,
              attempt: attempt + 1,
              maxRetries,
              err: error,
            },
            'Phase execution attempt failed'
          );

          if (attempt < maxRetries - 1) {
            // Wait before retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // All retries exhausted
      throw lastError || new Error(`Phase ${phaseId} failed after ${maxRetries} attempts`);
    } catch (error) {
      logger.error(
        { campaignId: this.campaignId, phaseId, err: error },
        'Phase execution failed'
      );

      this.state.statusByPhase[phaseId] = 'failed';
      await this.events.onPhaseStatus(phaseId, 'failed');
      await this.events.onPhaseError(phaseId, error as Error);

      this.activePhases.delete(phaseId);

      // Depending on mode, we might want to continue or stop
      if (this.state.mode === 'auto') {
        // In auto mode, we might want to continue with other phases
        logger.warn(
          { campaignId: this.campaignId, phaseId },
          'Phase failed in auto mode, continuing with other phases'
        );
      } else {
        // In guided/semi_auto mode, phase failure might require human intervention
        this.state.awaitingHumanApproval.add(phaseId);
        this.state.statusByPhase[phaseId] = 'awaiting_approval';
        await this.events.onPhaseStatus(phaseId, 'awaiting_approval');
      }
    }
  }

  private async runPhaseAgent(phase: Phase): Promise<any> {
    // Simulate agent execution with timeout
    const timeout = phase.timeout || 60000;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Phase ${phase.id} timed out after ${timeout}ms`));
      }, timeout);

      // Simulate async work
      // In production, this would call the actual agent with the phase context
      const simulatedWork = async () => {
        // Simulate processing time
        await new Promise((r) => setTimeout(r, 100));

        // Return mock output
        return {
          phaseId: phase.id,
          agentId: phase.agentId,
          timestamp: new Date().toISOString(),
          result: `Phase ${phase.id} executed successfully`,
          metadata: {
            mode: this.state.mode,
            attempts: this.state.triesByPhase[phase.id] || 1,
          },
        };
      };

      simulatedWork()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  pause() {
    this.isPaused = true;
    logger.info({ campaignId: this.campaignId }, 'Campaign orchestration paused');
  }

  resume() {
    this.isPaused = false;
    logger.info({ campaignId: this.campaignId }, 'Campaign orchestration resumed');
  }

  cancel() {
    this.isCancelled = true;
    logger.info({ campaignId: this.campaignId }, 'Campaign orchestration cancelled');
    this.reject?.(new Error('Campaign orchestration cancelled'));
  }
}

export function runPlaybookParallel(
  options: RunPlaybookOptions
): OrchestratorResult {
  const orchestrator = new Orchestrator(options);

  return {
    promise: orchestrator.run(),
    pause: () => orchestrator.pause(),
    resume: () => orchestrator.resume(),
    cancel: () => orchestrator.cancel(),
  };
}
