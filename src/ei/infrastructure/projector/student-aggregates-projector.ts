import type { PostgresStore } from '@mastra/pg';
import { SCHEDULE_GRACE_HOURS } from '../../engine/tunables';
import { RecomputeStudentAggregatesHandler } from '../../application/recompute-student-aggregates/handler';
import { PostgresStudentAggregatesRepository } from '../persistence/student-aggregates-repository.pg';
import { PostgresStudentEventStreamReader } from '../persistence/student-event-stream-reader.pg';
import { PostgresTopicStateReader } from '../persistence/topic-state-reader.pg';
import { logProjectorSpan } from '../logging';

type DbClient = PostgresStore['db'];

const GRACE_MS = SCHEDULE_GRACE_HOURS * 60 * 60 * 1000;

/**
 * Canonical repair/backfill entrypoint.
 * Constructs Postgres adapters, runs the use case, and returns computed metrics.
 */
export async function recomputeStudentAggregates(
  db: DbClient,
  studentId: string,
  now?: Date,
  correlationId?: string,
) {
  const t0 = performance.now();
  const repo = new PostgresStudentAggregatesRepository(db);
  const eventReader = new PostgresStudentEventStreamReader(db);
  const topicReader = new PostgresTopicStateReader(db);
  const clock = { now: () => now ?? new Date() };

  const handler = new RecomputeStudentAggregatesHandler(repo, eventReader, topicReader, clock);
  const result = await handler.execute({ studentId, now, graceMs: GRACE_MS });

  logProjectorSpan({
    correlationId: correlationId ?? 'unknown',
    projectorName: 'StudentAggregates',
    studentId,
    eventCount: -1,
    durationMs: Math.round(performance.now() - t0),
  });

  return result;
}
