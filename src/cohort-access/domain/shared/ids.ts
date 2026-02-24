import { DomainError } from './errors';

export class StudentId {
  private constructor(private readonly _value: string) {}

  static create(value: string): StudentId {
    if (!value?.trim()) throw new DomainError('StudentId must be non-empty');
    return new StudentId(value.trim());
  }

  get value(): string {
    return this._value;
  }

  equals(other: StudentId): boolean {
    return other !== null && other !== undefined && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export class CohortId {
  private constructor(private readonly _value: string) {}

  static create(value: string): CohortId {
    if (!value?.trim()) throw new DomainError('CohortId must be non-empty');
    return new CohortId(value.trim());
  }

  get value(): string {
    return this._value;
  }

  equals(other: CohortId): boolean {
    return other !== null && other !== undefined && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
