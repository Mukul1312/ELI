/**
 * RunDeclaredIntent command — input for the declared-path P1 use case.
 * Used when the student declares their own study intent without ELI negotiation.
 * Per Approach B design (ei-runtime-tactical-spec.md §9).
 */

import type { SessionTaskType } from '../../schemas/events';
import type { SleepBucket } from '../../engine/score';

export interface RunDeclaredIntentCommand {
  studentId: string;
  topicId: string;
  sessionId: string;
  timebox: number;
  taskType: SessionTaskType;
  energy: number;
  sleepBucket: SleepBucket;
  verificationFloor?: { minQuestions: number; preferVerifyNow: boolean } | null;
}
