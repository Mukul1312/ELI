import type { StudySession } from './study-session';

/**
 * IStudySessionRepository — driven port for StudySession persistence.
 * Per DDD-TACTICAL.md: one repository per aggregate, interface in domain layer.
 *
 * MVP note: Session state is derivable from Ledger events, so a dedicated
 * ei_study_sessions table is deferred. The interface is defined now for
 * future implementation; for MVP the application layer reconstructs from events.
 */
export interface IStudySessionRepository {
  findById(sessionId: string): Promise<StudySession | null>;
  save(session: StudySession): Promise<void>;
}
