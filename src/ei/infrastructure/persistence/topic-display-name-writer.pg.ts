import type { EiDb } from '../../runtime/db';
import type { ITopicDisplayNameWriter } from '../../application/apply-event-to-topic-loop/display-name-port';
import { upsertTopicState } from '../../db/queries';

export class PostgresTopicDisplayNameWriter implements ITopicDisplayNameWriter {
  constructor(private readonly db: EiDb) {}

  async upsertDisplayName(studentId: string, topicId: string, displayName: string): Promise<void> {
    await upsertTopicState(this.db, studentId, topicId, { topic_name: displayName });
  }
}
