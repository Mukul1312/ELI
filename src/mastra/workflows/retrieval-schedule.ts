/**
 * RetrievalSchedule workflow — append RetrievalScheduled, return done SDUI.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { StudySessionRepositoryPg } from '../../ei/infrastructure/persistence/study-session-repository.pg';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { composePhase3View } from '../../ei/sdui/view-composer';
import { buildP3PresentationContext } from '../../ei/sdui/presentation-context';
import * as Q from '../../ei/db/queries';

const RetrievalScheduleInput = z.object({
  studentId: z.string(),
  topic: z.string(),
  mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
  dueInHours: z.number(),
  minQuestions: z.number().int(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

const appendAndComposeStep = createStep({
  id: 'append-retrieval-scheduled-compose-done',
  inputSchema: RetrievalScheduleInput,
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, mode = 'Neutral', dueInHours, minQuestions, idempotencyKey } = inputData;
    const now = new Date();
    const dueAt = new Date(now.getTime() + dueInHours * 60 * 60 * 1000).toISOString();
    const scheduledAt = now.toISOString();

    const payload = validateEventPayload('RetrievalScheduled', {
      studentId,
      topic,
      dueAt,
      questionsPlanned: minQuestions,
      tier: 'med',
      format: 'standard',
      scheduledAt,
    });

    const db = eiStore.db;

    const [aggregates, eventCounts, energyPressure] = await Promise.all([
      Q.getAggregates(db, studentId),
      Q.countStudentEventsLast7d(db, studentId),
      Q.getLastAppOpenEnergyPressure(db, studentId),
    ]);

    const appendEvent = new PostgresAppendEventAdapter(db);
    await appendEvent.append({
      studentId,
      eventType: 'RetrievalScheduled',
      topicId: topic,
      payload,
      idempotencyKey: idempotencyKey ? `${idempotencyKey}:RetrievalScheduled` : undefined,
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

    const sdui = composePhase3View(topic, mode, 'reminded', ctx);
    return sdui;
  },
});

export const retrievalScheduleWorkflow = createWorkflow({
  id: 'ei-retrieval-schedule',
  inputSchema: RetrievalScheduleInput,
  outputSchema: z.any(),
})
  .then(appendAndComposeStep)
  .commit();
