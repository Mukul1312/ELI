import type { EiDb } from '../../runtime/db';
import { PostgresEventStreamReader } from '../persistence/event-stream-reader.pg';
import { PostgresTopicLoopRepository } from '../persistence/topic-loop-repository.pg';
import { PostgresTopicDisplayNameWriter } from '../persistence/topic-display-name-writer.pg';
import { TopicLoop } from '../../domain/topic-loop/topic-loop';
import { TopicLoopId } from '../../domain/topic-loop/value-objects';
import { logProjectorSpan } from '../logging';

/**
 * Rebuild TopicLoop state from scratch by replaying all events.
 * This is the canonical repair/rebuild path (replaceability invariant).
 */
export async function recomputeTopicLoop(
  db: EiDb,
  studentId: string,
  topicId: string,
  correlationId?: string,
): Promise<void> {
  const t0 = performance.now();
  const reader = new PostgresEventStreamReader(db);
  const repo = new PostgresTopicLoopRepository(db);

  const events = await reader.readEventsForTopic(studentId, topicId);
  const id = TopicLoopId.create(studentId, topicId);
  const topicLoop = TopicLoop.empty(id);

  // Extract topicName from event payloads (most recent wins).
  let topicName: string | null = null;
  for (const event of events) {
    topicLoop.applyEvent(event.eventType, event.payload);
    const name = event.payload?.topicName;
    if (typeof name === 'string' && name.trim()) {
      topicName = name.trim();
    }
  }

  await repo.save(topicLoop);

  // Persist display name via dedicated port (not domain repo concern).
  if (topicName) {
    const displayNameWriter = new PostgresTopicDisplayNameWriter(db);
    await displayNameWriter.upsertDisplayName(studentId, topicId, topicName);
  }

  logProjectorSpan({
    correlationId: correlationId ?? 'unknown',
    projectorName: 'TopicLoop',
    studentId,
    topicId,
    eventCount: events.length,
    durationMs: Math.round(performance.now() - t0),
  });
}
