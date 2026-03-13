import type {
  IResolveAuthenticatedSessionUseCase,
  IResolveAuthenticatedSessionPort,
  ResolveAuthenticatedSessionCommand,
  AuthenticatedSessionResult,
} from './port';

export class ResolveAuthenticatedSessionHandler implements IResolveAuthenticatedSessionUseCase {
  constructor(private readonly port: IResolveAuthenticatedSessionPort) {}

  async execute(command: ResolveAuthenticatedSessionCommand): Promise<AuthenticatedSessionResult | null> {
    return this.port.resolve(command.authUserId);
  }
}
