/**
 * Cross-protocol read helpers for P3 gate.
 *
 * Extracts P1 verification floor and P2 watch-only flag from stored event payloads.
 * No dependency on play-executor or engine/cross-protocol.
 * Supports both DDD-emitted payload shapes (allowedFallback) and legacy (constraints).
 */

// ============================================================================
// Types
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

// ============================================================================
// Find cross-protocol constraints in event history
// ============================================================================

/** Minimal shape we read from NegotiatedIntentIssued payloads */
interface P1Payload {
  verificationPlan?: { minQuestions?: number; preferVerifyNow?: boolean };
}

/**
 * Find the most recent NegotiatedIntentIssued event from a list of queried events.
 * Returns the verification floor if found.
 */
export function findP1VerificationFloorFromEvents(
  events: StoredEvent[]
): P1VerificationFloor | null {
  const negotiatedIntentEvent = events
    .filter((e) => e.eventType === 'NegotiatedIntentIssued')
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];

  if (!negotiatedIntentEvent) return null;

  const payload = negotiatedIntentEvent.payload as P1Payload;
  if (payload.verificationPlan) {
    return {
      minQuestions: payload.verificationPlan.minQuestions ?? 1,
      preferVerifyNow: payload.verificationPlan.preferVerifyNow ?? false,
    };
  }

  return null;
}

/** Minimal shape we read from ActivationPlanIssued payloads (DDD + legacy) */
interface P2Payload {
  allowedFallback?: { enforceWatchOnlyVerification?: boolean };
  constraints?: { enforceWatchOnlyVerification?: boolean };
}

/**
 * Find the most recent ActivationPlanIssued event from a list of queried events.
 * Returns true if watch-only verification is required (supports both
 * allowedFallback.enforceWatchOnlyVerification and constraints.enforceWatchOnlyVerification).
 */
export function findP2WatchOnlyFlagFromEvents(events: StoredEvent[]): boolean {
  const activationEvent = events
    .filter((e) => e.eventType === 'ActivationPlanIssued')
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];

  if (!activationEvent) return false;

  const payload = activationEvent.payload as P2Payload;
  return (
    payload.allowedFallback?.enforceWatchOnlyVerification === true ||
    payload.constraints?.enforceWatchOnlyVerification === true
  );
}
