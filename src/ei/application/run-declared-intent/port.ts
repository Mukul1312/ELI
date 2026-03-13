/**
 * Ports for RunDeclaredIntent use case.
 * Driver port: IRunDeclaredIntentUseCase.
 */

import type { SessionIntentIssuedOutput } from '../../schemas/outputs';
import type { RunDeclaredIntentCommand } from './command';

export interface IRunDeclaredIntentUseCase {
  execute(command: RunDeclaredIntentCommand): Promise<SessionIntentIssuedOutput>;
}
