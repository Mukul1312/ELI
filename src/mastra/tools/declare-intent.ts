/**
 * declare-intent tool — Mastra tool wrapping RunDeclaredIntentHandler.
 *
 * Issues a SessionIntentIssued(intentSource='declared') event for a student
 * who bypasses ELI and declares their own study intent directly.
 *
 * @see src/ei/application/run-declared-intent/handler.ts
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { SessionTaskTypeEnum, SleepBucketEnum } from '../../ei/schemas/events';
import { SessionIntentIssuedSchema } from '../../ei/schemas/outputs';
import { eiStore } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { RunDeclaredIntentHandler } from '../../ei/application/run-declared-intent/handler';

export const declareIntentTool = createTool({
  id: 'declare-intent',
  description:
    'Issue a SessionIntentIssued(intentSource=declared) event for a student who bypasses ELI and declares their own study intent. Creates or resumes an active study session.',
  inputSchema: z.object({
    studentId: z.string(),
    topicId: z.string(),
    timebox: z.number().int().positive(),
    taskType: SessionTaskTypeEnum,
    energy: z.number().int().min(1).max(5),
    sleepBucket: SleepBucketEnum,
    verificationFloor: z
      .object({
        minQuestions: z.number().int(),
        preferVerifyNow: z.boolean(),
      })
      .nullable()
      .optional(),
  }),
  outputSchema: SessionIntentIssuedSchema,
  execute: async (input) => {
    const db = eiStore.db;
    const sessionId = crypto.randomUUID();
    const handler = new RunDeclaredIntentHandler(new PostgresAppendEventAdapter(db));
    return handler.execute({
      studentId: input.studentId,
      topicId: input.topicId,
      sessionId,
      timebox: input.timebox,
      taskType: input.taskType,
      energy: input.energy,
      sleepBucket: input.sleepBucket,
      verificationFloor: input.verificationFloor,
    });
  },
});
