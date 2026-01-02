export type EVVStatus = 'PENDING' | 'EXECUTING' | 'VERIFYING' | 'VALIDATING' | 'COMPLETED' | 'FAILED';
export type VerificationStatus = 'OK' | 'KO';
export type ValidationStatus = 'ACCEPTED' | 'REJECTED' | 'NEEDS_REVISION';

export interface EVVContext {
    campaignId?: string;
    agentId?: string;
    iterationCount: number;
    maxIterations: number;
    history: EVVStepResult[];
    [key: string]: unknown;
}

export interface EVVStepResult {
    phase: 'EXECUTE' | 'VERIFY' | 'VALIDATE';
    output: unknown;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

export interface VerifyResult {
    status: VerificationStatus;
    issues?: string[];
    score?: number;
    feedback?: string;
}

export interface ValidateResult {
    status: ValidationStatus;
    feedback?: string;
    nextAction?: 'FINALIZE' | 'RETRY_EXECUTE' | 'RETRY_VERIFY';
}

export interface AgentTask<TInput = unknown, TOutput = unknown> {
    id: string;
    type: string;
    input: TInput;
    status: EVVStatus;
    result?: TOutput;
    context: EVVContext;
    createdAt: string;
    updatedAt: string;
}
