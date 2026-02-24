import type { AccessScope } from '../../domain/shared/access-scope';
import type { Role } from '../../domain/shared/role';
import type { GetCohortScopeCommand } from './command';

export type { GetCohortScopeCommand };

export interface CohortScopeResult {
  cohortIds: string[];
  role: Role;
  accessScope: AccessScope;
}

export interface IGetCohortScopeUseCase {
  execute(command: GetCohortScopeCommand): Promise<CohortScopeResult>;
}

export interface IGetInstituteScopePort {
  getScope(instituteUserId: string): Promise<CohortScopeResult>;
}
