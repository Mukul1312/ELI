/**
 * ActivationPlan value object.
 * P2 output contract. Enforces all P2 business invariants on creation.
 * Per ei-runtime-tactical-spec.md §7d.
 */

import { DomainError } from '../../shared/errors';
import { ValueObject } from '../../shared/value-object';
import type { Mode } from '../../loop-health/loop-health-snapshot';
import type { PlaySelection } from './play-selection';
import type { P2GateContext } from './gate-context';
import type { StudentPolicyInput } from '../../loop-health/aggregates-input';

import {
  P2_RESCUE_TIMEBOX_MIN,
  P2_RESCUE_TIMEBOX_MAX,
  P2_NEUTRAL_TIMEBOX_MIN,
  P2_NEUTRAL_TIMEBOX_MAX,
  P2_BOOST_TIMEBOX_MIN,
  P2_BOOST_TIMEBOX_MAX,
  P2_REPLAN_CAP_DEFAULT,
  P2_MICRO_START_MAX_SEC,
  P2_TWO_MINUTE_RULE_MIN,
} from '../../../engine/tunables';

export type FirstActionType = 'solve_q1' | 'watch_only' | 'standard' | 'hard_first' | 'continue_last';

interface ActivationPlanProps {
  playId: string;
  mode: Mode;
  firstAction: {
    type: FirstActionType;
    timeboxMin?: number;
    timeboxSec?: number;
    description?: string;
  };
  replanCap?: number;
  constraints?: {
    noSwitchingUntil?: number;
    enforceWatchOnlyVerification?: boolean;
  };
}

export class ActivationPlan extends ValueObject<ActivationPlanProps> {
  private constructor(props: ActivationPlanProps) {
    super(props);
  }

  static create(
    play: PlaySelection,
    ctx: P2GateContext,
    policy: StudentPolicyInput
  ): ActivationPlan {
    const firstAction: ActivationPlanProps['firstAction'] = { type: 'standard' };
    const constraints: ActivationPlanProps['constraints'] = {};
    let replanCap: number | undefined;

    if (play.playId === 'P2-R1') {
      firstAction.type = 'solve_q1';
      firstAction.timeboxSec = P2_MICRO_START_MAX_SEC;
      firstAction.description = 'Solve Q1 only, then decide';
    } else if (play.playId === 'P2-R2') {
      firstAction.type = 'standard';
      firstAction.timeboxMin = P2_TWO_MINUTE_RULE_MIN;
      firstAction.description = 'Try for 2 minutes, permission to stop';
    } else if (play.playId === 'P2-R3') {
      firstAction.type = 'watch_only';
      firstAction.description = 'Watch/read only, minimum verification required at SessionEnd';
      // Invariant: watch_only MUST enforce watch-only verification constraint
      constraints.enforceWatchOnlyVerification = true;
    } else if (play.playId === 'P2-B1') {
      const timeboxMin = Math.round((P2_BOOST_TIMEBOX_MIN + P2_BOOST_TIMEBOX_MAX) / 2);
      firstAction.type = 'standard';
      firstAction.timeboxMin = timeboxMin;
      firstAction.description = 'No switching until timebox complete';
      constraints.noSwitchingUntil = timeboxMin;
    } else if (play.playId === 'P2-B2') {
      firstAction.type = 'hard_first';
      firstAction.description = 'Start with hardest 1-3 items';
    } else if (play.playId === 'P2-B3') {
      firstAction.type = 'continue_last';
      firstAction.description = 'Continue last meaningful task';
    } else {
      // Default standard firstAction by mode
      let timeboxMin: number;
      if (play.mode === 'Rescue') {
        timeboxMin = Math.round((P2_RESCUE_TIMEBOX_MIN + P2_RESCUE_TIMEBOX_MAX) / 2);
      } else if (play.mode === 'Boost') {
        timeboxMin = Math.round((P2_BOOST_TIMEBOX_MIN + P2_BOOST_TIMEBOX_MAX) / 2);
      } else {
        timeboxMin = Math.round((P2_NEUTRAL_TIMEBOX_MIN + P2_NEUTRAL_TIMEBOX_MAX) / 2);
      }
      firstAction.type = 'standard';
      firstAction.timeboxMin = timeboxMin;
    }

    // Replan cap
    if (play.playId === 'P2-N2' || ctx.p2Escalation?.enforceReplanCap) {
      replanCap = P2_REPLAN_CAP_DEFAULT;
    }

    // Invariant: if watch_only, enforceWatchOnlyVerification MUST be true
    if (firstAction.type === 'watch_only' && !constraints.enforceWatchOnlyVerification) {
      throw new DomainError('watch_only firstAction must have enforceWatchOnlyVerification = true');
    }

    // Invariant: replanCap >= 1 if set
    if (replanCap !== undefined && replanCap < 1) {
      throw new DomainError('replanCap must be >= 1');
    }

    return new ActivationPlan({
      playId: play.playId,
      mode: play.mode,
      firstAction,
      replanCap,
      constraints: Object.keys(constraints).length > 0 ? constraints : undefined,
    });
  }

  get playId(): string { return this.props.playId; }
  get mode(): Mode { return this.props.mode; }
  get firstAction(): ActivationPlanProps['firstAction'] { return this.props.firstAction; }
  get replanCap(): number | undefined { return this.props.replanCap; }
  get constraints(): ActivationPlanProps['constraints'] { return this.props.constraints; }

  isWatchOnly(): boolean { return this.props.firstAction.type === 'watch_only'; }
  enforcesWatchOnlyVerification(): boolean {
    return this.props.constraints?.enforceWatchOnlyVerification === true;
  }

  toEventPayload(studentId: string, topicId: string): Record<string, unknown> {
    return {
      studentId,
      topicId,
      playId: this.props.playId,
      mode: this.props.mode,
      firstAction: this.props.firstAction,
      replanCap: this.props.replanCap,
      constraints: this.props.constraints,
    };
  }
}
