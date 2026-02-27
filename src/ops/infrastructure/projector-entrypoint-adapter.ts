/**
 * ProjectorEntrypointAdapter — implements IProjectorEntrypointPort.
 * Wires to EI recompute entrypoints: TopicLoop, StudentAggregates, StudentPolicy.
 */

import type { EiDb } from '@/ei/runtime/db';
import type { IProjectorEntrypointPort } from '@/ops/application/start-backfill-job/port';
import { recomputeTopicLoop } from '@/ei/infrastructure/projector/topic-loop-projector';
import { recomputeStudentPolicy } from '@/ei/infrastructure/projector/student-policy-projector';
import { RecomputeStudentAggregatesHandler } from '@/ei/application/recompute-student-aggregates/handler';
import { PostgresStudentAggregatesRepository } from '@/ei/infrastructure/persistence/student-aggregates-repository.pg';
import { PostgresStudentEventStreamReader } from '@/ei/infrastructure/persistence/student-event-stream-reader.pg';
import { PostgresTopicStateReader } from '@/ei/infrastructure/persistence/topic-state-reader.pg';
import { getClock } from '@/ei/runtime/clock';
import { SCHEDULE_GRACE_HOURS } from '@/ei/engine/tunables';

export class ProjectorEntrypointAdapter implements IProjectorEntrypointPort {
  constructor(private readonly db: EiDb) {}

  async recomputeTopicLoop(studentId: string, topicId: string): Promise<void> {
    await recomputeTopicLoop(this.db, studentId, topicId);
  }

  async recomputeStudentAggregates(studentId: string): Promise<void> {
    const clock = getClock(undefined);
    const graceMs = SCHEDULE_GRACE_HOURS * 60 * 60 * 1000;
    const repo = new PostgresStudentAggregatesRepository(this.db);
    const eventReader = new PostgresStudentEventStreamReader(this.db);
    const topicReader = new PostgresTopicStateReader(this.db);
    const handler = new RecomputeStudentAggregatesHandler(repo, eventReader, topicReader, clock);
    await handler.execute({ studentId, graceMs });
  }

  async recomputeStudentPolicy(studentId: string): Promise<void> {
    await recomputeStudentPolicy(this.db, studentId);
  }
}
