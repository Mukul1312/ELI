import type { TopicLoop } from './topic-loop';
import type { TopicLoopId } from './value-objects';

export interface ITopicLoopRepository {
  findById(id: TopicLoopId): Promise<TopicLoop | null>;
  save(topicLoop: TopicLoop, topicName?: string | null): Promise<void>;
}
