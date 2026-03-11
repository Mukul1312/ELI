/**
 * Ports for RunP1Gate use case.
 * Driver port: IRunP1GateUseCase.
 * Driven ports: IGetStudentSignalsPort (re-exported from assess-loop-health), IAppendEventPort.
 * Per ei-runtime-tactical-spec.md §8 (Ports).
 */

import type { SessionIntentIssuedOutput } from '../../schemas/outputs';
import type { RunP1GateCommand } from './command';

export interface IRunP1GateUseCase {
  execute(command: RunP1GateCommand): Promise<SessionIntentIssuedOutput>;
}
