/**
 * InMemoryStudySessionRepo — implements IStudySessionRepository.
 *
 * Simple Map-based store for StudySession aggregates. Used by the pipeline
 * harness to avoid real PostgreSQL dependency.
 *
 * Note: P1 handler calls StudySession.open() directly and saves via sessionRepo.
 * P2/P3 handlers reconstitute sessions from the command's sessionId.
 * The repo is used for state persistence only.
 */

import type { IStudySessionRepository } from '../../domain/study-session/repository';
import { StudySession } from '../../domain/study-session/study-session';

let sessionCounter = 0;
function nextSessionId(): string {
  return `session-${++sessionCounter}`;
}

export class InMemoryStudySessionRepo implements IStudySessionRepository {
  private bySessionId = new Map<string, StudySession>();
  private byStudentTopic = new Map<string, StudySession>();

  private topicKey(studentId: string, topicId: string): string {
    return `${studentId}::${topicId}`;
  }

  async findById(sessionId: string): Promise<StudySession | null> {
    return this.bySessionId.get(sessionId) ?? null;
  }

  async save(session: StudySession): Promise<void> {
    this.bySessionId.set(session.sessionId, session);
    const key = this.topicKey(session.studentId, session.topicId);
    const activeStatuses = new Set(['negotiating', 'activating', 'active', 'verifying']);
    if (activeStatuses.has(session.status)) {
      this.byStudentTopic.set(key, session);
    } else {
      // If closed, remove from active index
      const existing = this.byStudentTopic.get(key);
      if (existing?.sessionId === session.sessionId) {
        this.byStudentTopic.delete(key);
      }
    }
  }

  async findActiveByStudentTopic(studentId: string, topicId: string): Promise<StudySession | null> {
    return this.byStudentTopic.get(this.topicKey(studentId, topicId)) ?? null;
  }

  async getOrCreateActiveSession(studentId: string, topicId: string): Promise<StudySession> {
    const existing = await this.findActiveByStudentTopic(studentId, topicId);
    if (existing) return existing;

    const sessionId = nextSessionId();
    const session = StudySession.open(studentId, topicId, sessionId);
    await this.save(session);
    return session;
  }

  // ── Test helpers ────────────────────────────────────────────────────────────

  clear(): void {
    this.bySessionId.clear();
    this.byStudentTopic.clear();
  }
}
