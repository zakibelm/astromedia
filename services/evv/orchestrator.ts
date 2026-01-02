import { AgentTask, EVVContext, EVVStepResult, ValidateResult, VerifyResult } from '../../types/evv';
import { logger } from '../../utils/logger';

export interface IEVVAgent<TInput, TOutput> {
    execute(input: TInput, context: EVVContext): Promise<TOutput>;
    verify(output: TOutput, context: EVVContext): Promise<VerifyResult>;
    validate(output: TOutput, verifyResult: VerifyResult, context: EVVContext): Promise<ValidateResult>;
}

export class EVVOrchestrator {
    async runCycle<TInput, TOutput>(
        agent: IEVVAgent<TInput, TOutput>,
        task: AgentTask<TInput, TOutput>
    ): Promise<TOutput> {
        let currentOutput: TOutput | undefined;

        logger.info(`Starting EVV Cycle for Task ${task.id}`, { type: task.type });

        while (task.context.iterationCount < task.context.maxIterations) {
            task.context.iterationCount++;
            logger.debug(`Iteration ${task.context.iterationCount}/${task.context.maxIterations}`, { taskId: task.id });

            // 1. EXECUTE
            try {
                task.status = 'EXECUTING';
                currentOutput = await agent.execute(task.input, task.context);
                this.recordStep(task, 'EXECUTE', currentOutput);
            } catch (error) {
                logger.error('Execution failed', { taskId: task.id, error });
                throw error;
            }

            // 2. VERIFY
            let verifyResult: VerifyResult;
            try {
                task.status = 'VERIFYING';
                verifyResult = await agent.verify(currentOutput, task.context);
                this.recordStep(task, 'VERIFY', verifyResult);

                if (verifyResult.status === 'KO') {
                    logger.warn('Verification failed (KO)', { taskId: task.id, issues: verifyResult.issues });
                    // Add feedback to input/context for next iteration if needed
                    task.context.lastFeedback = verifyResult.feedback || 'Verification failed';
                    continue; // Loop back to execute
                }
            } catch (error) {
                logger.error('Verification error', { taskId: task.id, error });
                throw error;
            }

            // 3. VALIDATE
            let validateResult: ValidateResult;
            try {
                task.status = 'VALIDATING';
                validateResult = await agent.validate(currentOutput, verifyResult, task.context);
                this.recordStep(task, 'VALIDATE', validateResult);

                if (validateResult.status === 'ACCEPTED') {
                    task.status = 'COMPLETED';
                    logger.info(`Task ${task.id} VALIDATED successfully`, { taskId: task.id });
                    return currentOutput;
                } else if (validateResult.status === 'REJECTED') {
                    logger.warn('Validation rejected', { taskId: task.id, feedback: validateResult.feedback });
                    return Promise.reject(new Error(`Task rejected: ${validateResult.feedback}`));
                } else {
                    // NEEDS_REVISION
                    logger.info('Validation requested revision', { taskId: task.id });
                    task.context.lastFeedback = validateResult.feedback;
                    continue;
                }
            } catch (error) {
                logger.error('Validation error', { taskId: task.id, error });
                throw error;
            }
        }

        task.status = 'FAILED';
        throw new Error(`Max iterations (${task.context.maxIterations}) reached without validation.`);
    }

    private recordStep(task: AgentTask, phase: EVVStepResult['phase'], output: unknown) {
        task.context.history.push({
            phase,
            output,
            timestamp: Date.now()
        });
    }
}
