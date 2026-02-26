/**
 * PresentationContext — derived from domain output fields + real student aggregates.
 *
 * The ViewComposer needs this to decide which components to include
 * (deal card, welcome-back, guardrails) and which microcopy to resolve.
 *
 * Builders receive application-mapped DTOs from the calling Mastra step.
 * ZERO DB calls in this file — all data passed in from the step's execute().
 * No persistence row types — use AggregatesForPresentation and TopicStateSnapshot.
 */

import type { Mode } from '../schemas/outputs';
import type { StateTrend, TopicStateSnapshot } from '../domain/student-aggregates/student-aggregates';
import type { AggregatesForPresentation } from './types/aggregates-for-presentation';

export interface PresentationContext {
  readonly studentId: string;
  readonly topicId: string;
  readonly mode: Mode;
  readonly playId: string;
  readonly stateScore: number;
  readonly pendingChecks: number;
  readonly silenceDays: number;
  readonly isFirstOfDay: boolean;
  readonly tightnessLevel: 'Loose' | 'Normal' | 'Tight';
  readonly energy: number;
  readonly pressure: number;
  readonly closeOpenLoopFirst: boolean;
  /** Real verification rate from ei_student_aggregates (0–1). */
  readonly verificationRate7d: number;
  /** Real state trend from ei_student_aggregates. */
  readonly stateTrend7d: StateTrend;
  /** Number of SessionEnd events in the last 7 days. */
  readonly sessionsLast7d: number;
  /** Number of verification events in the last 7 days. */
  readonly loopsClosedLast7d: number;
  /** Per-topic state snapshots ordered by lastScheduledDueAt ASC (due soonest first). */
  readonly topicStates: TopicStateSnapshot[];
  /** Date of most recent IdentityMomentShown event; null if never shown. */
  readonly lastIdentityShownAt: Date | null;
  /** True if there was a 3+ day stretch with no SessionEnd in the last 14 days (resolution signal). */
  readonly hadSilenceInLast14d: boolean;
  /** True if any AppOpen in the last 14 days had pressure >= 4 (resolution signal). */
  readonly hadHighPressureInLast14d: boolean;
}

function sortedTopicSnapshots(snapshots?: TopicStateSnapshot[]): TopicStateSnapshot[] {
  return [...(snapshots ?? [])].sort(
    (a, b) => (a.lastScheduledDueAt?.getTime() ?? 0) - (b.lastScheduledDueAt?.getTime() ?? 0),
  );
}

/**
 * Build a PresentationContext from the P1 domain output and workflow input.
 * Pass real aggregates/topicRows/eventCounts loaded by the compose step.
 */
export function buildP1PresentationContext(
  domainOutput: {
    studentId: string;
    topic: string;
    mode: Mode;
    playId: string;
    stateScore: number;
    constraints?: { closeOpenLoopFirst?: boolean; noNewTopicUntil?: string };
  },
  workflowInput: {
    energy: number;
    pressure: number;
  },
  aggregates?: AggregatesForPresentation | null,
  topicSnapshots?: TopicStateSnapshot[],
  eventCounts?: { sessionsLast7d: number; loopsClosedLast7d: number },
  lastIdentityShownAt?: Date | null,
  historicalIndicators?: { hadSilenceInLast14d: boolean; hadHighPressureInLast14d: boolean },
): PresentationContext {
  const closeOpenLoopFirst = domainOutput.constraints?.closeOpenLoopFirst ?? false;
  return {
    studentId: domainOutput.studentId,
    topicId: domainOutput.topic,
    mode: domainOutput.mode,
    playId: domainOutput.playId,
    stateScore: domainOutput.stateScore,
    pendingChecks: aggregates?.pendingChecks ?? (closeOpenLoopFirst ? 3 : 0),
    silenceDays: aggregates?.silenceDays ?? 0,
    isFirstOfDay: true,
    tightnessLevel: 'Normal',
    energy: workflowInput.energy,
    pressure: workflowInput.pressure,
    closeOpenLoopFirst,
    verificationRate7d: aggregates?.verificationRate7d ?? 0,
    stateTrend7d: aggregates?.stateTrend7d ?? 'flat',
    sessionsLast7d: eventCounts?.sessionsLast7d ?? 0,
    loopsClosedLast7d: eventCounts?.loopsClosedLast7d ?? 0,
    topicStates: sortedTopicSnapshots(topicSnapshots),
    lastIdentityShownAt: lastIdentityShownAt ?? null,
    hadSilenceInLast14d: historicalIndicators?.hadSilenceInLast14d ?? false,
    hadHighPressureInLast14d: historicalIndicators?.hadHighPressureInLast14d ?? false,
  };
}

