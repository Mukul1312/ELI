import type { IGetTopicContextUseCase } from './port';
import type { GetTopicContextCommand } from './command';
import type { TopicContextResult, TopicEdgeView } from './port';
import type { ICatalogRepository } from '../../domain/catalog-repository';
import type { ITopicEdgeRepository } from '../../domain/topic-edge-repository';
import type { TopicEdge } from '../../domain/topic-edge';
import { TopicNotFoundError } from '../../domain/errors';

export class GetTopicContextHandler implements IGetTopicContextUseCase {
  constructor(
    private readonly catalogRepo: ICatalogRepository,
    private readonly edgeRepo: ITopicEdgeRepository,
  ) {}

  async execute(command: GetTopicContextCommand): Promise<TopicContextResult> {
    const topic = await this.catalogRepo.findTopicById(command.topicId);
    if (!topic) throw new TopicNotFoundError(command.topicId);

    const [prerequisites, unlocks, related] = await Promise.all([
      this.edgeRepo.findPrerequisites(command.topicId),
      this.edgeRepo.findUnlocks(command.topicId),
      this.edgeRepo.findRelated(command.topicId),
    ]);

    // Collect all referenced topic IDs for batch name resolution
    const allEdges = [...prerequisites, ...unlocks, ...related];
    const referencedIds = [
      ...new Set(
        allEdges.flatMap(e => [e.sourceTopicId, e.targetTopicId])
               .filter(id => id !== command.topicId),
      ),
    ];

    const referencedTopics = await this.catalogRepo.findTopicsByIds(referencedIds);
    const nameById = new Map<string, string>(
      referencedTopics.map(t => [t.id.value, t.name]),
    );
    nameById.set(topic.id.value, topic.name);

    const enrich = (edge: TopicEdge): TopicEdgeView => ({
      sourceTopicId: edge.sourceTopicId,
      sourceTopicName: nameById.get(edge.sourceTopicId) ?? edge.sourceTopicId,
      targetTopicId: edge.targetTopicId,
      targetTopicName: nameById.get(edge.targetTopicId) ?? edge.targetTopicId,
      edgeType: edge.edgeType,
      strength: edge.strength,
      crossSubject: edge.crossSubject,
      notes: edge.notes,
    });

    const crossSubjectHints = related.filter(e => e.crossSubject).map(enrich);

    return {
      topicId: topic.id.value,
      topicName: topic.name,
      prerequisites: prerequisites.map(enrich),
      unlocks: unlocks.map(enrich),
      related: related.map(enrich),
      crossSubjectHints,
    };
  }
}
