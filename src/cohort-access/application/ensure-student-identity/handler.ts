import type {
  IEnsureStudentIdentityUseCase,
  IProvisionStudentIdentityPort,
  EnsureStudentIdentityCommand,
  ProvisionResult,
} from './port';

export class EnsureStudentIdentityHandler implements IEnsureStudentIdentityUseCase {
  constructor(private readonly provisionPort: IProvisionStudentIdentityPort) {}

  async execute(command: EnsureStudentIdentityCommand): Promise<ProvisionResult> {
    return this.provisionPort.ensureMapping(command.authUserId);
  }
}
