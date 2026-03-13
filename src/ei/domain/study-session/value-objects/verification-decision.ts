/**
 * VerificationDecision value object.
 * P3 output contract. Enforces all P3 invariants including cross-protocol ones.
 * Per ei-runtime-tactical-spec.md §7e.
 */

import { DomainError } from '../../shared/errors';
import { ValueObject } from '../../shared/value-object';
import type { Mode } from '../../loop-health/loop-health-snapshot';
import type { PlaySelection } from './play-selection';
import type { P3GateContext } from './gate-context';
import type { StudentPolicyInput } from '../../loop-health/aggregates-input';
import type { DifficultyTier } from './negotiated-intent';

import {
  P3_RESCUE_MIN_QUESTIONS,
  P3_NEUTRAL_MIN_QUESTIONS_MIN,
  P3_NEUTRAL_MIN_QUESTIONS_MAX,
  P3_BOOST_MIN_QUESTIONS,
  P3_RESCUE_TIMEBOX_MIN_SEC,
  P3_RESCUE_TIMEBOX_MAX_SEC,
  P3_NEUTRAL_TIMEBOX_MIN_SEC,
  P3_NEUTRAL_TIMEBOX_MAX_SEC,
  P3_BOOST_TIMEBOX_MIN_SEC,
  P3_BOOST_TIMEBOX_MAX_SEC,
  DEFAULT_TARGET_LATENCY_HOURS,
  SCHEDULE_GRACE_HOURS,
} from '../../../engine/tunables';

export type VerificationDecisionType = 'VerifyNow' | 'ScheduleVerify' | 'Skip';

interface VerificationDecisionProps {
  playId: string;
  mode: Mode;
  decision: VerificationDecisionType;
  verifyNow?: {
    minQuestions: number;
    timeboxSec: number;
    difficultyTier: DifficultyTier;
    format?: 'standard' | 'error_log' | 'recall' | 'mixed_set';
  };
  scheduleVerify?: {
    dueInHours: number;
    graceHours: number;
    minQuestions: number;
  };
  skipReason?: string;
}

export class VerificationDecision extends ValueObject<VerificationDecisionProps> {
  private constructor(props: VerificationDecisionProps) {
    super(props);
  }

