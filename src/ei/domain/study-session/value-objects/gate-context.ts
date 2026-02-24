/**
 * Gate context value objects for P1, P2, P3 gates.
 * Each validates its inputs and exposes domain predicates.
 * Per ei-runtime-tactical-spec.md §7b.
 */

import { InvalidGateContextError } from '../errors';
import type { TightnessLevel } from '../../student-policy/value-objects';
import type { StateTrend } from '../../loop-health/loop-health-snapshot';
import type { P1FailurePatterns, P2Escalation, P3Escalation } from '../../../engine/escalation';

// ============================================================================
// P1 Gate Context
// ============================================================================

export interface P1GateContextProps {
  studentId: string;
  energy: number;
  pressure: number;
  backlogPressure: number;
  sleepDebt: boolean;
  openLoops: number;
  verificationRate7d: number;
  scheduleMisses7d: number;
  silenceDays: number;
  startLatencyMedian7d: number | null;
  tightnessLevel: TightnessLevel;
  loopLatencyTrend: 'improving' | 'stable' | 'worsening';
  p1FailurePatterns?: P1FailurePatterns;
}

export class P1GateContext {
  private constructor(private readonly props: Readonly<P1GateContextProps>) {}

  static create(props: P1GateContextProps): P1GateContext {
    if (!props.studentId || props.studentId.trim().length === 0) {
      throw new InvalidGateContextError('studentId', 'must be non-empty');
    }
    if (props.energy < 1 || props.energy > 5) {
      throw new InvalidGateContextError('energy', 'must be between 1 and 5');
    }
    if (props.pressure < 1 || props.pressure > 5) {
      throw new InvalidGateContextError('pressure', 'must be between 1 and 5');
    }
    if (props.openLoops < 0) {
      throw new InvalidGateContextError('openLoops', 'must be >= 0');
    }
    if (props.verificationRate7d < 0 || props.verificationRate7d > 1) {
      throw new InvalidGateContextError('verificationRate7d', 'must be between 0 and 1');
    }
    return new P1GateContext({ ...props });
  }

  get studentId(): string { return this.props.studentId; }
  get energy(): number { return this.props.energy; }
  get pressure(): number { return this.props.pressure; }
  get backlogPressure(): number { return this.props.backlogPressure; }
  get sleepDebt(): boolean { return this.props.sleepDebt; }
  get openLoops(): number { return this.props.openLoops; }
  get verificationRate7d(): number { return this.props.verificationRate7d; }
  get scheduleMisses7d(): number { return this.props.scheduleMisses7d; }
  get silenceDays(): number { return this.props.silenceDays; }
  get startLatencyMedian7d(): number | null { return this.props.startLatencyMedian7d; }
  get tightnessLevel(): TightnessLevel { return this.props.tightnessLevel; }
  get loopLatencyTrend(): 'improving' | 'stable' | 'worsening' { return this.props.loopLatencyTrend; }
  get p1FailurePatterns(): P1FailurePatterns | undefined { return this.props.p1FailurePatterns; }

  isLowEnergy(): boolean { return this.props.energy <= 2; }
  isHighPressure(): boolean { return this.props.pressure >= 4; }
  hasOpenLoopRisk(): boolean { return this.props.openLoops >= 3; }
  hasSilenceRisk(): boolean { return this.props.silenceDays >= 3; }
  /** S2 scenario: high pressure with decent energy = revenge planning risk */
  isRevengePlanningRisk(): boolean { return this.props.pressure >= 4 && this.props.energy >= 3; }
}

// ============================================================================
// P2 Gate Context
// ============================================================================

export interface P2GateContextProps {
  studentId: string;
  topicId: string;
  replanCount: number;
  startLatencyMin: number | null;
  openLoops: number;
  verificationRate7d: number;
  stateTrend7d: StateTrend;
  tightnessLevel: TightnessLevel;
  p2Escalation?: P2Escalation;
}

export class P2GateContext {
  private constructor(private readonly props: Readonly<P2GateContextProps>) {}

