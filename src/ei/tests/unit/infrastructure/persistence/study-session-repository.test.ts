/**
 * Unit tests for StudySessionRepositoryPg.getOrCreateActiveSession
 * and findActiveByStudentTopic.
 *
 * Uses an in-memory stub for the DB layer so these run without Postgres.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudySessionRepositoryPg } from '../../../../infrastructure/persistence/study-session-repository.pg';
import type { StudySessionRow } from '../../../../db/queries';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<StudySessionRow> = {}): StudySessionRow {
  return {
    id: 'sess-1',
    student_id: 'student-a',
    topic_id: 'topic-x',
    status: 'negotiating',
    negotiated_intent_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function makeDb(
  findResult: StudySessionRow | null,
  insertResult?: StudySessionRow | Error,
): object {
  return {
    oneOrNone: vi.fn().mockResolvedValue(findResult),
    one: insertResult instanceof Error
      ? vi.fn().mockRejectedValue(insertResult)
      : vi.fn().mockResolvedValue(insertResult ?? makeRow()),
    none: vi.fn().mockResolvedValue(undefined),
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('StudySessionRepositoryPg', () => {
  const STUDENT = 'student-a';
  const TOPIC = 'topic-x';

  describe('findActiveByStudentTopic', () => {
    it('returns null when no active session exists', async () => {
      const db = makeDb(null);
      const repo = new StudySessionRepositoryPg(db as never);
      const result = await repo.findActiveByStudentTopic(STUDENT, TOPIC);
      expect(result).toBeNull();
    });

    it('reconstitutes an aggregate from an active row', async () => {
      const row = makeRow({ status: 'activating' });
      const db = makeDb(row);
      const repo = new StudySessionRepositoryPg(db as never);
      const session = await repo.findActiveByStudentTopic(STUDENT, TOPIC);
      expect(session).not.toBeNull();
      expect(session!.sessionId).toBe('sess-1');
      expect(session!.status).toBe('activating');
    });
  });

  describe('getOrCreateActiveSession', () => {
    it('returns an existing session without inserting', async () => {
      const row = makeRow({ status: 'activating' });
      const db = makeDb(row);
      const repo = new StudySessionRepositoryPg(db as never);
      const session = await repo.getOrCreateActiveSession(STUDENT, TOPIC);
      expect(session.sessionId).toBe('sess-1');
      expect((db as { one: ReturnType<typeof vi.fn> }).one).not.toHaveBeenCalled();
    });

    it('inserts and returns a new session when none exists', async () => {
      const db = makeDb(null, makeRow({ status: 'negotiating' }));
      const repo = new StudySessionRepositoryPg(db as never);
      const session = await repo.getOrCreateActiveSession(STUDENT, TOPIC);
      expect(session.status).toBe('negotiating');
      expect((db as { one: ReturnType<typeof vi.fn> }).one).toHaveBeenCalled();
    });

    it('re-selects on unique-violation (concurrent insert race)', async () => {
      const uniqueViolation = Object.assign(new Error('duplicate key'), { code: '23505' });
      const winnerRow = makeRow({ id: 'sess-winner', status: 'negotiating' });

      const db = {
        // First call (find) returns null; second call (re-select) returns winnerRow
        oneOrNone: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(winnerRow),
        one: vi.fn().mockRejectedValue(uniqueViolation),
        none: vi.fn(),
      };

      const repo = new StudySessionRepositoryPg(db as never);
      const session = await repo.getOrCreateActiveSession(STUDENT, TOPIC);
      expect(session.sessionId).toBe('sess-winner');
      expect(db.one).toHaveBeenCalledTimes(1); // insert was attempted
      expect(db.oneOrNone).toHaveBeenCalledTimes(2); // initial find + re-select
    });

    it('re-throws errors that are not unique-violation', async () => {
      const randomError = new Error('connection timeout');
      const db = {
        oneOrNone: vi.fn().mockResolvedValue(null),
        one: vi.fn().mockRejectedValue(randomError),
        none: vi.fn(),
      };

      const repo = new StudySessionRepositoryPg(db as never);
      await expect(repo.getOrCreateActiveSession(STUDENT, TOPIC)).rejects.toThrow('connection timeout');
    });
  });

  describe('save', () => {
    it('upserts the session status by id', async () => {
      const row = makeRow({ status: 'activating' });
      const db = makeDb(row, row);
      const repo = new StudySessionRepositoryPg(db as never);

      const session = await repo.findById('sess-1');
      expect(session).not.toBeNull();

      await repo.save(session!);
      expect((db as { one: ReturnType<typeof vi.fn> }).one).toHaveBeenCalled();
    });
  });
});
