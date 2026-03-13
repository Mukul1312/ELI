/**
 * reconstructSessionIntentFromPayload — backward-compat helper for event shape migration.
 *
 * Per ADR-005 §C4: stored SessionIntentIssued events have two historical shapes:
 * - New (current): flat fields at payload root
 * - Old (pre-migration): nested under `scope` and `verificationPlan`
 *
 * This pure function handles 5 fallback chains. Extracted for testability.
 *
 * Shelf life: 2–4 weeks post-deploy (old-shape events only exist for pre-migration sessions).
 */

import type { SessionIntentIssuedOutput } from '../../../schemas/outputs';
import type { SessionTaskType } from '../../../schemas/events';
import type { SleepBucket } from '../../../engine/score';

/**
 * Reconstruct a SessionIntentIssuedOutput from a stored event payload.
 * Handles both old nested shape and new flat shape.
 */
export function reconstructSessionIntentFromPayload(
  studentId: string,
  topicId: string,
  topicName: string | undefined,
  payload: Record<string, unknown>,
  occurredAt: Date,
): SessionIntentIssuedOutput {
  const p = payload;

  // C4 fallback chain: verificationPlan → verificationFloor
  const verificationFloor = p.verificationFloor
    ? (p.verificationFloor as { minQuestions: number; preferVerifyNow: boolean })
    : p.verificationPlan
      ? {
          minQuestions: (p.verificationPlan as Record<string, unknown>).minQuestions as number ?? 1,
          preferVerifyNow: (p.verificationPlan as Record<string, unknown>).preferVerifyNow as boolean ?? false,
        }
      : null;

  return {
    studentId,
    topicId,
    intentSource: (p.intentSource as 'negotiated' | 'declared') ?? 'negotiated',
    // C4 fallback: scope.timeboxMin → timebox
    timebox: (p.timebox as number) ?? (p.scope as Record<string, unknown>)?.timeboxMin as number ?? 30,
    taskType: (p.taskType as SessionTaskType) ?? 'Practice',
    energy: (p.energy as number) ?? 3,
    sleepBucket: (p.sleepBucket as SleepBucket) ?? '7-8',
    issuedAt: occurredAt.toISOString(),
    topic: topicId,
    topicName: topicName ?? (p.topicName as string) ?? undefined,
    mode: (p.mode as 'Rescue' | 'Neutral' | 'Boost' | null) ?? 'Neutral',
    playId: (p.playId as string | null) ?? null,
    verificationFloor,
    constraints:
      (p.constraints as { closeOpenLoopFirst?: boolean; noNewTopicUntil?: string } | null) ?? null,
    stateScore: (p.stateScore as number | null) ?? null,
    // C4 fallback: scope.questionCount → questionCount
    questionCount:
      (p.questionCount as number | null) ??
      (p.scope as Record<string, unknown>)?.questionCount as number ??
      null,
    // C4 fallback: scope.difficultyTier → difficultyTier
    difficultyTier:
      (p.difficultyTier as 'easy' | 'med' | 'hard' | 'advanced' | null) ??
      (p.scope as Record<string, unknown>)?.difficultyTier as 'easy' | 'med' | 'hard' | 'advanced' ??
      null,
    // C4 fallback: negotiatedIntentId → sessionIntentId
    sessionIntentId:
      (p.sessionIntentId as string | null) ??
      (p.negotiatedIntentId as string | null) ??
      null,
  };
}
