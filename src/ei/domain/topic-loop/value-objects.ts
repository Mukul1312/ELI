import { ValueObject } from '../shared/value-object';

interface TopicLoopIdProps {
  studentId: string;
  topicId: string;
}

export class TopicLoopId extends ValueObject<TopicLoopIdProps> {
  private constructor(props: TopicLoopIdProps) {
    super(props);
  }

  static create(studentId: string, topicId: string): TopicLoopId {
    return new TopicLoopId({ studentId, topicId });
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
