import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresStore } from '@mastra/pg';
import type { EiDb } from '../../../runtime/db';
import * as Q from '../../../db/queries';
import { PostgresTopicLoopRepository } from '../../../infrastructure/persistence/topic-loop-repository.pg';
import { recomputeTopicLoop } from '../../../infrastructure/projector/topic-loop-projector';
import { TopicLoop } from '../../../domain/topic-loop/topic-loop';
import { TopicLoopId } from '../../../domain/topic-loop/value-objects';

const STUDENT_ID = 'int-test-repo';
const TOPIC_ID = 'int-test-topic';

async function cleanup(db: EiDb, studentId: string, topicId: string): Promise<void> {
  await db.none('DELETE FROM ei_topic_state WHERE student_id = $1 AND topic_id = $2', [
    studentId,
    topicId,
  ]);
  await db.none('DELETE FROM ei_events WHERE student_id = $1 AND topic_id = $2', [
    studentId,
    topicId,
  ]);
}

describe.skipIf(!process.env.DATABASE_URL)(
  'PostgresTopicLoopRepository + recomputeTopicLoop (integration)',
  () => {
    let store: PostgresStore;
    let db: EiDb;


    beforeAll(async () => {
      store = new PostgresStore({
        id: 'ei-integration-test',
        connectionString: process.env.DATABASE_URL!,
      });
      db = store.db as EiDb;

    console.log('DB connected:', !!db);

    });

    afterAll(async () => {
      await store.close();
    });

    beforeEach(async () => {
      await cleanup(db, STUDENT_ID, TOPIC_ID);
    });

    describe('PostgresTopicLoopRepository', () => {
      it('findById returns null when no row exists', async () => {
        const repo = new PostgresTopicLoopRepository(db);
        const id = TopicLoopId.create(STUDENT_ID, TOPIC_ID);
        const result = await repo.findById(id);
        expect(result).toBeNull();
      });

      it('save creates row and findById returns aggregate with state', async () => {
        const t1 = new Date('2025-04-01T10:00:00Z');
        const id = TopicLoopId.create(STUDENT_ID, TOPIC_ID);
        const topicLoop = TopicLoop.empty(id);
        topicLoop.applyEvent('SessionEnd', { endedAt: t1.toISOString() });

        const repo = new PostgresTopicLoopRepository(db);
        await repo.save(topicLoop);

        const loaded = await repo.findById(id);
        expect(loaded).not.toBeNull();
        expect(loaded!.state.lastEffortAt).toEqual(t1);
        expect(loaded!.state.lastRetrievalAt).toBeNull();
        expect(loaded!.state.lastScheduledDueAt).toBeNull();
      });

      it('save updates existing row', async () => {
        const t1 = new Date('2025-04-01T10:00:00Z');
        const t2 = new Date('2025-04-02T10:00:00Z');
        const id = TopicLoopId.create(STUDENT_ID, TOPIC_ID);
        const topicLoop = TopicLoop.empty(id);
        topicLoop.applyEvent('SessionEnd', { endedAt: t1.toISOString() });

        const repo = new PostgresTopicLoopRepository(db);
        await repo.save(topicLoop);

        topicLoop.applyEvent('RetrievalVerified', { verifiedAt: t2.toISOString() });
        await repo.save(topicLoop);

        const loaded = await repo.findById(id);
        expect(loaded).not.toBeNull();
        expect(loaded!.state.lastEffortAt).toEqual(t1);
        expect(loaded!.state.lastRetrievalAt).toEqual(t2);
      });
    });

    describe('recomputeTopicLoop', () => {
      it('replays events and persists correct topic state', async () => {
        const t1 = new Date('2025-04-01T10:00:00Z');
        const t2 = new Date('2025-04-02T10:00:00Z');
        const t3 = new Date('2025-04-03T10:00:00Z');

        await Q.insertEvent(db, STUDENT_ID, 'SessionEnd', TOPIC_ID, { endedAt: t1.toISOString() }, t1);
        await Q.insertEvent(db, STUDENT_ID, 'RetrievalScheduled', TOPIC_ID, {
          dueAt: t2.toISOString(),
          questionsPlanned: 3,
          tier: 'med',
          format: 'standard',
          scheduledAt: t2.toISOString(),
        }, t2);
        await Q.insertEvent(db, STUDENT_ID, 'RetrievalVerified', TOPIC_ID, {
          verifiedAt: t3.toISOString(),
          questionsAttempted: 3,
          tier: 'med',
          format: 'standard',
        }, t3);

        await recomputeTopicLoop(db, STUDENT_ID, TOPIC_ID);

        const repo = new PostgresTopicLoopRepository(db);
        const id = TopicLoopId.create(STUDENT_ID, TOPIC_ID);
        const loaded = await repo.findById(id);
        expect(loaded).not.toBeNull();
        expect(loaded!.state.lastEffortAt).toEqual(t1);
        expect(loaded!.state.lastScheduledDueAt).toEqual(t2);
        expect(loaded!.state.lastRetrievalAt).toEqual(t3);
      });
    });
  },
);
