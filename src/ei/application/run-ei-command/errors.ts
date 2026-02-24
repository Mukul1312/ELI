export class InvalidCommandError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidCommandError';
  }
}

export class InvalidTransitionError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidTransitionError';
  }
}

export class IdempotencyConflictError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'IdempotencyConflictError';
  }
}
