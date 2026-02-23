import { DomainError } from './errors';

const ALLOWED_ROLES = ['student', 'admin', 'institute'] as const;
export type RoleValue = (typeof ALLOWED_ROLES)[number];

export class InvalidRoleError extends DomainError {
  constructor(value: string) {
    super(`Invalid role: ${value}. Must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }
}

export class Role {
  private constructor(private readonly _value: RoleValue) {}

  static create(value: string): Role {
    const normalized = value?.toLowerCase()?.trim();
    if (!normalized || !ALLOWED_ROLES.includes(normalized as RoleValue)) {
      throw new InvalidRoleError(value);
    }
    return new Role(normalized as RoleValue);
  }

  get value(): RoleValue {
    return this._value;
  }

  equals(other: Role): boolean {
    return other !== null && other !== undefined && this._value === other._value;
  }
}
