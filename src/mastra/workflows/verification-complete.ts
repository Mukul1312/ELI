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

const VerificationCompleteInput = z.object({
  studentId: z.string(),
  topic: z.string(),
  mode: z.enum(['Rescue', 'Neutral', 'Boost']).optional(),
  questionsAttempted: z.union([z.number(), z.string()]),
  correct: z.union([z.number(), z.string()]),
  completedAt: z.string().datetime(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

const appendAndComposeStep = createStep({
  id: 'append-verification-complete-compose-done',
  inputSchema: VerificationCompleteInput,
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, mode = 'Neutral', questionsAttempted, correct, completedAt, idempotencyKey } = inputData;
    const q = typeof questionsAttempted === 'string' ? parseInt(questionsAttempted, 10) : questionsAttempted;
    const c = typeof correct === 'string' ? parseInt(correct, 10) : correct;
    const score = q > 0 ? c / q : 0;

    const payload = validateEventPayload('VerificationCompleted', {
      studentId,
      topic,
      completedAt,
      result: { questionsAttempted: q, score },
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

    // Determine scenario: milestone if this closes last loop, first_ever if first loop ever
    const countAfter = Math.max(0, ctx.pendingChecks - 1);
    let scenario: Phase3Scenario;
    if (countAfter === 0 && ctx.pendingChecks > 0) {
      scenario = 'milestone';
    } else if (eventCounts.loopsClosedLast7d === 0) {
      scenario = 'first_ever';
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
