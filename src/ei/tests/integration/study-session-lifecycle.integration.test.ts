/**
 * Integration test — StudySession lifecycle via StudySessionRepositoryPg.
 *
 * Tests:
 * 1. Two concurrent getOrCreateActiveSession calls converge to one row.
 * 2. P1 → P2 → P3 status transitions reflected in ei_study_sessions.
 *
 * Skipped unless DATABASE_URL is set.
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresStore } from '@mastra/pg';
import type { EiDb } from '../../runtime/db';
import { StudySessionRepositoryPg } from '../../infrastructure/persistence/study-session-repository.pg';
import { findActiveStudySession } from '../../db/queries';

const STUDENT_ID = 'int-test-session-lifecycle';
const TOPIC_ID = 'topic-lifecycle';

async function cleanup(db: EiDb): Promise<void> {
  await db.none(
    `DELETE FROM ei_study_sessions WHERE student_id = $1`,
    [STUDENT_ID],
  );
}

describe.skipIf(!process.env.DATABASE_URL)(
  'StudySessionLifecycle (integration)',
  () => {
    let store: PostgresStore;
    let db: EiDb;

    beforeAll(async () => {
      store = new PostgresStore({
        id: 'ei-session-lifecycle-integration-test',
        connectionString: process.env.DATABASE_URL!,
      });
      db = store.db as unknown as EiDb;
    });

    afterAll(async () => {
      await cleanup(db);
      await store.close?.();
    });

    beforeEach(async () => {
      await cleanup(db);
    });

    it('two concurrent getOrCreateActiveSession calls yield one row', async () => {
      const repo = new StudySessionRepositoryPg(db);

      const [s1, s2] = await Promise.all([
        repo.getOrCreateActiveSession(STUDENT_ID, TOPIC_ID),
        repo.getOrCreateActiveSession(STUDENT_ID, TOPIC_ID),
      ]);

      // Both must return the same session id
      expect(s1.sessionId).toBe(s2.sessionId);

      // Only one row in the DB
      const rows = await db.any(
        `SELECT id FROM ei_study_sessions WHERE student_id = $1 AND topic_id = $2`,
        [STUDENT_ID, TOPIC_ID],
      );
      expect(rows).toHaveLength(1);
    });

    it('P1→P2→P3 transitions are reflected in ei_study_sessions', async () => {
      const repo = new StudySessionRepositoryPg(db);

      // Create session (negotiating)
      const session = await repo.getOrCreateActiveSession(STUDENT_ID, TOPIC_ID);
      expect(session.status).toBe('negotiating');

      // Simulate P1 completion (negotiating → activating)
      session.issueNegotiatedIntent(
        { playId: 'NeutralDefault', mode: 'Neutral', protocol: 1 } as never,
        {} as never,
        {},
        3,
      );
      await repo.save(session);

      const afterP1 = await findActiveStudySession(db, STUDENT_ID, TOPIC_ID);
      expect(afterP1?.status).toBe('activating');

      // Simulate P2 completion (activating → active)
      const session2 = await repo.findById(session.sessionId);
      expect(session2).not.toBeNull();
      session2!.issueActivationPlan(
        { playId: 'NeutralDefault', mode: 'Neutral', protocol: 2 } as never,
        {} as never,
        {},
      );
      await repo.save(session2!);

      const afterP2 = await findActiveStudySession(db, STUDENT_ID, TOPIC_ID);
      expect(afterP2?.status).toBe('active');

      // Simulate P3 completion (active → verifying)
      const session3 = await repo.findById(session.sessionId);
      session3!.issueVerificationDecision(
        { playId: 'NeutralDefault', mode: 'Neutral', protocol: 3 } as never,
        {} as never,
        {},
      );
      await repo.save(session3!);

      const afterP3 = await findActiveStudySession(db, STUDENT_ID, TOPIC_ID);
      expect(afterP3?.status).toBe('verifying');

      // Close session — should no longer appear as active
      const session4 = await repo.findById(session.sessionId);
      session4!.close();
      await repo.save(session4!);

      const afterClose = await findActiveStudySession(db, STUDENT_ID, TOPIC_ID);
      expect(afterClose).toBeNull();
    });
  },
);
