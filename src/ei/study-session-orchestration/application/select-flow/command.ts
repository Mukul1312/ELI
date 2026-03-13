/**
 * SelectFlowCommand — input DTO for the SelectFlow use case.
 *
 * Per tactical spec §7: command shape validated at application boundary.
 * Per ADR-005 §C6: raw payload fields; FlowSelectionContext.create() validates domain invariants.
 */

export interface SelectFlowCommand {
  readonly studentId: string;
  readonly topicId?: string;
  readonly taskType?: string;
  readonly isOnboarding: boolean;
  readonly isMicro: boolean;
  readonly idempotencyKey?: string;
}
