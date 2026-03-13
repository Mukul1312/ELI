/**
 * IExecuteFlowUseCase — driver port for flow execution.
 *
 * Per tactical spec §7: application layer orchestrator.
 * Per canvas: "SSO decides, Mastra executes" — FlowExecutor bridges the two.
 * Per ADR-005 §Execution Model: walks template phases, threads data between handlers.
 */

import type { FlowTemplate } from '../../domain/value-objects/flow-template';
import type { SessionIntentIssuedOutput, ActivationPlanIssuedOutput } from '../../../schemas/outputs';

export interface ExecuteFlowCommand {
  readonly studentId: string;
  readonly topicId: string;
  readonly topicName?: string;
  readonly sessionId: string;
  /** Required for declared-standard and onboarding (P1 input). */
  readonly timebox?: number;
  /** Required for declared-standard and onboarding (P1 input). */
  readonly taskType?: string;
  /** Energy level (1-5). Required for declared-standard, onboarding, and negotiated. */
  readonly energy?: number;
  readonly sleepBucket?: string;
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
}

/** Result from declared-standard or onboarding (silent P1 + silent P2). */
export interface DeclaredFlowResult {
  readonly kind: 'declared' | 'onboarding';
  readonly p2Output: ActivationPlanIssuedOutput;
  readonly intentOutput: SessionIntentIssuedOutput;
}

/** Result from negotiated-standard (P1 with UI). */
export interface NegotiatedFlowResult {
  readonly kind: 'negotiated';
  readonly p1Output: SessionIntentIssuedOutput;
}

/** Result from micro (P2 with UI). */
export interface MicroFlowResult {
  readonly kind: 'micro';
  readonly p2Output: ActivationPlanIssuedOutput;
}

export type FlowExecutionResult = DeclaredFlowResult | NegotiatedFlowResult | MicroFlowResult;

export interface IExecuteFlowUseCase {
  execute(template: FlowTemplate, command: ExecuteFlowCommand): Promise<FlowExecutionResult>;
}