  static create(props: P2GateContextProps): P2GateContext {
    if (!props.studentId || props.studentId.trim().length === 0) {
      throw new InvalidGateContextError('studentId', 'must be non-empty');
    }
    if (props.replanCount < 0) {
      throw new InvalidGateContextError('replanCount', 'must be >= 0');
    }
    if (props.verificationRate7d < 0 || props.verificationRate7d > 1) {
      throw new InvalidGateContextError('verificationRate7d', 'must be between 0 and 1');
    }
    return new P2GateContext({ ...props });
  }

  get studentId(): string { return this.props.studentId; }
  get topicId(): string { return this.props.topicId; }
  get replanCount(): number { return this.props.replanCount; }
  get startLatencyMin(): number | null { return this.props.startLatencyMin; }
  get openLoops(): number { return this.props.openLoops; }
  get verificationRate7d(): number { return this.props.verificationRate7d; }
  get stateTrend7d(): StateTrend { return this.props.stateTrend7d; }
  get tightnessLevel(): TightnessLevel { return this.props.tightnessLevel; }
  get p2Escalation(): P2Escalation | undefined { return this.props.p2Escalation; }

  isStalled(): boolean {
    return (
      (this.props.startLatencyMin !== null && this.props.startLatencyMin > 15) ||
      this.props.replanCount >= 2
    );
  }
  isFlowing(): boolean {
    return (
      this.props.startLatencyMin !== null &&
      this.props.startLatencyMin <= 3 &&
      this.props.verificationRate7d >= 0.75
    );
  }
  allowsWatchOnly(): boolean {
    return this.props.p2Escalation?.disallowWatchOnly !== true;
  }
}

// ============================================================================
// P3 Gate Context
// ============================================================================

export interface P3GateContextProps {
  studentId: string;
  topicId: string;
  hasRetrieval: boolean;
  hasSchedule: boolean;
  skipReason: string | null;
  energy: number;
  openLoops: number;
  skipCount7d: number;
  verificationRate7d: number;
  stateTrend7d: StateTrend;
  tightnessLevel: TightnessLevel;
  p3Escalation?: P3Escalation;
  /** Cross-protocol: P1 NegotiatedIntent verification plan floor */
  p1VerificationFloor: { minQuestions: number; preferVerifyNow: boolean } | null;
  /** Cross-protocol: P2 watch-only constraint flag */
  p2WatchOnlyFlag: boolean;
}

export class P3GateContext {
  private constructor(private readonly props: Readonly<P3GateContextProps>) {}

  static create(props: P3GateContextProps): P3GateContext {
    if (!props.studentId || props.studentId.trim().length === 0) {
      throw new InvalidGateContextError('studentId', 'must be non-empty');
    }
    if (props.verificationRate7d < 0 || props.verificationRate7d > 1) {
      throw new InvalidGateContextError('verificationRate7d', 'must be between 0 and 1');
    }
    return new P3GateContext({ ...props });
  }

  get studentId(): string { return this.props.studentId; }
  get topicId(): string { return this.props.topicId; }
  get hasRetrieval(): boolean { return this.props.hasRetrieval; }
  get hasSchedule(): boolean { return this.props.hasSchedule; }
  get skipReason(): string | null { return this.props.skipReason; }
  get energy(): number { return this.props.energy; }
  get openLoops(): number { return this.props.openLoops; }
  get skipCount7d(): number { return this.props.skipCount7d; }
  get verificationRate7d(): number { return this.props.verificationRate7d; }
  get stateTrend7d(): StateTrend { return this.props.stateTrend7d; }
  get tightnessLevel(): TightnessLevel { return this.props.tightnessLevel; }
  get p3Escalation(): P3Escalation | undefined { return this.props.p3Escalation; }
  get p1VerificationFloor(): { minQuestions: number; preferVerifyNow: boolean } | null { return this.props.p1VerificationFloor; }
  get p2WatchOnlyFlag(): boolean { return this.props.p2WatchOnlyFlag; }

  isAvoidant(): boolean {
    return (
      this.props.skipReason !== null ||
      (!this.props.hasRetrieval && !this.props.hasSchedule)
    );
  }
  hasConfusion(): boolean {
    return this.props.skipReason === 'confusion';
  }
}
