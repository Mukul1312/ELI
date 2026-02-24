import type { PostgresStore } from '@mastra/pg';
import * as Q from '../../db/queries';
import type { ITopicStateReader, TopicStateSnapshot } from '../../application/shared/port-topic-state-reader';

type DbClient = PostgresStore['db'];

export class PostgresTopicStateReader implements ITopicStateReader {
  constructor(private readonly db: DbClient) {}

  async getAllTopicStates(studentId: string): Promise<TopicStateSnapshot[]> {
    const rows = await Q.getAllTopicStates(this.db, studentId);
    return rows.map((r) => ({
      topicId: r.topic_id,
      lastEffortAt: r.last_effort_at,
      lastRetrievalAt: r.last_retrieval_at,
      lastScheduledDueAt: r.last_scheduled_due_at,
    }));
  }
}
