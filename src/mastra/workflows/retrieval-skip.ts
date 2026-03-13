/**
 * RetrievalSkip workflow — append RetrievalSkipped, return done SDUI.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { getDb } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { composePhase3View, type Phase3Scenario } from '../../ei/sdui/view-composer';
import { buildP3PresentationContext } from '../../ei/sdui/presentation-context';
import { recomputeTopicLoop } from '../../ei/infrastructure/projector/topic-loop-projector';
import { recomputeStudentAggregates } from '../../ei/infrastructure/projector/student-aggregates-projector';
import * as Q from '../../ei/db/queries';

const RetrievalSkipInput = z.object({
  studentId: z.string(),
  topic: z.string(),
  topicName: z.string().optional(),
  mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
  reason: z.string(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

const appendAndComposeStep = createStep({
  id: 'append-retrieval-skipped-compose-done',
  inputSchema: RetrievalSkipInput,
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, topicName: topicNameFromInput, mode = 'Neutral', reason, idempotencyKey, correlationId } = inputData;
    const skippedAt = new Date().toISOString();

    const payload = validateEventPayload('RetrievalSkipped', {
      studentId,
      topic,
      ...(topicNameFromInput && { topicName: topicNameFromInput }),
      reason,
      skippedAt,
    });

    const db = getDb();

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
      eventType: 'RetrievalSkipped',
      topicId: topic,
      payload,
      idempotencyKey: idempotencyKey ? `${idempotencyKey}:RetrievalSkipped` : undefined,
    });

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

    const skipScenarios: Record<string, Phase3Scenario> = {
      fatigue: 'skip_fatigue',
      time: 'skip_time',
      confusion: 'skip_confusion',
    };
    const scenario: Phase3Scenario = skipScenarios[reason.toLowerCase()] ?? 'skip_time';

    const sdui = composePhase3View(topic, mode, scenario, ctx, resolvedTopicName, taskType, sessionDurationSec);

    // Fire-and-forget: keep projections fresh for next AppOpen.
    Promise.all([
      recomputeTopicLoop(db, studentId, topic, correlationId),
      recomputeStudentAggregates(db, studentId, undefined, correlationId),
    ]).catch(err => console.error('[projection-recompute] background sync failed', { studentId, topic }, err));

    return sdui;
  },
});

export const retrievalSkipWorkflow = createWorkflow({
  id: 'ei-retrieval-skip',
  inputSchema: RetrievalSkipInput,
  outputSchema: z.any(),
})
  .then(appendAndComposeStep)
  .commit();
