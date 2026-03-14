import type { TopicEdgeType, TopicEdgeStrength } from '../../domain/topic-edge';
import type { GetTopicContextCommand } from './command';

export interface TopicEdgeView {
  sourceTopicId: string;
  sourceTopicName: string;
  targetTopicId: string;
  targetTopicName: string;
  edgeType: TopicEdgeType;
  strength: TopicEdgeStrength | null;
  crossSubject: boolean;
  notes: string | null;
}

export interface TopicContextResult {
  topicId: string;
  topicName: string;
  prerequisites: TopicEdgeView[];
  unlocks: TopicEdgeView[];
  related: TopicEdgeView[];
  crossSubjectHints: TopicEdgeView[];
}

export interface IGetTopicContextUseCase {
  execute(command: GetTopicContextCommand): Promise<TopicContextResult>;
}
