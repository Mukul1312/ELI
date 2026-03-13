import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresStore } from '@mastra/pg';
import type { EiDb } from '../../../runtime/db';
import * as Q from '../../../db/queries';
import { PostgresGetStudentSignalsAdapter } from '../../../infrastructure/persistence/get-student-signals.pg';
import { PostgresStudentAggregatesRepository } from '../../../infrastructure/persistence/student-aggregates-repository.pg';
import { recomputeStudentAggregates } from '../../../infrastructure/projector/student-aggregates-projector';
import { recomputeTopicLoop } from '../../../infrastructure/projector/topic-loop-projector';
import { StudentAggregatesId } from '../../../domain/student-aggregates/value-objects';

const STUDENT_ID = 'int-test-get-signals';

async function cleanup(db: EiDb, studentId: string): Promise<void> {
  await db.none('DELETE FROM ei_student_aggregates WHERE student_id = $1', [studentId]);
  await db.none('DELETE FROM ei_student_policy WHERE student_id = $1', [studentId]);
  await db.none('DELETE FROM ei_topic_state WHERE student_id = $1', [studentId]);
  await db.none('DELETE FROM ei_events WHERE student_id = $1', [studentId]);
}

describe.skipIf(!process.env.DATABASE_URL)(
  'PostgresGetStudentSignalsAdapter (integration)',
  () => {
    let store: PostgresStore;
    let db: EiDb;

    beforeAll(async () => {
      store = new PostgresStore({
        id: 'ei-get-signals-integration-test',
        connectionString: process.env.DATABASE_URL!,
      });
      db = store.db as EiDb;
    });

    afterAll(async () => {
      await store.close();
    });

    beforeEach(async () => {
      await cleanup(db, STUDENT_ID);
    });

    it('getSignals returns null when student has no aggregates', async () => {
      const adapter = new PostgresGetStudentSignalsAdapter(db);
      const signals = await adapter.getSignals(STUDENT_ID);
      expect(signals).toBeNull();
    });

    it('getSignals returns aggregates when student has aggregates', async () => {
      const repo = new PostgresStudentAggregatesRepository(db);
      const { StudentAggregates } = await import(
        '../../../domain/student-aggregates/student-aggregates'
      );
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
        hasPriorAppOpen: false,
        lastIdentityShownAt: null,
      });

      await repo.save(agg);

      const adapter = new PostgresGetStudentSignalsAdapter(db);
      const signals = await adapter.getSignals(STUDENT_ID);
      expect(signals).not.toBeNull();
      expect(signals!.aggregates).toMatchObject({
        pendingChecks: 0,
        openLoops: 0,
        verificationRate7d: 1.0,
        silenceDays: 0,
      });
    });
  }
);
