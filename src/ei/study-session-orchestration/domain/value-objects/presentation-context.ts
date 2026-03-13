/**
 * PresentationContext — derived from domain output fields + real student aggregates.
 *
 * The ViewComposer needs this to decide which components to include
 * (deal card, welcome-back, guardrails) and which microcopy to resolve.
 *
 * Builders receive application-mapped DTOs from the calling Mastra step.
 * ZERO DB calls in this file — all data passed in from the step's execute().
 * No persistence row types — use AggregatesForPresentation and TopicStateSnapshot.
 *
 * Per tactical spec §10 finding #2: create() factory enforces domain invariants.
 * Per ADR-005 §C6: throws domain errors, does not clamp.
 */

import type { Mode } from '../../../schemas/outputs';
import type { StateTrend, TopicStateSnapshot } from '../../../domain/student-aggregates/student-aggregates';
import type { AggregatesForPresentation } from '../types/aggregates-for-presentation';

const VALID_MODES: readonly Mode[] = ['Rescue', 'Neutral', 'Boost'];

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
  readonly highPressureDetected: boolean;
  readonly closeOpenLoopFirst: boolean;
  /** Real verification rate from ei_student_aggregates (0–1). */
  readonly verificationRate7d: number;
  /** Real state trend from ei_student_aggregates. */
  readonly stateTrend7d: StateTrend;
  /** Number of SessionEnd events in the last 7 days. */
  readonly sessionsLast7d: number;
  /** Number of verification events in the last 7 days. */
  readonly loopsClosedLast7d: number;
  /** Total SessionEnd events (all time) — drives formation-period gating. */
  readonly sessionsTotal: number;
  /** Per-topic state snapshots ordered by lastScheduledDueAt ASC (due soonest first). */
  readonly topicStates: TopicStateSnapshot[];
  /** Date of most recent IdentityMomentShown event; null if never shown. */
  readonly lastIdentityShownAt: Date | null;
  /** True if there was a 3+ day stretch with no SessionEnd in the last 14 days (resolution signal). */
  readonly hadSilenceInLast14d: boolean;
  /** True if any AppOpen in the last 14 days had highPressureDetected or legacy pressure >= 4 (resolution signal). */
  readonly hadHighPressureInLast14d: boolean;
  /** True if the user has ever opened the app before. */
  readonly hasPriorOpen: boolean;
  /** True when topic has 3+ consecutive deferrals (DropoutSignal). Triggers Shrunk Card in P3. */
  readonly dropoutSignalActive: boolean;
  /** Oldest pending topic for Dynamic Footer Seed in Phase 3 close view. */
  readonly nextPendingTopic: { topicName: string; waitingSinceDays: number } | null;
}

/**
 * Factory with domain validation for PresentationContext.
 * Per tactical spec §10 finding #2 and ADR-005 §C6.
 * Throws on invariant violations — surfaces projection bugs early.
 */
