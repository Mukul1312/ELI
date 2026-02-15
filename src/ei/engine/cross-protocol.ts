/**
 * Cross-protocol constraint helpers.
 *
 * These constraints span multiple protocol firings and are passed through
 * event payloads or persisted in ei_student_policy.
 *
 * Source: EI_Engine_Taxonomy.md section 5 (output contracts) and the
 * cross-protocol constraints table in the implementation plan.
 *
 * | Constraint              | Set by | Read by | Mechanism                                       |
 * |-------------------------|--------|---------|--------------------------------------------------|
 * | P1 verificationPlan     | P1     | P3      | Stored in NegotiatedIntentIssued; P3 floor       |
 * | P2-R3 watch-only flag   | P2     | P3      | Stored in ActivationPlanIssued payload           |
 * | SA dials                | SA     | P1,P2,P3| Persisted in ei_student_policy                   |
 * | SA constraints          | SA     | P1      | Persisted in ei_student_policy constraints       |
 * | Tightness level         | SA     | P1,P2,P3| Persisted in ei_student_policy tightness_level   |
 */

import type { NegotiatedIntentIssued, ActivationPlanIssued } from './play-executor';

// ============================================================================
// Types for cross-protocol constraint flags
// ============================================================================

/**
 * The verification floor that P1 sets for the session.
 * P3 reads this and MUST NOT issue a decision below this floor.
 */
export interface P1VerificationFloor {
  minQuestions: number;
  preferVerifyNow: boolean;
}

/**
 * The watch-only flag that P2-R3 sets.
 * When true, P3 MUST enforce minimum verification even though
 * the student only watched/read during the session.
 */
export interface P2WatchOnlyConstraint {
  enforceMinVerification: boolean;
}

// ============================================================================
// Extract constraints from protocol output events
// ============================================================================

/**
 * Extract the P1 verification floor from a NegotiatedIntentIssued event.
 * P3 uses this as the minimum verification plan for the session.
 */
export function extractP1VerificationFloor(
  negotiatedIntent: NegotiatedIntentIssued
): P1VerificationFloor {
  return {
    minQuestions: negotiatedIntent.verificationPlan.minQuestions,
    preferVerifyNow: negotiatedIntent.verificationPlan.preferVerifyNow,
  };
}

/**
 * Extract the P2 watch-only constraint from an ActivationPlanIssued event.
 * Returns null if no watch-only constraint was set.
 */
export function extractP2WatchOnlyFlag(
  activationPlan: ActivationPlanIssued
): P2WatchOnlyConstraint | null {
  if (activationPlan.constraints?.enforceWatchOnlyVerification) {
    return { enforceMinVerification: true };
  }
  return null;
}

/**
 * Check if the P2 activation plan used watch-only mode (P2-R3).
 */
export function isWatchOnlySession(activationPlan: ActivationPlanIssued): boolean {
  return activationPlan.firstAction.type === 'watch_only';
}

// ============================================================================
// Find cross-protocol events in event history
// ============================================================================

/**
 * Payload shape stored in ei_events for protocol output events.
 * The raw event row has `payload: JSONB`; these helpers know how to read it.
 */
export interface StoredEvent {
  id: string;
  eventType: string;
  topicId?: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

/**
 * Find the most recent NegotiatedIntentIssued event for a student
 * from a list of queried events. Returns the verification floor if found.
 */
export function findP1VerificationFloorFromEvents(
  events: StoredEvent[]
): P1VerificationFloor | null {
  const negotiatedIntentEvent = events
    .filter((e) => e.eventType === 'NegotiatedIntentIssued')
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];

  if (!negotiatedIntentEvent) return null;

  const payload = negotiatedIntentEvent.payload as Partial<NegotiatedIntentIssued>;
  if (payload.verificationPlan) {
    return {
      minQuestions: payload.verificationPlan.minQuestions ?? 1,
      preferVerifyNow: payload.verificationPlan.preferVerifyNow ?? false,
    };
  }

  return null;
}

/**
 * Find the most recent ActivationPlanIssued event for a student
 * from a list of queried events. Returns the watch-only flag if found.
 */
export function findP2WatchOnlyFlagFromEvents(
  events: StoredEvent[]
): boolean {
  const activationEvent = events
    .filter((e) => e.eventType === 'ActivationPlanIssued')
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];

  if (!activationEvent) return false;

  const payload = activationEvent.payload as Partial<ActivationPlanIssued>;
  return payload.constraints?.enforceWatchOnlyVerification === true;
}

// ============================================================================
// SA policy constraint helpers
// ============================================================================

/**
 * SA dials that are persisted in ei_student_policy.dials JSONB column.
 * Every protocol reads these via getPolicy tool.
 */
export interface PersistedSADials {
  scopeMultiplier?: number;
  difficultyTierDelta?: number;
  minQuestionsDefault?: number;
  scheduleAllowed?: boolean;
  dueInHoursDefault?: number;
}

/**
 * SA constraints that are persisted in ei_student_policy.constraints JSONB column.
 * P1 reads these to enforce loop-closure constraints.
 */
export interface PersistedSAConstraints {
  closeLoopsFirst?: boolean;
  noNewTopicUntil?: string; // e.g., "1LoopClosed"
  closeOldestOpenLoopFirst?: boolean;
  maxOpenLoops?: number;
  forceQualityVerification?: boolean;
}

/**
 * Check if SA policy requires closing loops before new topics.
 */
export function requiresCloseLoopsFirst(constraints?: PersistedSAConstraints): boolean {
  return constraints?.closeLoopsFirst === true;
}

/**
 * Check if SA policy forces quality-format verification (error_log/recall).
 */
export function requiresQualityVerification(constraints?: PersistedSAConstraints): boolean {
  return constraints?.forceQualityVerification === true;
}

/**
 * Check if scheduling is allowed by SA policy.
 */
export function isSchedulingAllowed(dials?: PersistedSADials): boolean {
  return dials?.scheduleAllowed !== false; // default true
}
