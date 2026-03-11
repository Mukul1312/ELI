import type { AuthSession } from '../../domain/shared/auth-session';

export interface ResolveAuthenticatedSessionCommand {
  authUserId: string;
}

export interface AuthenticatedSessionResult {
  authSession: AuthSession;
  provisioned: boolean;
}

export interface IResolveAuthenticatedSessionUseCase {
  execute(command: ResolveAuthenticatedSessionCommand): Promise<AuthenticatedSessionResult | null>;
}

export interface IResolveAuthenticatedSessionPort {
  resolve(authUserId: string): Promise<AuthenticatedSessionResult | null>;
}
