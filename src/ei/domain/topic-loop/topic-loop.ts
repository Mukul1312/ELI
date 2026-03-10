import { AggregateRoot } from '../shared/aggregate-root';
import { TopicLoopId, TopicLoopState } from './value-objects';
import { EVENT_TIMESTAMP_FIELD, isTopicLoopEventType } from './events';

export class TopicLoop extends AggregateRoot<TopicLoopId> {
  private _state: TopicLoopState;

  private constructor(id: TopicLoopId, state: TopicLoopState) {
    super(id);
    this._state = state;
  }

  static empty(id: TopicLoopId): TopicLoop {
    return new TopicLoop(id, TopicLoopState.empty());
  }

  static reconstitute(id: TopicLoopId, state: TopicLoopState): TopicLoop {
    return new TopicLoop(id, state);
  }

  get state(): TopicLoopState {
    return this._state;
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
      case 'VerificationCompleted':
        this._state = this._state.withLastRetrievalAt(timestamp);
        break;
      case 'RetrievalScheduled':
        this._state = this._state.withLastScheduledDueAt(timestamp);
        break;
    }
  }
}
