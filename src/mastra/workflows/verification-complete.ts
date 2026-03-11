/**
 * VerificationComplete workflow — append VerificationCompleted, return done SDUI.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { getDb } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { StudySessionRepositoryPg } from '../../ei/infrastructure/persistence/study-session-repository.pg';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { composePhase3View, type Phase3Scenario } from '../../ei/sdui/view-composer';
import { buildP3PresentationContext } from '../../ei/sdui/presentation-context';
import * as Q from '../../ei/db/queries';
import { recomputeTopicLoop } from '../../ei/infrastructure/projector/topic-loop-projector';
import { recomputeStudentAggregates } from '../../ei/infrastructure/projector/student-aggregates-projector';

const VerificationCompleteInput = z.object({
  studentId: z.string(),
  topic: z.string(),
  topicName: z.string().optional(),
  mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
  result: z.enum(['confident', 'not_confident']),
  completedAt: z.string().datetime(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

const appendAndComposeStep = createStep({
  id: 'append-verification-complete-compose-done',
  inputSchema: VerificationCompleteInput,
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, topicName: topicNameFromInput, mode = 'Neutral', result, completedAt, idempotencyKey } = inputData;

    const payload = validateEventPayload('VerificationCompleted', {
      studentId,
      topic,
      ...(topicNameFromInput && { topicName: topicNameFromInput }),
      completedAt,
      result,
    });

    const db = getDb();

    // Load aggregates + energy before appending event (pre-event snapshot for counter display).
    // topicName: input is primary source; DB is safety-net fallback for old cached SDUI payloads.
    const [aggregates, eventCounts, lastEnergy, topicNameFromDb, nextPendingTopic, topicState, sessionDurationSec] = await Promise.all([
      Q.getAggregates(db, studentId),
      Q.countStudentEventsLast7d(db, studentId),
      Q.getLastAppOpenEnergy(db, studentId),
      topicNameFromInput ? Promise.resolve(null) : Q.getTopicName(db, studentId, topic),
      Q.getOldestPendingTopic(db, studentId, topic),
      Q.getTopicState(db, studentId, topic),
      Q.getSessionDurationSec(db, studentId, topic),
    ]);

    const resolvedTopicName = topicNameFromInput ?? topicNameFromDb ?? undefined;
    const taskType = topicState?.last_task_type ?? undefined;

    const appendEvent = new PostgresAppendEventAdapter(db);
    await appendEvent.append({
      studentId,
      eventType: 'VerificationCompleted',
      topicId: topic,
      payload,
      idempotencyKey: idempotencyKey ? `${idempotencyKey}:VerificationCompleted` : undefined,
    });

    // Close the active session for this topic — terminal outcome.
    const sessionRepo = new StudySessionRepositoryPg(db);
    const activeSession = await sessionRepo.findActiveByStudentTopic(studentId, topic);
    if (activeSession) {
      activeSession.close();
      await sessionRepo.save(activeSession);
    }

    // Compose the view FIRST from pre-event snapshot (loaded above), then
    // recompute projections in parallel — they keep data fresh for the *next*
    // session but don't feed this response.
    const aggregatesForPresentation = aggregates
      ? {
          pendingChecks: aggregates.pending_checks,
          silenceDays: aggregates.silence_days,
          verificationRate7d: aggregates.verification_rate_7d,
          stateTrend7d: aggregates.state_trend_7d as 'improving' | 'flat' | 'worsening',
        }
      : null;
    const ctx = buildP3PresentationContext(
      { studentId, mode, playId: 'P3-N1', topic },
      lastEnergy,
      aggregatesForPresentation,
      eventCounts,
      nextPendingTopic,
    );

    // Determine scenario.
    // not_confident: loop stays open, pending_checks unchanged.
    // confident: loop closed, pending_checks decremented.
    const isConfident = result === 'confident';
    const countAfter = isConfident ? Math.max(0, ctx.pendingChecks - 1) : ctx.pendingChecks;

    let scenario: Phase3Scenario;
    if (!isConfident) {
      scenario = 'not_yet';
    } else if (eventCounts.loopsClosedLast7d === 0) {
      // first_ever takes priority over milestone — new user closing first loop sees G, not F.
      scenario = 'first_ever';
    } else if (countAfter === 0 && ctx.pendingChecks > 0) {
      scenario = 'milestone';
    } else {
      scenario = 'verified';
    }

    const sdui = composePhase3View(topic, mode, scenario, ctx, resolvedTopicName, taskType, sessionDurationSec);

    // Fire-and-forget: recompute projections for future reads.
    // Current response uses pre-recompute data; recompute only benefits next AppOpen.
    Promise.all([
      recomputeTopicLoop(db, studentId, topic),
      recomputeStudentAggregates(db, studentId),
    ]).catch(err => console.error('[projection-recompute] background sync failed', { studentId, topic }, err));

    return sdui;
  },
});

export const verificationCompleteWorkflow = createWorkflow({
  id: 'ei-verification-complete',
  inputSchema: VerificationCompleteInput,
  outputSchema: z.any(),
})
  .then(appendAndComposeStep)
  .commit();
