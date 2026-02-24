import { DomainError } from '../shared/errors';

export class MissingStudentIdError extends DomainError {
  constructor() {
    super('studentId is required');
  }
}

export class InvalidCohortIdError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class IdempotencyKeyConflictError extends DomainError {
  constructor(key: string, existingCohortId: string, requestedCohortId: string) {
    super(`Idempotency key ${key} already used with cohort ${existingCohortId}; cannot use with different cohort ${requestedCohortId}`);
  }
}

export class UnauthorizedMembershipChangeError extends DomainError {
  constructor(requiredRole: string) {
    super(`This membership change requires ${requiredRole} role`);
  }
}
