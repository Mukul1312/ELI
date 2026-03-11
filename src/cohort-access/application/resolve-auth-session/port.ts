import type { AuthSession } from '../../domain/shared/auth-session';
import type { ResolveAuthSessionCommand } from './command';

export type { ResolveAuthSessionCommand };

export interface IResolveAuthSessionUseCase {
  execute(command: ResolveAuthSessionCommand): Promise<AuthSession | null>;
}

export interface IResolveAuthSessionPort {
  resolve(sessionUser: { id: string } | null): Promise<AuthSession | null>;
}
