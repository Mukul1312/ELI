import type { ApplyStrategicAdjustmentDecisionCommand } from './command';

export interface IApplyStrategicAdjustmentDecisionUseCase {
  execute(command: ApplyStrategicAdjustmentDecisionCommand): Promise<void>;
}
