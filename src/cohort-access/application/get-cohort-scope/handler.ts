import type {
  IGetCohortScopeUseCase,
  IGetInstituteScopePort,
  GetCohortScopeCommand,
  CohortScopeResult,
} from './port';

export class GetCohortScopeHandler implements IGetCohortScopeUseCase {
  constructor(private readonly getInstituteScope: IGetInstituteScopePort) {}

  async execute(command: GetCohortScopeCommand): Promise<CohortScopeResult> {
    return this.getInstituteScope.getScope(command.instituteUserId);
  }
}
