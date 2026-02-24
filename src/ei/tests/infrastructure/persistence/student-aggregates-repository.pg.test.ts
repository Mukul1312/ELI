import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresStore } from '@mastra/pg';
import type { EiDb } from '../../../runtime/db';
import * as Q from '../../../db/queries';
import { PostgresStudentAggregatesRepository } from '../../../infrastructure/persistence/student-aggregates-repository.pg';
import { recomputeStudentAggregates } from '../../../infrastructure/projector/student-aggregates-projector';
import { recomputeTopicLoop } from '../../../infrastructure/projector/topic-loop-projector';
import { StudentAggregatesId } from '../../../domain/student-aggregates/value-objects';

const STUDENT_ID = 'int-test-agg-repo';
const TOPIC_ID = 'int-test-agg-topic';

async function cleanup(db: EiDb, studentId: string, topicId: string): Promise<void> {
  await db.none('DELETE FROM ei_student_aggregates WHERE student_id = $1', [studentId]);
  await db.none('DELETE FROM ei_topic_state WHERE student_id = $1 AND topic_id = $2', [
    studentId,
    topicId,
  ]);
  await db.none('DELETE FROM ei_events WHERE student_id = $1', [studentId]);
}

describe.skipIf(!process.env.DATABASE_URL)(
  'PostgresStudentAggregatesRepository + recomputeStudentAggregates (integration)',
  () => {
    let store: PostgresStore;
    let db: EiDb;

    beforeAll(async () => {
      store = new PostgresStore({
        id: 'ei-agg-integration-test',
        connectionString: process.env.DATABASE_URL!,
      });
      db = store.db as EiDb;
    });

    afterAll(async () => {
      await store.close();
    });

    beforeEach(async () => {
      await cleanup(db, STUDENT_ID, TOPIC_ID);
    });

    describe('PostgresStudentAggregatesRepository', () => {
      it('findById returns null when no row exists', async () => {
        const repo = new PostgresStudentAggregatesRepository(db);
        const id = StudentAggregatesId.create(STUDENT_ID);
        const result = await repo.findById(id);
        expect(result).toBeNull();
      });

      it('save creates row and findById returns aggregate with metrics', async () => {
        const repo = new PostgresStudentAggregatesRepository(db);
        const { StudentAggregates } = await import('../../../domain/student-aggregates/student-aggregates');
        const id = StudentAggregatesId.create(STUDENT_ID);
        const now = new Date('2025-04-15T12:00:00Z');
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const graceMs = 12 * 60 * 60 * 1000;

        const agg = StudentAggregates.recompute(id, {
          now,
          sevenDaysAgo,
          graceMs,
          events: [],
          topicStates: [],
          allTimeLatestEvent: null,
        });

        await repo.save(agg);

        const loaded = await repo.findById(id);
        expect(loaded).not.toBeNull();
        expect(loaded!.metrics.pendingChecks).toBe(0);
        expect(loaded!.metrics.openLoops).toBe(0);
        expect(loaded!.metrics.verificationRate7d).toBe(1.0);
      });
    });

    describe('recomputeStudentAggregates', () => {
      it('recomputes from events and topic state, persists correct aggregates', async () => {
        const t1 = new Date('2025-04-10T10:00:00Z');
        const t2 = new Date('2025-04-10T14:00:00Z');

        await Q.insertEvent(db, STUDENT_ID, 'SessionEnd', TOPIC_ID, {
          studentId: STUDENT_ID,
          topic: TOPIC_ID,
          endedAt: t1.toISOString(),
        }, t1);
        await Q.insertEvent(db, STUDENT_ID, 'RetrievalVerified', TOPIC_ID, {
          studentId: STUDENT_ID,
          topic: TOPIC_ID,
          verifiedAt: t2.toISOString(),
          questionsAttempted: 3,
          tier: 'med',
          format: 'standard',
        }, t2);

        await recomputeTopicLoop(db, STUDENT_ID, TOPIC_ID);

        const result = await recomputeStudentAggregates(db, STUDENT_ID, new Date('2025-04-15T12:00:00Z'));

        expect(result.studentId).toBe(STUDENT_ID);
        expect(result.pendingChecks).toBe(0);
        expect(result.openLoops).toBe(0);
        expect(result.verificationRate7d).toBe(1.0);
        expect(result.avoidantExits7d).toBe(0);
      });
    });
  },
);
