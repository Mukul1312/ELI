/**
 * RunEiCommandHandler — orchestrates all EI command routing.
 *
 * Consolidates routing logic from route.ts and ei-app-open workflow.
 * Each command type is dispatched to the correct Mastra workflow.
 *
 * Per ei-runtime-tactical-spec.md: route is a driver adapter; this is the application service.
 */

import { eiAppOpenWorkflow } from '../../../mastra/workflows/ei-app-open';
import { protocol2ActivationWorkflow } from '../../../mastra/workflows/protocol2-activation';
import { protocol3VerificationWorkflow } from '../../../mastra/workflows/protocol3-verification';
import { sessionStartWorkflow } from '../../../mastra/workflows/session-start';
import { replanWorkflow } from '../../../mastra/workflows/replan';
import { verificationCompleteWorkflow } from '../../../mastra/workflows/verification-complete';
import { retrievalScheduleWorkflow } from '../../../mastra/workflows/retrieval-schedule';
import { retrievalSkipWorkflow } from '../../../mastra/workflows/retrieval-skip';

import { InvalidCommandError } from './errors';
import type { IRunEiCommandUseCase } from './port';
import type { RunEiCommandInput } from './command';

export class RunEiCommandHandler implements IRunEiCommandUseCase {
  async execute({ command, studentId, idempotencyKey }: RunEiCommandInput): Promise<unknown> {
    switch (command.commandType) {
      case 'AppOpen': {
        // eiAppOpenWorkflow handles initial:true (checkin view) vs full-payload (P1/P2) internally
        const run = await eiAppOpenWorkflow.createRun();
        return run.start({
          inputData: {
            command: { commandType: 'AppOpen', payload: command.payload },
            studentId,
            idempotencyKey,
          },
        });
      }

      case 'IntentSet': {
        const { topic, setAt, taskType } = command.payload;
        const run = await protocol2ActivationWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, setAt, taskType, idempotencyKey } });
      }

      case 'SessionEnd': {
        const { topic, endedAt } = command.payload;
        const run = await protocol3VerificationWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, endedAt, idempotencyKey } });
      }

      case 'SessionStart': {
        const { topic, mode } = command.payload;
        const run = await sessionStartWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, mode, idempotencyKey } });
      }

      case 'Replan': {
        const { topic, reason } = command.payload;
        const run = await replanWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, reason, idempotencyKey } });
      }

      case 'VerificationComplete': {
        const { topic, mode, questionsAttempted, correct, completedAt } = command.payload;
        const run = await verificationCompleteWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, mode, questionsAttempted, correct, completedAt, idempotencyKey } });
      }

      case 'RetrievalSchedule': {
        const { topic, mode, dueInHours, minQuestions } = command.payload;
        const run = await retrievalScheduleWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, mode, dueInHours, minQuestions, idempotencyKey } });
      }

      case 'RetrievalSkip': {
        const { topic, mode, reason } = command.payload;
        const run = await retrievalSkipWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, mode, reason, idempotencyKey } });
      }

      default: {
        const exhaustiveCheck: never = command;
        throw new InvalidCommandError(
          `Unknown commandType: ${(exhaustiveCheck as { commandType: string }).commandType}`,
        );
      }
    }
  }
}
