/**
 * Composition root for CohortAccess bounded context.
 * Wires adapters and handlers. No DI container; manual constructor injection.
 */

import type { CohortAccessDb } from '@/cohort-access/infrastructure/persistence/db-types';
import { ResolveAuthSessionHandler } from '@/cohort-access/application/resolve-auth-session/handler';
import { GetCohortScopeHandler } from '@/cohort-access/application/get-cohort-scope/handler';
import { ChangeStudentMembershipHandler } from '@/cohort-access/application/change-student-membership/handler';
import { StudentMembershipRepositoryPg } from '@/cohort-access/infrastructure/persistence/student-membership-repository.pg';
import { IdempotencyKeyStorePg } from '@/cohort-access/infrastructure/persistence/idempotency-key-store.pg';
import { GetInstituteScopePg } from '@/cohort-access/infrastructure/persistence/get-institute-scope.pg';
import { NeonAuthResolverPg } from '@/cohort-access/infrastructure/auth/neon-auth-resolver.pg';
import { ProvisionStudentIdentityPg } from '@/cohort-access/infrastructure/persistence/provision-student-identity.pg';
import { EnsureStudentIdentityHandler } from '@/cohort-access/application/ensure-student-identity/handler';
import { ResolveAuthenticatedSessionHandler } from '@/cohort-access/application/resolve-authenticated-session/handler';
import { ResolveAuthenticatedSessionPg } from '@/cohort-access/infrastructure/persistence/resolve-authenticated-session.pg';
import type { IResolveAuthSessionUseCase } from '@/cohort-access/application/resolve-auth-session/port';
import type { IEnsureStudentIdentityUseCase } from '@/cohort-access/application/ensure-student-identity/port';
import type { IResolveAuthenticatedSessionUseCase } from '@/cohort-access/application/resolve-authenticated-session/port';
import type { IGetCohortScopeUseCase } from '@/cohort-access/application/get-cohort-scope/port';
import type { IChangeStudentMembershipUseCase } from '@/cohort-access/application/change-student-membership/port';

/** Session supplier for Neon Auth. When @neondatabase/auth is not set up, pass () => Promise.resolve(null). */
export type GetSessionFn = () => Promise<{ user: { id: string }; session: { userId: string } } | null>;

export function createEnsureStudentIdentityUseCase(
  db: CohortAccessDb,
): IEnsureStudentIdentityUseCase {
  const provisionPort = new ProvisionStudentIdentityPg(db);
  return new EnsureStudentIdentityHandler(provisionPort);
}

export function createResolveAuthSessionUseCase(
  db: CohortAccessDb,
): IResolveAuthSessionUseCase {
  const port = new NeonAuthResolverPg(db);
  return new ResolveAuthSessionHandler(port);
}

export function createResolveAuthenticatedSessionUseCase(
  db: CohortAccessDb,
): IResolveAuthenticatedSessionUseCase {
  const port = new ResolveAuthenticatedSessionPg(db);
  return new ResolveAuthenticatedSessionHandler(port);
}

export function createGetCohortScopeUseCase(db: CohortAccessDb): IGetCohortScopeUseCase {
  const port = new GetInstituteScopePg(db);
  return new GetCohortScopeHandler(port);
}

export function createChangeStudentMembershipUseCase(db: CohortAccessDb): IChangeStudentMembershipUseCase {
  const membershipRepo = new StudentMembershipRepositoryPg(db);
  const idempotencyStore = new IdempotencyKeyStorePg(db);
  return new ChangeStudentMembershipHandler(membershipRepo, idempotencyStore);
}
