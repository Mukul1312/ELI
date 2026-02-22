import type { EiDb } from '../../runtime/db';
import type { ITopicLoopRepository } from '../../domain/topic-loop/repository';
import type { TopicLoop } from '../../domain/topic-loop/topic-loop';
import type { TopicLoopId } from '../../domain/topic-loop/value-objects';
import { getTopicState, upsertTopicState } from '../../db/queries';
import { TopicLoopMapper } from './mappers/topic-loop-mapper';

export class PostgresTopicLoopRepository implements ITopicLoopRepository {
  constructor(private readonly db: EiDb) {}

  async findById(id: TopicLoopId): Promise<TopicLoop | null> {
    const row = await getTopicState(this.db, id.studentId, id.topicId);
    if (!row) return null;
    return TopicLoopMapper.toDomain(row);
  }

  async save(topicLoop: TopicLoop): Promise<void> {
    const updates = TopicLoopMapper.toPersistence(topicLoop);
    await upsertTopicState(
      this.db,
      topicLoop.studentId,
      topicLoop.topicId,
      updates,
    );
  }
}
