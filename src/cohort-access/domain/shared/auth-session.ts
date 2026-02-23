import type { Role } from './role';
import type { AccessScope } from './access-scope';
import { DomainError } from './errors';

export interface AuthSessionProps {
  studentId: string;
  cohortId: string | null;
  role: Role;
  accessScope: AccessScope;
}

export class InvalidAuthSessionError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class AuthSession {
  private constructor(private readonly props: Readonly<AuthSessionProps>) {}

  static create(props: {
    studentId: string;
    cohortId: string | null;
    role: Role;
    accessScope: AccessScope;
  }): AuthSession {
    const studentId = props.studentId?.trim();
    if (!studentId) {
      throw new InvalidAuthSessionError('studentId must be non-empty');
    }
    if (!props.role) {
      throw new InvalidAuthSessionError('role is required');
    }
    if (!props.accessScope) {
      throw new InvalidAuthSessionError('accessScope is required');
    }
    return new AuthSession({
      studentId,
      cohortId: props.cohortId ?? null,
      role: props.role,
      accessScope: props.accessScope,
    });
  }

  get studentId(): string {
    return this.props.studentId;
  }

  get cohortId(): string | null {
    return this.props.cohortId;
  }

  get role(): Role {
    return this.props.role;
  }

  get accessScope(): AccessScope {
    return this.props.accessScope;
  }

  equals(other: AuthSession): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== AuthSession) return false;
    return (
      this.props.studentId === other.props.studentId &&
      this.props.cohortId === other.props.cohortId &&
      this.props.role.equals(other.props.role) &&
      this.props.accessScope.equals(other.props.accessScope)
    );
  }
}
