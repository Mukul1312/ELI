import type { StudySession } from './study-session';

export interface IStudySessionRepository {
  findById(sessionId: string): Promise<StudySession | null>;
  save(session: StudySession): Promise<void>;
}
