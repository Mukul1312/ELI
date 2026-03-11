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

/** Minimal shape we read from SessionIntentIssued payloads (flat shape, Approach B). */
interface P1Payload {
  intentSource?: string;
  verificationFloor?: { minQuestions?: number; preferVerifyNow?: boolean };
}

/**
 * Find the most recent SessionIntentIssued event from a list of queried events.
 * Returns the verification floor only for negotiated sessions (declared sessions have no floor).
 */
export function findP1VerificationFloorFromEvents(
  events: StoredEvent[]
): P1VerificationFloor | null {
  const sessionIntentEvent = events
    .filter((e) => e.eventType === 'SessionIntentIssued')
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];

  if (!sessionIntentEvent) return null;

  const payload = sessionIntentEvent.payload as P1Payload;

  // Declared sessions have no ELI-issued floor — do not apply one.
  if (payload.intentSource !== 'negotiated') return null;

  if (payload.verificationFloor) {
    return {
      minQuestions: payload.verificationFloor.minQuestions ?? 1,
      preferVerifyNow: payload.verificationFloor.preferVerifyNow ?? false,
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
