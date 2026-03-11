/**
 * RunDeclaredIntentHandler — declared-path P1 use case.
 *
 * Student declares their own study intent (no ELI negotiation).
 * Emits SessionIntentIssued(intentSource='declared') to the Ledger.
 * Transitions session: negotiating → activating.
 *
 * Per Approach B design (ei-runtime-tactical-spec.md §9).
 */

import type { RunDeclaredIntentCommand } from './command';
import type { IRunDeclaredIntentUseCase } from './port';
import type { SessionIntentIssuedOutput } from '../../schemas/outputs';
import type { IAppendEventPort } from '../shared/port-append-event';

import { StudySession } from '../../domain/study-session/study-session';

export class RunDeclaredIntentHandler implements IRunDeclaredIntentUseCase {
  constructor(
    private readonly appendEvent: IAppendEventPort,
  ) {}

  async execute(command: RunDeclaredIntentCommand): Promise<SessionIntentIssuedOutput> {
    const {
      studentId, topicId, sessionId,
      timebox, taskType, energy, sleepBucket, verificationFloor,
    } = command;

    // ── 1. Drive StudySession aggregate ─────────────────────────────────────
    const session = StudySession.open(studentId, topicId, sessionId);
    session.issueDeclaredIntent({ timebox, taskType, energy, sleepBucket, verificationFloor });

    // ── 2. Pull domain events ────────────────────────────────────────────────
    const domainEvents = session.pullDomainEvents();

    // ── 3. Build output ──────────────────────────────────────────────────────
    const issuedAt = new Date().toISOString();
    const output: SessionIntentIssuedOutput = {
      studentId,
      topicId,
      intentSource: 'declared',
      timebox,
      taskType,
      energy,
      sleepBucket,
      issuedAt,
      topic: topicId,
      mode: null,
      playId: null,
      verificationFloor: verificationFloor ?? null,
      constraints: null,
      stateScore: null,
      questionCount: null,
      difficultyTier: null,
      sessionIntentId: null,
    };

    // ── 4. Persist to Ledger ─────────────────────────────────────────────────
    for (const event of domainEvents) {
      await this.appendEvent.append({
        studentId,
        eventType: event.eventType,
        topicId,
        payload: event.payload as Record<string, unknown>,
      });
    }

    return output;
  }
}
