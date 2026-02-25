import type { EnsureStudentIdentityCommand } from './command';

export type { EnsureStudentIdentityCommand };

export interface IEnsureStudentIdentityUseCase {
  execute(command: EnsureStudentIdentityCommand): Promise<ProvisionResult>;
}

export interface ProvisionResult {
  studentId: string;
  provisioned: boolean;
}

/** Driven port: ensures students row exists for auth_user_id; returns studentId and whether it was newly created. */
export interface IProvisionStudentIdentityPort {
  ensureMapping(authUserId: string): Promise<ProvisionResult>;
}
