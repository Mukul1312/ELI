export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class TopicNotFoundError extends DomainError {
  constructor(topicId: string) {
    super(`Topic not found: ${topicId}`);
  }
}

export class InvalidTopicReferenceError extends DomainError {
  constructor(reason: string) {
    super(`Invalid TopicReference: ${reason}`);
  }
}

export class NormalizationEntryAlreadyResolvedError extends DomainError {
  constructor(entryId: string) {
    super(`Normalization entry already resolved: ${entryId}`);
  }
}

export class InvalidIdentifierError extends DomainError {
  constructor(name: string) {
    super(`${name} must be a non-empty string`);
  }
}
