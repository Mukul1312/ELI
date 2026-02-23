/**
 * Ports for RunP2Gate use case.
 * Per ei-runtime-tactical-spec.md §8 (Ports).
 */

import type { ActivationPlanIssuedOutput } from '../../schemas/outputs';
import type { RunP2GateCommand } from './command';

export interface IRunP2GateUseCase {
  execute(command: RunP2GateCommand): Promise<ActivationPlanIssuedOutput>;
}
