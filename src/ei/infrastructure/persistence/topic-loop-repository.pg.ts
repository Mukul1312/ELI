import type { EiDb } from '../../runtime/db';
import type { ITopicLoopRepository } from '../../domain/topic-loop/repository';
import type { TopicLoop } from '../../domain/topic-loop/topic-loop';
import type { TopicLoopId } from '../../domain/topic-loop/value-objects';
import { getTopicState, getTopicEventCounts7d, upsertTopicState } from '../../db/queries';
import { TopicLoopMapper } from './mappers/topic-loop-mapper';

export class PostgresTopicLoopRepository implements ITopicLoopRepository {
  constructor(private readonly db: EiDb) {}

  async findById(id: TopicLoopId): Promise<TopicLoop | null> {
    const row = await getTopicState(this.db, id.studentId, id.topicId);
    if (!row) return null;
    return TopicLoopMapper.toDomain(row);
  }

  async save(topicLoop: TopicLoop): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eventCounts = await getTopicEventCounts7d(
      this.db,
      topicLoop.studentId,
      sevenDaysAgo,
    );
    const countsEntry = eventCounts.find((c) => c.topicId === topicLoop.topicId);
    const effortCount7d = countsEntry?.effortCount7d ?? 0;
    const retrievalCount7d = countsEntry?.retrievalCount7d ?? 0;

    const updates = TopicLoopMapper.toPersistence(topicLoop);
    await upsertTopicState(
      this.db,
      topicLoop.studentId,
      topicLoop.topicId,
      {
        ...updates,
        effort_count_7d: effortCount7d,
        retrieval_count_7d: retrievalCount7d,
      },
    );
  }
}
