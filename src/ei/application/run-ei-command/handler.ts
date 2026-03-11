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
import { intentResponseWorkflow } from '../../../mastra/workflows/intent-response';

import { InvalidCommandError, InvalidTransitionError } from './errors';
import type { IRunEiCommandUseCase } from './port';
import type { RunEiCommandInput } from './command';
import type { IQueryEventsPort } from '../shared/port-query-events';
import { PhaseDeriver } from './phase-deriver';

export class RunEiCommandHandler implements IRunEiCommandUseCase {
  constructor(private readonly queryEvents?: IQueryEventsPort) {}

  async execute({ command, studentId, idempotencyKey, correlationId }: RunEiCommandInput): Promise<unknown> {
    const deriver = this.queryEvents ? new PhaseDeriver(this.queryEvents) : null;

    switch (command.commandType) {
      case 'AppOpen': {
        // eiAppOpenWorkflow handles initial:true (checkin view) vs full-payload (P1/P2) internally
        const run = await eiAppOpenWorkflow.createRun();
        return run.start({
          inputData: {
            command: { commandType: 'AppOpen', payload: command.payload },
            studentId,
            idempotencyKey,
            correlationId,
          },
        });
      }

      case 'IntentSet': {
        const { topic, topicName, setAt, taskType } = command.payload;
        if (deriver) {
          const phase = await deriver.derivePhase(studentId, topic);
          if (!phase.hasIntent) {
            throw new InvalidTransitionError('IntentSet requires a recent NegotiatedIntentIssued for this topic');
          }
        }
        const run = await protocol2ActivationWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, topicName, setAt, taskType, idempotencyKey, correlationId } });
      }

      case 'SessionEnd': {
        const { topic, topicName, taskType, endedAt } = command.payload;
        if (deriver) {
          const phase = await deriver.derivePhase(studentId, topic);
          if (!phase.hasActiveSession) {
            throw new InvalidTransitionError('SessionEnd requires an active session (ActivationPlanIssued or FirstActionStarted) for this topic');
          }
        }
        const run = await protocol3VerificationWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, topicName, taskType, endedAt, idempotencyKey, correlationId } });
      }

      case 'SessionStart': {
        const { topic, topicName, mode, taskType, timebox } = command.payload;
        if (deriver) {
          const phase = await deriver.derivePhase(studentId, topic);
          if (!phase.hasActiveSession) {
            throw new InvalidTransitionError('SessionStart requires an active session (ActivationPlanIssued or FirstActionStarted) for this topic');
          }
        }
        const run = await sessionStartWorkflow.createRun();
        return run.start({
          inputData: {
            studentId,
            topic,
            topicName,
            mode,
            taskType,
            timebox,
            idempotencyKey,
            correlationId,
          },
        });
      }

      case 'Replan': {
        const { topic, topicName, reason } = command.payload;
        const run = await replanWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, topicName, reason, idempotencyKey, correlationId } });
      }

      case 'VerificationComplete': {
        const { topic, topicName, mode, result, completedAt } = command.payload;
        const run = await verificationCompleteWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, topicName, mode, result, completedAt, idempotencyKey, correlationId } });
      }

      case 'RetrievalSchedule': {
        const { topic, topicName, mode, dueInHours, minQuestions } = command.payload;
        const run = await retrievalScheduleWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, topicName, mode, dueInHours, minQuestions, idempotencyKey, correlationId } });
      }

      case 'RetrievalSkip': {
        const { topic, topicName, mode, reason } = command.payload;
        const run = await retrievalSkipWorkflow.createRun();
        return run.start({ inputData: { studentId, topic, topicName, mode, reason, idempotencyKey, correlationId } });
      }

      case 'IntentResponse': {
        const { negotiatedIntentId, decision, respondedAt, topic, topicName, taskType, difficultyTier, setAt } = command.payload;
        const run = await intentResponseWorkflow.createRun();
        return run.start({
          inputData: {
            studentId,
            negotiatedIntentId,
            decision,
            respondedAt,
            topic,
            topicName,
            taskType,
            difficultyTier,
            setAt,
            idempotencyKey,
            correlationId,
          },
        });
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
