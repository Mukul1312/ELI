import type { EiDb } from '../../runtime/db';
import { PostgresEventStreamReader } from '../persistence/event-stream-reader.pg';
import { PostgresTopicLoopRepository } from '../persistence/topic-loop-repository.pg';
import { TopicLoop } from '../../domain/topic-loop/topic-loop';
import { TopicLoopId } from '../../domain/topic-loop/value-objects';

/**
 * Rebuild TopicLoop state from scratch by replaying all events.
 * This is the canonical repair/rebuild path (replaceability invariant).
 */
export async function recomputeTopicLoop(
  db: EiDb,
  studentId: string,
  topicId: string,
): Promise<void> {
  const reader = new PostgresEventStreamReader(db);
  const repo = new PostgresTopicLoopRepository(db);

  const events = await reader.readEventsForTopic(studentId, topicId);
  const id = TopicLoopId.create(studentId, topicId);
  const topicLoop = TopicLoop.empty(id);

  for (const event of events) {
    topicLoop.applyEvent(event.eventType, event.payload);
  }

  await repo.save(topicLoop);
}
