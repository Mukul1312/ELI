import { DomainError } from '../shared/errors';

export class MissingStudentIdError extends DomainError {
  constructor() {
    super('StudentPolicyId requires a non-empty studentId');
  }
}

export class InvalidTightnessLevelError extends DomainError {
  constructor(value: string) {
    super(`Invalid tightness level: "${value}". Must be one of: Loose, Normal, Tight`);
  }
}
