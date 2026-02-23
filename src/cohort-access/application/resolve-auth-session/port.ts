import type { AuthSession } from '../../domain/shared/auth-session';

export interface ResolveAuthSessionCommand {
  sessionContext: unknown;
}

export interface IResolveAuthSessionUseCase {
  execute(command: ResolveAuthSessionCommand): Promise<AuthSession | null>;
}

export interface IResolveAuthSessionPort {
  resolve(sessionContext: unknown): Promise<AuthSession | null>;
}
