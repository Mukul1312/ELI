import type { PostgresStore } from '@mastra/pg';
import { RecomputeStudentAggregatesHandler } from '../../application/recompute-student-aggregates/handler';
import { PostgresStudentAggregatesRepository } from '../persistence/student-aggregates-repository.pg';
import { PostgresStudentEventStreamReader } from '../persistence/student-event-stream-reader.pg';
import { PostgresTopicStateReader } from '../persistence/topic-state-reader.pg';

type DbClient = PostgresStore['db'];

/**
 * Canonical repair/backfill entrypoint.
 * Constructs Postgres adapters, runs the use case, and returns computed metrics.
 */
export async function recomputeStudentAggregates(
  db: DbClient,
  studentId: string,
  now?: Date,
) {
  const repo = new PostgresStudentAggregatesRepository(db);
  const eventReader = new PostgresStudentEventStreamReader(db);
  const topicReader = new PostgresTopicStateReader(db);
  const clock = { now: () => now ?? new Date() };

  const handler = new RecomputeStudentAggregatesHandler(repo, eventReader, topicReader, clock);
  return handler.execute({ studentId, now });
}
