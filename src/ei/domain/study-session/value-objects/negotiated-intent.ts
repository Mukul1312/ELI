/**
 * NegotiatedIntent value object.
 * P1 output contract. Enforces all P1 business invariants on creation.
 * Per ei-runtime-tactical-spec.md §7c.
 */

import { DomainError } from '../../shared/errors';
import { ValueObject } from '../../shared/value-object';
import type { Mode } from '../../loop-health/loop-health-snapshot';
import type { PlaySelection } from './play-selection';
import type { P1GateContext } from './gate-context';
import type { StudentPolicyInput } from '../../loop-health/aggregates-input';
import type { SleepBucket } from '../../../engine/score';
import type { SessionTaskType } from '../../../schemas/events';

import {
  P1_RESCUE_SCOPE_MIN,
  P1_RESCUE_SCOPE_MAX,
  P1_NEUTRAL_SCOPE_MIN,
  P1_NEUTRAL_SCOPE_MAX,
  P1_BOOST_SCOPE_MIN,
  P1_BOOST_SCOPE_MAX,
  P1_RESCUE_MIN_QUESTIONS,
  P1_NEUTRAL_MIN_QUESTIONS_MIN,
  P1_NEUTRAL_MIN_QUESTIONS_MAX,
  P1_BOOST_MIN_QUESTIONS,
} from '../../../engine/tunables';

export type DifficultyTier = 'easy' | 'med' | 'hard' | 'advanced';

/** Map a P1 playId to the session-level task type emitted in SessionIntentIssued. */
function deriveSessionTaskType(playId: string): SessionTaskType {
  if (playId.startsWith('P1-B')) return 'Test';
  return 'Practice';
}

interface NegotiatedIntentProps {
  playId: string;
  mode: Mode;
  scope: { timeboxMin: number; questionCount: number; difficultyTier: DifficultyTier };
  verificationPlan: { minQuestions: number; preferVerifyNow: boolean };
  constraints?: { closeOpenLoopFirst?: boolean; noNewTopicUntil?: string };
  stateScore: number;
  negotiatedIntentId?: string;
  energy: number;
  sleepBucket: SleepBucket;
}

export class NegotiatedIntent extends ValueObject<NegotiatedIntentProps> {
  private constructor(props: NegotiatedIntentProps) {
    super(props);
  }

