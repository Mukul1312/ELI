import { DomainError } from '../shared/errors';

export class MissingStudentIdError extends DomainError {
  constructor() {
    super('TopicLoopId requires a non-empty studentId');
  }
}

export class MissingTopicIdError extends DomainError {
  constructor() {
    super('TopicLoopId requires a non-empty topicId');
  }
}

export class UnknownEventTypeError extends DomainError {
  constructor(eventType: string) {
    super(`Unknown event type for TopicLoop: ${eventType}`);
  }
}
