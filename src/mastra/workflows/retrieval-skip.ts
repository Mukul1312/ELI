/**
 * RetrievalSkip workflow — append RetrievalSkipped, return done SDUI.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { StudySessionRepositoryPg } from '../../ei/infrastructure/persistence/study-session-repository.pg';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { composePhase3View, type Phase3Scenario } from '../../ei/sdui/view-composer';
import { buildP3PresentationContext } from '../../ei/sdui/presentation-context';
import * as Q from '../../ei/db/queries';

const RetrievalSkipInput = z.object({
  studentId: z.string(),
  topic: z.string(),
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
    const { studentId, topic, mode = 'Neutral', reason, idempotencyKey } = inputData;
    const skippedAt = new Date().toISOString();

    const payload = validateEventPayload('RetrievalSkipped', {
      studentId,
      topic,
      reason,
      skippedAt,
    });

    const db = eiStore.db;

    const [aggregates, eventCounts, energyPressure, topicName] = await Promise.all([
      Q.getAggregates(db, studentId),
      Q.countStudentEventsLast7d(db, studentId),
      Q.getLastAppOpenEnergyPressure(db, studentId),
      Q.getTopicName(db, studentId, topic),
    ]);

    const appendEvent = new PostgresAppendEventAdapter(db);
    await appendEvent.append({
      studentId,
      eventType: 'RetrievalSkipped',
      topicId: topic,
      payload,
      idempotencyKey: idempotencyKey ? `${idempotencyKey}:RetrievalSkipped` : undefined,
    });

    // Close the active session for this topic — terminal outcome.
    const sessionRepo = new StudySessionRepositoryPg(db);
    const activeSession = await sessionRepo.findActiveByStudentTopic(studentId, topic);
    if (activeSession) {
      activeSession.close();
      await sessionRepo.save(activeSession);
    }

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
      energyPressure,
      aggregatesForPresentation,
      eventCounts,
    );

    const skipScenarios: Record<string, Phase3Scenario> = {
      fatigue: 'skip_fatigue',
      time: 'skip_time',
      confusion: 'skip_confusion',
    };
    const scenario: Phase3Scenario = skipScenarios[reason.toLowerCase()] ?? 'skip_time';

    const sdui = composePhase3View(topic, mode, scenario, ctx, topicName ?? undefined);
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
