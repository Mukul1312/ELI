/**
 * FlowSelectionContext — validated input for FlowStrategy.
 *
 * Per tactical spec §3: VO with create() factory. FlowStrategy never receives raw projection data.
 * Per ADR-005 §C6: create() throws domain errors, does not clamp.
 * Per ADR-005 §C7: carries all projection signals now; current templates ignore most of them.
 *   Future templates (verification-first, re-engagement) will use these signals.
 */

export interface FlowSelectionContextInput {
  // From AppOpen payload (canvas §Inbound: Student commands)
  readonly hasTaskType: boolean;
  readonly isOnboarding: boolean;
  readonly isMicro: boolean;
  readonly hasTopic: boolean;

  // From EI Projections (canvas §Inbound: Projection queries → R1.1)
  readonly sessionsTotal: number;
  readonly silenceDays: number;
  readonly pendingChecks: number;
  readonly openLoops: number;

  // From StudentPolicy (canvas §Inbound: Projection queries → R1.1)
  readonly cohortFlags: Record<string, boolean>;
}

export class FlowSelectionContext {
  readonly hasTaskType: boolean;
  readonly isOnboarding: boolean;
  readonly isMicro: boolean;
  readonly hasTopic: boolean;
  readonly sessionsTotal: number;
  readonly silenceDays: number;
  readonly pendingChecks: number;
  readonly openLoops: number;
  readonly cohortFlags: Record<string, boolean>;

  private constructor(input: FlowSelectionContextInput) {
    this.hasTaskType = input.hasTaskType;
    this.isOnboarding = input.isOnboarding;
    this.isMicro = input.isMicro;
    this.hasTopic = input.hasTopic;
    this.sessionsTotal = input.sessionsTotal;
    this.silenceDays = input.silenceDays;
    this.pendingChecks = input.pendingChecks;
    this.openLoops = input.openLoops;
    this.cohortFlags = { ...input.cohortFlags };
    Object.freeze(this);
  }

  /**
   * Factory with domain validation.
   * Per ADR-005 §C6: throws domain errors for invariant violations.
   */
  static create(input: FlowSelectionContextInput): FlowSelectionContext {
    // Mutual exclusion: isOnboarding and isMicro cannot both be true
    if (input.isOnboarding && input.isMicro) {
      throw new Error(
        'FlowSelectionContext invariant: isOnboarding and isMicro are mutually exclusive',
      );
    }

    // Implication: if specific flow type, must have topic
    if ((input.isOnboarding || input.isMicro || input.hasTaskType) && !input.hasTopic) {
      throw new Error(
        'FlowSelectionContext invariant: isOnboarding, isMicro, or hasTaskType requires hasTopic',
      );
    }

    // Non-negative integers for projection signals
    if (input.sessionsTotal < 0 || !Number.isInteger(input.sessionsTotal)) {
      throw new Error(
        'FlowSelectionContext invariant: sessionsTotal must be a non-negative integer',
      );
    }
    if (input.silenceDays < 0) {
      throw new Error(
        'FlowSelectionContext invariant: silenceDays must be non-negative',
      );
    }
    if (input.pendingChecks < 0 || !Number.isInteger(input.pendingChecks)) {
      throw new Error(
        'FlowSelectionContext invariant: pendingChecks must be a non-negative integer',
      );
    }
    if (input.openLoops < 0 || !Number.isInteger(input.openLoops)) {
      throw new Error(
        'FlowSelectionContext invariant: openLoops must be a non-negative integer',
      );
    }

    return new FlowSelectionContext(input);
  }
}