export function createPresentationContext(input: PresentationContext): PresentationContext {
  if (!VALID_MODES.includes(input.mode)) {
    throw new Error(`PresentationContext invariant: mode must be one of ${VALID_MODES.join(', ')}, got '${input.mode}'`);
  }
  if (input.pendingChecks < 0) {
    throw new Error('PresentationContext invariant: pendingChecks must be non-negative');
  }
  if (input.verificationRate7d < 0 || input.verificationRate7d > 1) {
    throw new Error('PresentationContext invariant: verificationRate7d must be in [0, 1]');
  }
  if (input.sessionsLast7d < 0) {
    throw new Error('PresentationContext invariant: sessionsLast7d must be non-negative');
  }
  if (input.sessionsTotal < 0) {
    throw new Error('PresentationContext invariant: sessionsTotal must be non-negative');
  }
  return input;
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
    /** topic or topicId — both accepted */
    topic?: string;
    topicId?: string;
    mode: Mode | null;
    playId: string | null;
    stateScore: number | null;
    constraints?: { closeOpenLoopFirst?: boolean; noNewTopicUntil?: string } | null;
  },
  workflowInput: {
    energy: number;
  },
  aggregates?: AggregatesForPresentation | null,
  topicSnapshots?: TopicStateSnapshot[],
  eventCounts?: { sessionsLast7d: number; loopsClosedLast7d: number },
  lastIdentityShownAt?: Date | null,
  historicalIndicators?: { hadSilenceInLast14d: boolean; hadHighPressureInLast14d: boolean },
  hasPriorOpen: boolean = true,
  sessionsTotal = 0,
): PresentationContext {
  const closeOpenLoopFirst = domainOutput.constraints?.closeOpenLoopFirst ?? false;
  return createPresentationContext({
    studentId: domainOutput.studentId,
    topicId: domainOutput.topicId ?? domainOutput.topic ?? '',
    mode: domainOutput.mode ?? 'Neutral',
    playId: domainOutput.playId ?? '',
    stateScore: domainOutput.stateScore ?? 3,
    pendingChecks: aggregates?.pendingChecks ?? (closeOpenLoopFirst ? 3 : 0),
    silenceDays: aggregates?.silenceDays ?? 0,
    isFirstOfDay: true,
    tightnessLevel: 'Normal',
    energy: workflowInput.energy,
    highPressureDetected: false,
    closeOpenLoopFirst,
    verificationRate7d: aggregates?.verificationRate7d ?? 0,
    stateTrend7d: aggregates?.stateTrend7d ?? 'flat',
    sessionsLast7d: eventCounts?.sessionsLast7d ?? 0,
    loopsClosedLast7d: eventCounts?.loopsClosedLast7d ?? 0,
    sessionsTotal,
    topicStates: sortedTopicSnapshots(topicSnapshots),
    lastIdentityShownAt: lastIdentityShownAt ?? null,
    hadSilenceInLast14d: historicalIndicators?.hadSilenceInLast14d ?? false,
    hadHighPressureInLast14d: historicalIndicators?.hadHighPressureInLast14d ?? false,
    hasPriorOpen,
    dropoutSignalActive: false,
    nextPendingTopic: null,
  });
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
  hasPriorOpen = true,
  sessionsTotal = 0,
): PresentationContext {
  return createPresentationContext({
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
    highPressureDetected: false,
    closeOpenLoopFirst: false,
    verificationRate7d: aggregates?.verificationRate7d ?? 0,
    stateTrend7d: aggregates?.stateTrend7d ?? 'flat',
    sessionsLast7d: eventCounts?.sessionsLast7d ?? 0,
    loopsClosedLast7d: eventCounts?.loopsClosedLast7d ?? 0,
    sessionsTotal,
    topicStates: sortedTopicSnapshots(topicSnapshots),
    lastIdentityShownAt: lastIdentityShownAt ?? null,
    hadSilenceInLast14d: historicalIndicators?.hadSilenceInLast14d ?? false,
    hadHighPressureInLast14d: historicalIndicators?.hadHighPressureInLast14d ?? false,
    hasPriorOpen,
    dropoutSignalActive: false,
    nextPendingTopic: null,
  });
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
  return createPresentationContext({
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
    highPressureDetected: false,
    closeOpenLoopFirst: false,
    verificationRate7d: 0,
    stateTrend7d: 'flat',
    sessionsLast7d: 0,
    loopsClosedLast7d: 0,
    sessionsTotal: 0,
    topicStates: [],
    lastIdentityShownAt: null,
    hadSilenceInLast14d: false,
    hadHighPressureInLast14d: false,
    hasPriorOpen: true,
    dropoutSignalActive: false,
    nextPendingTopic: null,
  });
}

/**
 * Build PresentationContext from P3 (Verification) domain output.
 * Pass real aggregates + workflowInput (energy) so Phase 3 can compute the "clearMore" CTA and footer.
 */
export function buildP3PresentationContext(
  domainOutput: {
    studentId: string;
    mode: Mode;
    playId: string;
    topic: string;
  },
  workflowInput: { energy: number },
  aggregates?: AggregatesForPresentation | null,
  eventCounts?: { sessionsLast7d: number; loopsClosedLast7d: number },
  nextPendingTopic?: { topicName: string; waitingSinceDays: number } | null,
): PresentationContext {
  return createPresentationContext({
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
    highPressureDetected: false,
    closeOpenLoopFirst: false,
    verificationRate7d: aggregates?.verificationRate7d ?? 0,
    stateTrend7d: aggregates?.stateTrend7d ?? 'flat',
    sessionsLast7d: eventCounts?.sessionsLast7d ?? 0,
    loopsClosedLast7d: eventCounts?.loopsClosedLast7d ?? 0,
    sessionsTotal: 0,
    topicStates: [],
    lastIdentityShownAt: null,
    hadSilenceInLast14d: false,
    hadHighPressureInLast14d: false,
    hasPriorOpen: true,
    dropoutSignalActive: false,
    nextPendingTopic: nextPendingTopic ?? null,
  });
}
