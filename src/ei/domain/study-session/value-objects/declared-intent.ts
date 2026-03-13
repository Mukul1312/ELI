/**
 * DeclaredIntent value object — student-driven P1 output.
 *
 * Created when the student declares their own study intent without ELI negotiation.
 * Data integrity invariants only (no ELI business rules).
 * Emits SessionIntentIssued with intentSource='declared'.
 *
 * Per ei-runtime-tactical-spec.md §7c (Approach B).
 */

import { DomainError } from '../../shared/errors';
import { ValueObject } from '../../shared/value-object';
import type { SleepBucket } from '../../../engine/score';
import type { SessionTaskType } from '../../../schemas/events';

interface DeclaredIntentProps {
  timebox: number;
  taskType: SessionTaskType;
  energy: number;
  sleepBucket: SleepBucket;
  verificationFloor: { minQuestions: number; preferVerifyNow: boolean } | null;
}

export interface DeclaredIntentInput {
  timebox: number;
  taskType: SessionTaskType;
  energy: number;
  sleepBucket: SleepBucket;
  verificationFloor?: { minQuestions: number; preferVerifyNow: boolean } | null;
}

export class DeclaredIntent extends ValueObject<DeclaredIntentProps> {
  private constructor(props: DeclaredIntentProps) {
    super(props);
  }

  static create(input: DeclaredIntentInput): DeclaredIntent {
    if (input.timebox <= 0) {
      throw new DomainError('timebox must be > 0');
    }
    if (input.energy < 1 || input.energy > 5) {
      throw new DomainError('energy must be 1–5');
    }
    return new DeclaredIntent({
      timebox: input.timebox,
      taskType: input.taskType,
      energy: input.energy,
      sleepBucket: input.sleepBucket,
      verificationFloor: input.verificationFloor ?? null,
    });
  }

  get timebox(): number { return this.props.timebox; }
  get taskType(): SessionTaskType { return this.props.taskType; }
  get energy(): number { return this.props.energy; }
  get sleepBucket(): SleepBucket { return this.props.sleepBucket; }
  get verificationFloor(): { minQuestions: number; preferVerifyNow: boolean } | null { return this.props.verificationFloor; }
  get mode(): null { return null; }
  get intentSource(): 'declared' { return 'declared'; }

  /**
   * Secondary factory for reconstituting from event payload (ADR-004).
   * No validation, no computation — accepts stored values as-is.
   */
  static reconstitute(props: DeclaredIntentProps): DeclaredIntent {
    return new DeclaredIntent(props);
  }

  toEventPayload(studentId: string, topicId: string): Record<string, unknown> {
    return {
      studentId,
      topicId,
      intentSource: 'declared' as const,
      timebox: this.props.timebox,
      taskType: this.props.taskType,
      energy: this.props.energy,
      sleepBucket: this.props.sleepBucket,
      issuedAt: new Date().toISOString(),
      mode: null,
      playId: null,
      verificationFloor: this.props.verificationFloor,
      constraints: null,
      stateScore: null,
      questionCount: null,
      difficultyTier: null,
      sessionIntentId: null,
    };
  }
}