  static create(
    play: PlaySelection,
    ctx: P1GateContext,
    policy: StudentPolicyInput,
    stateScore: number,
    negotiatedIntentId?: string,
    sleepBucket: SleepBucket = '7-8',
  ): NegotiatedIntent {
    // Compute scope range based on mode
    let scopeMin: number;
    let scopeMax: number;
    if (play.mode === 'Rescue') {
      scopeMin = P1_RESCUE_SCOPE_MIN;
      scopeMax = P1_RESCUE_SCOPE_MAX;
    } else if (play.mode === 'Boost') {
      scopeMin = P1_BOOST_SCOPE_MIN;
      scopeMax = P1_BOOST_SCOPE_MAX;
    } else {
      scopeMin = P1_NEUTRAL_SCOPE_MIN;
      scopeMax = P1_NEUTRAL_SCOPE_MAX;
    }

    // Apply policy scope multiplier
    if (policy.scopeMultiplier) {
      scopeMin = Math.round(scopeMin * policy.scopeMultiplier);
      scopeMax = Math.round(scopeMax * policy.scopeMultiplier);
    }

    const timeboxMin = Math.round((scopeMin + scopeMax) / 2);

    // Invariant: Rescue scope floor
    if (play.mode === 'Rescue' && timeboxMin > 30) {
      throw new DomainError(`Rescue mode timeboxMin must be <= 30, got ${timeboxMin}`);
    }

    const questionCount = Math.max(1, Math.round(timeboxMin / 15));

    // Determine difficulty tier
    let difficultyTier: DifficultyTier = 'med';
    if (play.mode === 'Rescue' || play.playId === 'P1-R3') {
      difficultyTier = 'easy';
    } else if (play.playId === 'P1-B1' || play.playId === 'P1-B2') {
      difficultyTier = 'hard';
    }
    if (policy.difficultyTierDelta) {
      const tiers: DifficultyTier[] = ['easy', 'med', 'hard', 'advanced'];
      const idx = Math.max(0, Math.min(3, tiers.indexOf(difficultyTier) + policy.difficultyTierDelta));
      difficultyTier = tiers[idx];
    }

    // Compute verification plan
    let minQuestions: number;
    if (play.mode === 'Rescue') {
      minQuestions = P1_RESCUE_MIN_QUESTIONS;
    } else if (play.mode === 'Boost') {
      minQuestions = P1_BOOST_MIN_QUESTIONS;
    } else {
      minQuestions = Math.round((P1_NEUTRAL_MIN_QUESTIONS_MIN + P1_NEUTRAL_MIN_QUESTIONS_MAX) / 2);
    }

    // Invariant: minQuestions >= 1
    if (minQuestions < 1) {
      throw new DomainError('verificationPlan.minQuestions must be >= 1');
    }

    const preferVerifyNow = ctx.tightnessLevel === 'Tight' || play.playId === 'P1-N2';

    // Compute constraints
    const constraints: NegotiatedIntentProps['constraints'] = {};

    // P1-R2: Close one open loop
    if (play.playId === 'P1-R2') {
      constraints.closeOpenLoopFirst = true;
      constraints.noNewTopicUntil = '1LoopClosed';
    }

    // Policy constraints
    if (policy.constraints?.closeOldestOpenLoopFirst || policy.constraints?.closeLoopsFirst) {
      constraints.closeOpenLoopFirst = true;
    }

    // Invariant: Risk override — if openLoops >= policy maxOpenLoops, force closeLoopFirst
    // Policy maxOpenLoops defaults to 3 if not set
    const maxOpenLoops = (policy as any).maxOpenLoops ?? 3;
    if (ctx.openLoops >= maxOpenLoops) {
      constraints.closeOpenLoopFirst = true;
    }

    // Invariant: scope.timeboxMin >= 10
    if (timeboxMin < 10) {
      throw new DomainError(`scope.timeboxMin must be >= 10, got ${timeboxMin}`);
    }

    return new NegotiatedIntent({
      playId: play.playId,
      mode: play.mode,
      scope: { timeboxMin, questionCount, difficultyTier },
      verificationPlan: { minQuestions, preferVerifyNow },
      constraints: Object.keys(constraints).length > 0 ? constraints : undefined,
      stateScore,
      ...(negotiatedIntentId !== undefined && { negotiatedIntentId }),
      energy: ctx.energy,
      sleepBucket,
    });
  }

  get playId(): string { return this.props.playId; }
  get mode(): Mode { return this.props.mode; }
  get scope(): { timeboxMin: number; questionCount: number; difficultyTier: DifficultyTier } { return this.props.scope; }
  get verificationPlan(): { minQuestions: number; preferVerifyNow: boolean } { return this.props.verificationPlan; }
  get constraints(): NegotiatedIntentProps['constraints'] { return this.props.constraints; }
  get stateScore(): number { return this.props.stateScore; }
  get negotiatedIntentId(): string | undefined { return this.props.negotiatedIntentId; }
  get energy(): number { return this.props.energy; }
  get sleepBucket(): SleepBucket { return this.props.sleepBucket; }
  get intentSource(): 'negotiated' { return 'negotiated'; }

  isRescueMode(): boolean { return this.props.mode === 'Rescue'; }
  requiresVerificationNow(): boolean { return this.props.verificationPlan.preferVerifyNow; }
  closeLoopFirst(): boolean { return this.props.constraints?.closeOpenLoopFirst === true; }

  toEventPayload(studentId: string, topicId: string): Record<string, unknown> {
    return {
      studentId,
      topicId,
      intentSource: 'negotiated' as const,
      timebox: this.props.scope.timeboxMin,
      taskType: deriveSessionTaskType(this.props.playId),
      energy: this.props.energy,
      sleepBucket: this.props.sleepBucket,
      issuedAt: new Date().toISOString(),
      mode: this.props.mode,
      playId: this.props.playId,
      verificationFloor: {
        minQuestions: this.props.verificationPlan.minQuestions,
        preferVerifyNow: this.props.verificationPlan.preferVerifyNow,
      },
      constraints: this.props.constraints ?? null,
      stateScore: this.props.stateScore,
      questionCount: this.props.scope.questionCount,
      difficultyTier: this.props.scope.difficultyTier,
      sessionIntentId: this.props.negotiatedIntentId ?? null,
    };
  }
}
