import { DomainError } from '../shared/errors';

export class MissingStudentIdError extends DomainError {
  constructor() {
    super('StudentAggregatesId requires a non-empty studentId');
  }
}
