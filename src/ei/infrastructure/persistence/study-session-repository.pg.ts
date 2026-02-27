/**
 * StudySessionRepositoryPg — implements IStudySessionRepository.
 * Persists StudySession to ei_study_sessions for concurrency safety.
 */

import type { EiDb } from '../../runtime/db';
import type { IStudySessionRepository } from '../../domain/study-session/repository';
import type { StudySession } from '../../domain/study-session/study-session';
import { StudySession as StudySessionAggregate } from '../../domain/study-session/study-session';
import {
  getStudySession,
  upsertStudySession,
  findActiveStudySession,
  insertStudySession,
} from '../../db/queries';

export class StudySessionRepositoryPg implements IStudySessionRepository {
  constructor(private readonly db: EiDb) {}

  async findById(sessionId: string): Promise<StudySession | null> {
    const row = await getStudySession(this.db, sessionId);
    if (!row) return null;

    return StudySessionAggregate.reconstitute(
      row.id,
      row.student_id,
      row.topic_id,
      row.status as 'negotiating' | 'activating' | 'active' | 'verifying' | 'closed',
      null,
      null,
      null,
      row.negotiated_intent_id ?? null,
    );
  }

  async save(session: StudySession): Promise<void> {
    await upsertStudySession(
      this.db,
      session.sessionId,
      session.studentId,
      session.topicId,
      session.status,
      session.negotiatedIntentId ?? undefined,
    );
  }

  async findActiveByStudentTopic(studentId: string, topicId: string): Promise<StudySession | null> {
    const row = await findActiveStudySession(this.db, studentId, topicId);
    if (!row) return null;

    return StudySessionAggregate.reconstitute(
      row.id,
      row.student_id,
      row.topic_id,
      row.status as 'negotiating' | 'activating' | 'active' | 'verifying' | 'closed',
      null,
      null,
      null,
      row.negotiated_intent_id ?? null,
    );
  }

  /**
   * select → insert → on-unique-violation re-select
   *
   * The partial unique index on (student_id, topic_id) WHERE status IN
   * ('negotiating','activating','active','verifying') guarantees that at most
   * one active-set row can exist at a time. Two concurrent callers will race
   * to insert; the loser catches the UniqueViolation and falls back to SELECT.
   */
  async getOrCreateActiveSession(studentId: string, topicId: string): Promise<StudySession> {
    const existing = await findActiveStudySession(this.db, studentId, topicId);
    if (existing) {
      return StudySessionAggregate.reconstitute(
        existing.id,
        existing.student_id,
        existing.topic_id,
        existing.status as 'negotiating' | 'activating' | 'active' | 'verifying' | 'closed',
        null,
        null,
        null,
        existing.negotiated_intent_id ?? null,
      );
    }

    const newId = crypto.randomUUID();
    try {
      const row = await insertStudySession(this.db, newId, studentId, topicId, 'negotiating');
      return StudySessionAggregate.reconstitute(
        row.id,
        row.student_id,
        row.topic_id,
        row.status as 'negotiating' | 'activating' | 'active' | 'verifying' | 'closed',
        null,
        null,
        null,
        row.negotiated_intent_id ?? null,
      );
    } catch (err: unknown) {
      // Unique violation (concurrent insert won the race) — re-select.
      const isUniqueViolation =
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === '23505';

      if (isUniqueViolation) {
        const winner = await findActiveStudySession(this.db, studentId, topicId);
        if (winner) {
          return StudySessionAggregate.reconstitute(
            winner.id,
            winner.student_id,
            winner.topic_id,
            winner.status as 'negotiating' | 'activating' | 'active' | 'verifying' | 'closed',
            null,
            null,
            null,
            winner.negotiated_intent_id ?? null,
          );
        }
      }
      throw err;
    }
  }
}
