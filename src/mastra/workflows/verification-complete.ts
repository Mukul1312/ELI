/**
 * VerificationComplete workflow — append VerificationCompleted, return done SDUI.
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
import { recomputeTopicLoop } from '../../ei/infrastructure/projector/topic-loop-projector';
import { recomputeStudentAggregates } from '../../ei/infrastructure/projector/student-aggregates-projector';

const VerificationCompleteInput = z.object({
  studentId: z.string(),
  topic: z.string(),
  mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
  result: z.enum(['confident', 'partial', 'needs_review']),
  completedAt: z.string().datetime(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

const appendAndComposeStep = createStep({
  id: 'append-verification-complete-compose-done',
  inputSchema: VerificationCompleteInput,
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, mode = 'Neutral', result, completedAt, idempotencyKey } = inputData;

    const payload = validateEventPayload('VerificationCompleted', {
      studentId,
      topic,
      completedAt,
      result,
    });

    const db = eiStore.db;

    // Load aggregates + energy/pressure before appending event (pre-event snapshot for counter display)
    const [aggregates, eventCounts, energyPressure] = await Promise.all([
      Q.getAggregates(db, studentId),
      Q.countStudentEventsLast7d(db, studentId),
      Q.getLastAppOpenEnergyPressure(db, studentId),
    ]);

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

    // Sync-on-append: update projections after VerificationCompleted is written.
    // This keeps aggregates fresh for subsequent sessions.
    await recomputeTopicLoop(db, studentId, topic);
    await recomputeStudentAggregates(db, studentId);

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

    // Determine scenario.
    // first_ever (loopsClosedLast7d === 0) takes priority over milestone —
    // a new user closing their first loop must see G, not F.
    const countAfter = Math.max(0, ctx.pendingChecks - 1);
    let scenario: Phase3Scenario;
    if (eventCounts.loopsClosedLast7d === 0) {
      scenario = 'first_ever';
    } else if (countAfter === 0 && ctx.pendingChecks > 0) {
      scenario = 'milestone';
    } else {
      scenario = 'verified';
    }

    const sdui = composePhase3View(topic, mode, scenario, ctx);
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
