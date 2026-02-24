import type { StudySession } from './study-session';

/**
 * IStudySessionRepository — driven port for StudySession persistence.
 * Per DDD-TACTICAL.md: one repository per aggregate, interface in domain layer.
 */
export interface IStudySessionRepository {
  findById(sessionId: string): Promise<StudySession | null>;
  save(session: StudySession): Promise<void>;

  /**
   * Find the current active session (status in negotiating | activating | active | verifying)
   * for a given (studentId, topicId) pair. Returns null if none exists.
   */
  findActiveByStudentTopic(studentId: string, topicId: string): Promise<StudySession | null>;

  /**
   * Fetch-or-create an active session for (studentId, topicId).
   * Uses select → insert → on-unique-violation re-select so two concurrent
   * callers always converge on the same row (partial unique index enforces
   * at most one active session per topic).
   */
  getOrCreateActiveSession(studentId: string, topicId: string): Promise<StudySession>;
}
