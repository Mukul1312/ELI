import { ValueObject } from '../shared/value-object';
import { MissingStudentIdError, MissingTopicIdError } from './errors';

interface TopicLoopIdProps {
  studentId: string;
  topicId: string;
}

export class TopicLoopId extends ValueObject<TopicLoopIdProps> {
  private constructor(props: TopicLoopIdProps) {
    super(props);
  }

  static create(studentId: string, topicId: string): TopicLoopId {
    if (!studentId || typeof studentId !== 'string' || studentId.trim().length === 0) {
      throw new MissingStudentIdError();
    }
    if (!topicId || typeof topicId !== 'string' || topicId.trim().length === 0) {
      throw new MissingTopicIdError();
    }
    return new TopicLoopId({ studentId: studentId.trim(), topicId: topicId.trim() });
  }

  get studentId(): string {
    return this.props.studentId;
  }

  get topicId(): string {
    return this.props.topicId;
  }
}

interface TopicLoopStateProps {
  lastEffortAt: Date | null;
  lastRetrievalAt: Date | null;
  lastScheduledDueAt: Date | null;
  consecutiveDeferrals: number;
}

export class TopicLoopState extends ValueObject<TopicLoopStateProps> {
  private constructor(props: TopicLoopStateProps) {
    super(props);
  }

  static empty(): TopicLoopState {
    return new TopicLoopState({
      lastEffortAt: null,
      lastRetrievalAt: null,
      lastScheduledDueAt: null,
      consecutiveDeferrals: 0,
    });
  }

  static create(props: TopicLoopStateProps): TopicLoopState {
    return new TopicLoopState(props);
  }

  get lastEffortAt(): Date | null {
    return this.props.lastEffortAt;
  }

  get lastRetrievalAt(): Date | null {
    return this.props.lastRetrievalAt;
  }

  get lastScheduledDueAt(): Date | null {
    return this.props.lastScheduledDueAt;
  }

  get consecutiveDeferrals(): number {
    return this.props.consecutiveDeferrals;
  }

  withIncrementedDeferrals(): TopicLoopState {
    return new TopicLoopState({ ...this.props, consecutiveDeferrals: this.props.consecutiveDeferrals + 1 });
  }

  withDeferralsReset(): TopicLoopState {
    return new TopicLoopState({ ...this.props, consecutiveDeferrals: 0 });
  }

  withLastEffortAt(date: Date): TopicLoopState {
    const current = this.props.lastEffortAt;
    const next = current === null || date.getTime() > current.getTime() ? date : current;
    return new TopicLoopState({ ...this.props, lastEffortAt: next });
  }

  withLastRetrievalAt(date: Date): TopicLoopState {
    const current = this.props.lastRetrievalAt;
    const next = current === null || date.getTime() > current.getTime() ? date : current;
    return new TopicLoopState({ ...this.props, lastRetrievalAt: next });
  }

  withLastScheduledDueAt(date: Date): TopicLoopState {
    const current = this.props.lastScheduledDueAt;
    const next = current === null || date.getTime() > current.getTime() ? date : current;
    return new TopicLoopState({ ...this.props, lastScheduledDueAt: next });
  }
}
