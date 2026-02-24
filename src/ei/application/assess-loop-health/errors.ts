/**
 * Application errors for AssessLoopHealth.
 * Per 01-ei-tactical-conventions.md §7b.
 */

export class MissingAggregatesError extends Error {
  constructor(studentId: string) {
    super(`Student aggregates not found for studentId: ${studentId}`);
    this.name = 'MissingAggregatesError';
  }
}

export class InvalidGateContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidGateContextError';
  }
}
