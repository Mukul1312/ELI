import type { ApplyEventCommand } from './command';

export interface IApplyEventToTopicLoopUseCase {
  execute(command: ApplyEventCommand): Promise<void>;
}
