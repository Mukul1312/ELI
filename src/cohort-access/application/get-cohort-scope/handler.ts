import type {
  IGetCohortScopeUseCase,
  IGetInstituteScopePort,
  GetCohortScopeCommand,
} from './port';

export class GetCohortScopeHandler implements IGetCohortScopeUseCase {
  constructor(private readonly getInstituteScope: IGetInstituteScopePort) {}

  async execute(command: GetCohortScopeCommand) {
    return this.getInstituteScope.getScope(command.instituteUserId);
  }
}
