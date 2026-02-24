import type { RunEiCommandInput } from './command';

export interface IRunEiCommandUseCase {
  execute(input: RunEiCommandInput): Promise<unknown>;
}
