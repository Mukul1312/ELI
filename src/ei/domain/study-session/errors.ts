import { DomainError } from '../shared/errors';

export class SessionLifecycleError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class SessionAlreadyClosedError extends SessionLifecycleError {
  constructor() {
    super('Cannot issue commands on a closed session.');
  }
}

export class InvalidGateOrderError extends SessionLifecycleError {
  constructor(requiredStatus: string, currentStatus: string) {
    super(`Gate requires session to be in '${requiredStatus}' state, but it is '${currentStatus}'.`);
  }
}

export class InvalidGateContextError extends DomainError {
  constructor(field: string, message: string) {
    super(`Invalid gate context field '${field}': ${message}`);
  }
}

export class PlaySelectionError extends DomainError {
  constructor(message: string) {
    super(`Play selection failed: ${message}`);
  }
}
