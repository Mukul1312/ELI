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
  /** Present for declared/onboarding/micro flows — used in FlowSelected event for session correlation.
   *  Absent for negotiated-standard: protocol1-ignition generates its own sessionId later. */
  readonly sessionId?: string;
  readonly idempotencyKey?: string;
}
