// Campaign Orchestration Types

export type Mode = 'guided' | 'semi_auto' | 'auto';

export type PhaseStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'awaiting_approval';

export interface CampaignState {
  mode: Mode;
  statusByPhase: Record<string, PhaseStatus>;
  triesByPhase: Record<string, number>;
  awaitingHumanApproval: Set<string>;
  context: Record<string, any>;
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  agentId: string;
  dependsOn?: string[];
  requiredInputs?: string[];
  outputKey?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  phases: Phase[];
}

export interface OrchestratorEvents {
  onPhaseStatus: (phaseId: string, status: PhaseStatus) => Promise<void>;
  onPhaseOutput: (phaseId: string, output: any) => Promise<void>;
  onPhaseError: (phaseId: string, error: Error) => Promise<void>;
  onAllDone: (finalState: CampaignState) => Promise<void>;
}

export interface RunPlaybookOptions {
  playbook: Playbook;
  state: CampaignState;
  events: OrchestratorEvents;
  campaignId: string;
  concurrency?: number;
}

export interface OrchestratorResult {
  promise: Promise<CampaignState>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}