  static create(
    play: PlaySelection,
    ctx: P3GateContext,
    policy: StudentPolicyInput
  ): VerificationDecision {
    // eslint-disable-next-line prefer-const
    let decision = 'VerifyNow' as VerificationDecisionType;
    let verifyNow: VerificationDecisionProps['verifyNow'];
    let scheduleVerify: VerificationDecisionProps['scheduleVerify'];
    let skipReason: string | undefined;

    // Determine base output from play
    if (play.playId === 'R3-01' || play.playId === 'R3-03') {
      decision = 'VerifyNow';
      verifyNow = {
        minQuestions: P3_RESCUE_MIN_QUESTIONS,
        timeboxSec: Math.round((P3_RESCUE_TIMEBOX_MIN_SEC + P3_RESCUE_TIMEBOX_MAX_SEC) / 2),
        difficultyTier: 'easy',
      };
    } else if (play.playId === 'R3-02') {
      decision = 'ScheduleVerify';
      scheduleVerify = {
        dueInHours: 24,
        graceHours: SCHEDULE_GRACE_HOURS,
        minQuestions: P3_RESCUE_MIN_QUESTIONS,
      };
    } else if (play.playId === 'N3-01') {
      decision = 'VerifyNow';
      verifyNow = {
        minQuestions: Math.round((P3_NEUTRAL_MIN_QUESTIONS_MIN + P3_NEUTRAL_MIN_QUESTIONS_MAX) / 2),
        timeboxSec: Math.round((P3_NEUTRAL_TIMEBOX_MIN_SEC + P3_NEUTRAL_TIMEBOX_MAX_SEC) / 2),
        difficultyTier: 'med',
      };
    } else if (play.playId === 'N3-02') {
      decision = 'ScheduleVerify';
      scheduleVerify = {
        dueInHours: DEFAULT_TARGET_LATENCY_HOURS,
        graceHours: SCHEDULE_GRACE_HOURS,
        minQuestions: Math.round((P3_NEUTRAL_MIN_QUESTIONS_MIN + P3_NEUTRAL_MIN_QUESTIONS_MAX) / 2),
      };
    } else if (play.playId === 'B3-01') {
      decision = 'VerifyNow';
      verifyNow = {
        minQuestions: P3_BOOST_MIN_QUESTIONS,
        timeboxSec: Math.round((P3_BOOST_TIMEBOX_MIN_SEC + P3_BOOST_TIMEBOX_MAX_SEC) / 2),
        difficultyTier: 'hard',
        format: 'mixed_set',
      };
    } else if (play.playId === 'B3-02') {
      decision = 'VerifyNow';
      verifyNow = {
        minQuestions: Math.round((3 + 8) / 2),
        timeboxSec: Math.round((P3_BOOST_TIMEBOX_MIN_SEC + P3_BOOST_TIMEBOX_MAX_SEC) / 2),
        difficultyTier: 'med',
        format: 'error_log',
      };
    } else if (play.playId === 'B3-03') {
      decision = 'VerifyNow';
      verifyNow = {
        minQuestions: Math.round((P3_NEUTRAL_MIN_QUESTIONS_MIN + P3_NEUTRAL_MIN_QUESTIONS_MAX) / 2),
        timeboxSec: Math.round((P3_NEUTRAL_TIMEBOX_MIN_SEC + P3_NEUTRAL_TIMEBOX_MAX_SEC) / 2),
        difficultyTier: 'med',
        format: 'recall',
      };
    }

    // Capture skip reason from context if relevant
    if (ctx.skipReason) {
      skipReason = ctx.skipReason;
    }

    // Cross-protocol invariant: P3 escalation preferVerifyNow
    if (ctx.p3Escalation?.preferVerifyNow && decision === 'ScheduleVerify' && scheduleVerify) {
      decision = 'VerifyNow';
      verifyNow = {
        minQuestions: scheduleVerify.minQuestions,
        timeboxSec: P3_NEUTRAL_TIMEBOX_MAX_SEC,
        difficultyTier: 'med',
      };
      scheduleVerify = undefined;
    }

    // Tightness adjustment: Tight -> reduce dueInHours for ScheduleVerify
    if (ctx.tightnessLevel === 'Tight' && decision === 'ScheduleVerify' && scheduleVerify) {
      scheduleVerify = {
        ...scheduleVerify,
        dueInHours: Math.max(24, Math.round(scheduleVerify.dueInHours * 0.75)),
      };
    }

    // Cross-protocol invariant: P2 watch-only flag overrides Skip to VerifyNow
    if (ctx.p2WatchOnlyFlag && decision === 'Skip') {
      decision = 'VerifyNow';
      verifyNow = {
        minQuestions: 1,
        timeboxSec: P3_RESCUE_TIMEBOX_MAX_SEC,
        difficultyTier: 'easy',
      };
      scheduleVerify = undefined;
    }

    // Cross-protocol invariant: P1 verification floor
    if (ctx.p1VerificationFloor && decision === 'VerifyNow' && verifyNow) {
      if (verifyNow.minQuestions < ctx.p1VerificationFloor.minQuestions) {
        verifyNow = {
          ...verifyNow,
          minQuestions: ctx.p1VerificationFloor.minQuestions,
        };
      }
    }
    // If P1 floor prefers VerifyNow but we chose ScheduleVerify
    if (
      ctx.p1VerificationFloor?.preferVerifyNow &&
      decision === 'ScheduleVerify' &&
      scheduleVerify
    ) {
      decision = 'VerifyNow';
      verifyNow = {
        minQuestions: Math.max(ctx.p1VerificationFloor.minQuestions, scheduleVerify.minQuestions),
        timeboxSec: P3_NEUTRAL_TIMEBOX_MAX_SEC,
        difficultyTier: 'med',
      };
      scheduleVerify = undefined;
    }

    // Invariant: if VerifyNow, verifyNow must be defined and minQuestions >= 1
    if (decision === 'VerifyNow') {
      if (!verifyNow) {
        throw new DomainError('VerifyNow decision requires verifyNow to be defined');
      }
      if (verifyNow.minQuestions < 1) {
        throw new DomainError('verifyNow.minQuestions must be >= 1');
      }
    }

    // Invariant: if ScheduleVerify, scheduleVerify must be defined and dueInHours >= 24
    if (decision === 'ScheduleVerify') {
      if (!scheduleVerify) {
        throw new DomainError('ScheduleVerify decision requires scheduleVerify to be defined');
      }
      if (scheduleVerify.dueInHours < 24) {
        throw new DomainError('scheduleVerify.dueInHours must be >= 24');
      }
    }

    return new VerificationDecision({
      playId: play.playId,
      mode: play.mode,
      decision,
      verifyNow,
      scheduleVerify,
      skipReason,
    });
  }

  /**
   * Secondary factory for reconstituting from event payload (ADR-004).
   * No validation, no computation — accepts stored values as-is.
   */
  static reconstitute(props: VerificationDecisionProps): VerificationDecision {
    return new VerificationDecision(props);
  }

  get playId(): string { return this.props.playId; }
  get mode(): Mode { return this.props.mode; }
  get decision(): VerificationDecisionType { return this.props.decision; }
  get verifyNow(): VerificationDecisionProps['verifyNow'] { return this.props.verifyNow; }
  get scheduleVerify(): VerificationDecisionProps['scheduleVerify'] { return this.props.scheduleVerify; }
  get skipReason(): string | undefined { return this.props.skipReason; }

  isImmediate(): boolean { return this.props.decision === 'VerifyNow'; }
  isScheduled(): boolean { return this.props.decision === 'ScheduleVerify'; }

  minimumQuestions(): number {
    if (this.props.verifyNow) return this.props.verifyNow.minQuestions;
    if (this.props.scheduleVerify) return this.props.scheduleVerify.minQuestions;
    return 0;
  }

  toEventPayload(studentId: string, topicId: string): Record<string, unknown> {
    return {
      studentId,
      topicId,
      playId: this.props.playId,
      mode: this.props.mode,
      decision: this.props.decision,
      verifyNow: this.props.verifyNow,
      scheduleVerify: this.props.scheduleVerify,
      skipReason: this.props.skipReason,
    };
  }
}
