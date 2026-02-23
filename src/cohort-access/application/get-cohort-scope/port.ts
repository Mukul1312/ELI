import type { AccessScope } from '../../domain/shared/access-scope';
import type { Role } from '../../domain/shared/role';

export interface GetCohortScopeCommand {
  instituteUserId: string;
}

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
