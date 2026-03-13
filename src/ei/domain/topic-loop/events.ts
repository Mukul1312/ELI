export const TOPIC_LOOP_EVENT_TYPES = [
  'SessionEnd',
  'RetrievalVerified',
  'RetrievalScheduled',
  'RetrievalSkipped',
  'VerificationCompleted',
  'ScheduleMissed',
  // Session lifecycle events (ADR-003) — consumed by SessionLifecycleState
  'SessionIntentIssued',
  'ActivationPlanIssued',
  'FirstActionStarted',
  'VerificationDecisionIssued',
] as const;

export type TopicLoopEventType = (typeof TOPIC_LOOP_EVENT_TYPES)[number];

export function isTopicLoopEventType(value: string): value is TopicLoopEventType {
  return (TOPIC_LOOP_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Maps event types to the payload field that carries the relevant timestamp.
 * Used by the domain to extract the correct date from a generic payload.
 */
export const EVENT_TIMESTAMP_FIELD: Record<string, string | null> = {
  SessionEnd: 'endedAt',
  RetrievalVerified: 'verifiedAt',
  RetrievalScheduled: 'dueAt',
  RetrievalSkipped: null,
  VerificationCompleted: 'completedAt',
  ScheduleMissed: null,
  // Session lifecycle events (ADR-003) — null = status-only (no timestamp update)
  SessionIntentIssued: null,
  ActivationPlanIssued: null,
  FirstActionStarted: 'startedAt',
  VerificationDecisionIssued: null,
};
