import type { IResolveAuthSessionUseCase, IResolveAuthSessionPort, ResolveAuthSessionCommand } from './port';
import type { AuthSession } from '../../domain/shared/auth-session';

export class ResolveAuthSessionHandler implements IResolveAuthSessionUseCase {
  constructor(private readonly resolveAuthPort: IResolveAuthSessionPort) {}

  async execute(command: ResolveAuthSessionCommand): Promise<AuthSession | null> {
    return this.resolveAuthPort.resolve(command.sessionContext);
  }
}
