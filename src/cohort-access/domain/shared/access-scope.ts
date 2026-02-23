import { DomainError } from './errors';

const ALLOWED_SCOPES = ['cohort', 'global'] as const;
export type AccessScopeValue = (typeof ALLOWED_SCOPES)[number];

export interface AccessScopeProps {
  cohortIds: string[];
  scope: AccessScopeValue;
}

export class InvalidAccessScopeError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class AccessScope {
  private constructor(private readonly props: Readonly<AccessScopeProps>) {}

  static create(props: { cohortIds: string[]; scope: 'cohort' | 'global' }): AccessScope {
    if (!Array.isArray(props.cohortIds)) {
      throw new InvalidAccessScopeError('cohortIds must be an array');
    }
    if (!props.scope || !ALLOWED_SCOPES.includes(props.scope)) {
      throw new InvalidAccessScopeError(`scope must be one of: ${ALLOWED_SCOPES.join(', ')}`);
    }
    return new AccessScope({
      cohortIds: [...props.cohortIds],
      scope: props.scope,
    });
  }

  get cohortIds(): string[] {
    return [...this.props.cohortIds];
  }

  get scope(): AccessScopeValue {
    return this.props.scope;
  }

  equals(other: AccessScope): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== AccessScope) return false;
    if (this.props.scope !== other.props.scope) return false;
    if (this.props.cohortIds.length !== other.props.cohortIds.length) return false;
    return this.props.cohortIds.every((id, i) => id === other.props.cohortIds[i]);
  }
}