/**
 * Build minimal PresentationContext for the checkin view (before P1 runs).
 * Used when client sends AppOpen with initial: true — no domain output yet.
 * Pass real aggregates/topicRows/eventCounts loaded by the compose step.
 */
export function buildCheckinPresentationContext(
  isFirstOfDay: boolean,
  studentId = '',
  aggregates?: AggregatesForPresentation | null,
  topicSnapshots?: TopicStateSnapshot[],
  eventCounts?: { sessionsLast7d: number; loopsClosedLast7d: number },
  lastIdentityShownAt?: Date | null,
  historicalIndicators?: { hadSilenceInLast14d: boolean; hadHighPressureInLast14d: boolean },
): PresentationContext {
  return {
    studentId,
    topicId: '',
    mode: 'Neutral',
    playId: 'P1-N1',
    stateScore: 0,
    pendingChecks: aggregates?.pendingChecks ?? 0,
    silenceDays: aggregates?.silenceDays ?? 0,
    isFirstOfDay,
    tightnessLevel: 'Normal',
    energy: 3,
    pressure: 1,
    closeOpenLoopFirst: false,
    verificationRate7d: aggregates?.verificationRate7d ?? 0,
    stateTrend7d: aggregates?.stateTrend7d ?? 'flat',
    sessionsLast7d: eventCounts?.sessionsLast7d ?? 0,
    loopsClosedLast7d: eventCounts?.loopsClosedLast7d ?? 0,
    topicStates: sortedTopicSnapshots(topicSnapshots),
    lastIdentityShownAt: lastIdentityShownAt ?? null,
    hadSilenceInLast14d: historicalIndicators?.hadSilenceInLast14d ?? false,
    hadHighPressureInLast14d: historicalIndicators?.hadHighPressureInLast14d ?? false,
  };
}

/**
 * Build PresentationContext from P2 (Activation) domain output.
 * Phase 2 is the active session — topicStates/identity fields are unused here.
 */
export function buildP2PresentationContext(
  domainOutput: {
    studentId: string;
    mode: Mode;
    playId: string;
  },
  workflowInput?: { topic?: string },
): PresentationContext {
  return {
    studentId: domainOutput.studentId,
    topicId: workflowInput?.topic ?? '',
    mode: domainOutput.mode,
    playId: domainOutput.playId,
    stateScore: 0,
    pendingChecks: 0,
    silenceDays: 0,
    isFirstOfDay: true,
    tightnessLevel: 'Normal',
    energy: 3,
    pressure: 1,
    closeOpenLoopFirst: false,
    verificationRate7d: 0,
    stateTrend7d: 'flat',
    sessionsLast7d: 0,
    loopsClosedLast7d: 0,
    topicStates: [],
    lastIdentityShownAt: null,
    hadSilenceInLast14d: false,
    hadHighPressureInLast14d: false,
  };
}

/**
 * Build PresentationContext from P3 (Verification) domain output.
 * Pass real aggregates + workflowInput (energy/pressure) so Phase 3 can compute the "clearMore" CTA and footer.
 */
export function buildP3PresentationContext(
  domainOutput: {
    studentId: string;
    mode: Mode;
    playId: string;
    topic: string;
  },
  workflowInput: { energy: number; pressure: number },
  aggregates?: AggregatesForPresentation | null,
  eventCounts?: { sessionsLast7d: number; loopsClosedLast7d: number },
): PresentationContext {
  return {
    studentId: domainOutput.studentId,
    topicId: domainOutput.topic,
    mode: domainOutput.mode,
    playId: domainOutput.playId,
    stateScore: 0,
    pendingChecks: aggregates?.pendingChecks ?? 0,
    silenceDays: aggregates?.silenceDays ?? 0,
    isFirstOfDay: true,
    tightnessLevel: 'Normal',
    energy: workflowInput.energy,
    pressure: workflowInput.pressure,
    closeOpenLoopFirst: false,
    verificationRate7d: aggregates?.verificationRate7d ?? 0,
    stateTrend7d: aggregates?.stateTrend7d ?? 'flat',
    sessionsLast7d: eventCounts?.sessionsLast7d ?? 0,
    loopsClosedLast7d: eventCounts?.loopsClosedLast7d ?? 0,
    topicStates: [],
    lastIdentityShownAt: null,
    hadSilenceInLast14d: false,
    hadHighPressureInLast14d: false,
  };
}
