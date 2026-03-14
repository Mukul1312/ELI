import { TopicEdge, TopicEdgeType } from './topic-edge';

/**
 * ITopicEdgeRepository — driven port for topic graph persistence.
 *
 * Placement: domain/ (repository interface, no infrastructure details).
 * Implemented by: infrastructure/persistence/topic-edge-repository.pg.ts
 *
 * Query semantics:
 *   findPrerequisites(topicId)  → topics that MUST be learned before topicId
 *   findUnlocks(topicId)        → topics that topicId is a prerequisite for
 *   findRelated(topicId)        → symmetric related_to / applied_in neighbours
 */
export interface ITopicEdgeRepository {
  save(edge: TopicEdge): Promise<void>;

  /** All edges where targetTopicId = topicId and edgeType = 'prerequisite_of'. */
  findPrerequisites(topicId: string): Promise<TopicEdge[]>;

  /** All edges where sourceTopicId = topicId and edgeType = 'prerequisite_of'. */
  findUnlocks(topicId: string): Promise<TopicEdge[]>;

  /** All edges involving topicId with edgeType in ('related_to', 'applied_in'). */
  findRelated(topicId: string): Promise<TopicEdge[]>;

  /** All edges involving topicId (any type) — for full graph traversal. */
  findAll(topicId: string): Promise<TopicEdge[]>;

  /** All cross-subject edges for a given exam (used by ViewComposer cross-subject hints). */
  findCrossSubjectEdges(examId: string): Promise<TopicEdge[]>;

  findByType(edgeType: TopicEdgeType): Promise<TopicEdge[]>;
}
