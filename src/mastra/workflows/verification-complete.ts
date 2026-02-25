/**
 * VerificationComplete workflow — append VerificationCompleted, return done SDUI.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { StudySessionRepositoryPg } from '../../ei/infrastructure/persistence/study-session-repository.pg';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { composeDoneView } from '../../ei/sdui/view-composer';

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

    const sdui = composeDoneView({ topic, mode });

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
