import type { ResolveTopicCommand } from './command';
import type { TopicReference } from '../../domain/value-objects';

export type { ResolveTopicCommand };

export interface IResolveTopicUseCase {
  execute(command: ResolveTopicCommand): Promise<TopicReference>;
}
