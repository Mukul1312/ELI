import { AggregateRoot } from '../shared/aggregate-root';
import { TopicLoopId, TopicLoopState, SessionLifecycleState } from './value-objects';
import { EVENT_TIMESTAMP_FIELD, isTopicLoopEventType } from './events';

export class TopicLoop extends AggregateRoot<TopicLoopId> {
  private _state: TopicLoopState;
  private _sessionLifecycle: SessionLifecycleState;

  private constructor(id: TopicLoopId, state: TopicLoopState, sessionLifecycle: SessionLifecycleState) {
    super(id);
    this._state = state;
    this._sessionLifecycle = sessionLifecycle;
  }

  static empty(id: TopicLoopId): TopicLoop {
    return new TopicLoop(id, TopicLoopState.empty(), SessionLifecycleState.empty());
  }

  static reconstitute(id: TopicLoopId, state: TopicLoopState, sessionLifecycle?: SessionLifecycleState): TopicLoop {
    return new TopicLoop(id, state, sessionLifecycle ?? SessionLifecycleState.empty());
  }

  get state(): TopicLoopState {
    return this._state;
  }

  get sessionLifecycle(): SessionLifecycleState {
    return this._sessionLifecycle;
  }

  get studentId(): string {
    return this._id.studentId;
  }

  get topicId(): string {
    return this._id.topicId;
  }

  /**
   * Apply an event to this TopicLoop. Enforces monotonicity via max semantics.
   * Unknown or no-op event types are silently ignored.
   * Counter logic (consecutiveDeferrals) runs before timestamp logic so that
   * events with null timestamp fields (RetrievalSkipped) still update the counter.
   */
  applyEvent(eventType: string, payload: Record<string, unknown>): void {
    if (!isTopicLoopEventType(eventType)) return;

    // Counter logic — runs even for null-timestamp events (RetrievalSkipped)
    switch (eventType) {
      case 'RetrievalScheduled':
      case 'RetrievalSkipped':
        this._state = this._state.withIncrementedDeferrals();
        break;
      case 'RetrievalVerified':
      case 'VerificationCompleted':
        this._state = this._state.withDeferralsReset();
        break;
    }

    // Session lifecycle logic — runs BEFORE timestampField null check so that
    // status-only events (SessionIntentIssued, ActivationPlanIssued, VerificationDecisionIssued)
    // still update the lifecycle before the early return.
    switch (eventType) {
      case 'SessionIntentIssued': {
        const sessionId = payload.sessionId as string;
        const intentSource = payload.intentSource as string;
        const vf = payload.verificationFloor as { minQuestions: number } | null | undefined;
        this._sessionLifecycle = this._sessionLifecycle.withSessionIntent(
          sessionId, intentSource, vf?.minQuestions ?? null,
        );
        break;
      }
      case 'ActivationPlanIssued': {
        const watchOnly =
          (payload.allowedFallback as any)?.enforceWatchOnlyVerification === true ||
          (payload.constraints as any)?.enforceWatchOnlyVerification === true;
        this._sessionLifecycle = this._sessionLifecycle.withActivationPlan(watchOnly);
        break;
      }
      case 'FirstActionStarted': {
        const raw = payload.startedAt;
        if (raw) {
          const ts = raw instanceof Date ? raw : new Date(String(raw));
          if (!isNaN(ts.getTime())) {
            this._sessionLifecycle = this._sessionLifecycle.withSessionStarted(ts);
          }
        }
        break;
      }
      case 'SessionEnd':
        this._sessionLifecycle = this._sessionLifecycle.withVerifyingPhase();
        break;
      case 'VerificationDecisionIssued':
        this._sessionLifecycle = this._sessionLifecycle.withVerificationDecision();
        break;
    }

    // Timestamp logic
    const timestampField = EVENT_TIMESTAMP_FIELD[eventType];
    if (timestampField === null) return;

    const raw = payload[timestampField];
    if (raw === undefined || raw === null) return;

    const timestamp = raw instanceof Date ? raw : new Date(String(raw));
    if (isNaN(timestamp.getTime())) return;

    switch (eventType) {
      case 'SessionEnd':
        this._state = this._state.withLastEffortAt(timestamp);
        break;
      case 'RetrievalVerified':
        this._state = this._state.withLastRetrievalAt(timestamp);
        break;
      case 'VerificationCompleted':
        // Only close the loop (update last_retrieval_at) when result is 'confident'.
        // 'not_confident' means the student honestly said "Not yet" — loop stays open.
        if (payload.result === 'confident') {
          this._state = this._state.withLastRetrievalAt(timestamp);
        }
        break;
      case 'RetrievalScheduled':
        this._state = this._state.withLastScheduledDueAt(timestamp);
        break;
    }
  }
}
