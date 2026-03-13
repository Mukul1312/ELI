/**
 * FlowExecutor — walks FlowTemplate phases, calling gate handlers in sequence.
 *
 * Per ADR-005 §Execution Model: FlowExecutor bridges "SSO decides" and "Mastra executes."
 * Per ADR-005 §C10: two fixed data-threading mappings (P1 issuedAt → P2 setAt, P2 mode → session).
 * Per ADR-005 §C8: onboarding template includes silent P2 (fixes latent projection bug).
 * Per ADR-005 §C14/C15/C16: topic resolution, display name, FirstActionStarted stay in Mastra.
 *
 * Constructor receives gate handler port interfaces — Mastra layer wires concrete implementations.
 * Gate handler ports are EI Runtime Published Language (context map: SSO consumes AC outputs).
 */

import type { FlowTemplate } from '../../domain/value-objects/flow-template';
import type { IRunDeclaredIntentUseCase } from '../../../application/run-declared-intent/port';
import type { IRunP1GateUseCase } from '../../../application/run-p1-gate/port';
import type { IRunP2GateUseCase } from '../../../application/run-p2-gate/port';
import type { SessionTaskType } from '../../../schemas/events';
import type { SleepBucket } from '../../../engine/score';
import type {
  ExecuteFlowCommand,
  FlowExecutionResult,
  IExecuteFlowUseCase,
} from './port';

export class FlowExecutor implements IExecuteFlowUseCase {
  constructor(
    private readonly declaredIntentHandler: IRunDeclaredIntentUseCase,
    private readonly p1Handler: IRunP1GateUseCase,
    private readonly p2Handler: IRunP2GateUseCase,
  ) {}

  async execute(template: FlowTemplate, command: ExecuteFlowCommand): Promise<FlowExecutionResult> {
    switch (template.id) {
      case 'declared-standard':
        return this.executeDeclaredStandard(command);
      case 'onboarding':
        return this.executeOnboarding(command);
      case 'negotiated-standard':
        return this.executeNegotiatedStandard(command);
      case 'micro':
        return this.executeMicro(command);
      default:
        throw new Error(`FlowExecutor: unknown template '${template.id}'`);
    }
  }

  /**
   * Declared-standard: silent P1 → silent P2 → session UI.
   * Per ADR-005 §C10: P1 issuedAt → P2 setAt (fixed mapping).
   */
  private async executeDeclaredStandard(cmd: ExecuteFlowCommand): Promise<FlowExecutionResult> {
    // Phase 1: Declared P1 (silent — no UI)
    const intentOutput = await this.declaredIntentHandler.execute({
      studentId: cmd.studentId,
      topicId: cmd.topicId,
      sessionId: cmd.sessionId,
      timebox: cmd.timebox ?? 30,
      taskType: (cmd.taskType ?? 'Practice') as SessionTaskType,
      energy: cmd.energy ?? 3,
      sleepBucket: (cmd.sleepBucket ?? '7-8') as SleepBucket,
    });

    // Phase 2: P2 gate (silent — no UI)
    // ADR-004: sessionRepo.findById folds the P1 event (sequential await = committed)
    const p2Output = await this.p2Handler.execute({
      studentId: cmd.studentId,
      topicId: cmd.topicId,
      sessionId: cmd.sessionId,
      setAt: intentOutput.issuedAt, // Fixed mapping: P1 issuedAt → P2 setAt
    });

    return { kind: 'declared', p2Output, intentOutput };
  }

  /**
   * Onboarding: silent P1 → silent P2 → session UI.
   * Per ADR-005 §C8: adds missing silent P2, fixes latent projection bug
   * (session_phase correctly transitions to 'active').
   */
  private async executeOnboarding(cmd: ExecuteFlowCommand): Promise<FlowExecutionResult> {
    // Phase 1: Silent P1 (declared path for onboarding)
    const intentOutput = await this.declaredIntentHandler.execute({
      studentId: cmd.studentId,
      topicId: cmd.topicId,
      sessionId: cmd.sessionId,
      timebox: cmd.timebox ?? 30,
      taskType: (cmd.taskType ?? 'Practice') as SessionTaskType,
      energy: cmd.energy ?? 3,
      sleepBucket: (cmd.sleepBucket ?? '7-8') as SleepBucket,
    });

    // Phase 2: Silent P2 (C8 FIX: emits ActivationPlanIssued → session_phase = 'active')
    const p2Output = await this.p2Handler.execute({
      studentId: cmd.studentId,
      topicId: cmd.topicId,
      sessionId: cmd.sessionId,
      setAt: intentOutput.issuedAt,
    });

    return { kind: 'onboarding', p2Output, intentOutput };
  }

  /**
   * Negotiated-standard: P1 with UI only.
   * Per canvas Q3 Option A: P2 triggered later by IntentSet (R1.2 CommandRouter).
   */
  private async executeNegotiatedStandard(cmd: ExecuteFlowCommand): Promise<FlowExecutionResult> {
    // Phase 1: P1 gate (with UI)
    const p1Output = await this.p1Handler.execute({
      studentId: cmd.studentId,
      topicId: cmd.topicId,
      sessionId: cmd.sessionId,
      energy: cmd.energy ?? 3,
      sleepBucket: cmd.sleepBucket,
    });

    return { kind: 'negotiated', p1Output };
  }

  /**
   * Micro: P2 with UI only, skips P1 entirely.
   * Per canvas Q1: micro sessions go straight to P2.
   */
  private async executeMicro(cmd: ExecuteFlowCommand): Promise<FlowExecutionResult> {
    // Phase 1 (P2): P2 gate (with UI)
    const p2Output = await this.p2Handler.execute({
      studentId: cmd.studentId,
      topicId: cmd.topicId,
      sessionId: cmd.sessionId,
      setAt: new Date().toISOString(),
      taskType: 'micro',
    });

    return { kind: 'micro', p2Output };
  }
}
