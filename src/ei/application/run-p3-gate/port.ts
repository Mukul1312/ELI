/**
 * Ports for RunP3Gate use case.
 * Per ei-runtime-tactical-spec.md §8 (Ports).
 */

import type { VerificationDecisionIssuedOutput } from '../../schemas/outputs';
import type { RunP3GateCommand } from './command';

export interface IRunP3GateUseCase {
  execute(command: RunP3GateCommand): Promise<VerificationDecisionIssuedOutput>;
}
