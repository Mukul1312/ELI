/**
 * IntentResponse workflow — records P1 accept/reject decision, then chains to P2 or checkin.
 *
 * Per plan Gap 1: IntentResponse command appends event to Ledger, then:
 * - accepted/edited → run P2 (protocol2ActivationWorkflow)
 * - rejected/ignored → return checkin view
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { getDb } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter, withIdempotencyKey } from '../../ei/infrastructure/persistence/append-event.pg';
import { SduiResponseSchema } from '../../ei/study-session-orchestration/types/sdui-contract';
import { protocol2ActivationWorkflow } from './protocol2-activation';
import { checkinViewWorkflow } from './checkin-view';

const IntentResponseInput = z.object({
  studentId: z.string(),
  negotiatedIntentId: z.string(),
  decision: z.enum(['accepted', 'rejected', 'edited', 'ignored']),
  respondedAt: z.string().datetime(),
  topic: z.string().optional(),
  topicName: z.string().optional(),
  taskType: z.string().optional(),
  difficultyTier: z.union([z.number(), z.string()]).optional(),
  setAt: z.string().datetime().optional(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

const IntentResponseOutput = z.union([SduiResponseSchema, z.record(z.unknown())]);

const intentResponseStep = createStep({
  id: 'intent-response',
  inputSchema: IntentResponseInput,
  outputSchema: IntentResponseOutput,
  execute: async ({ inputData }): Promise<z.infer<typeof IntentResponseOutput>> => {
    const {
      studentId,
      negotiatedIntentId,
      decision,
      respondedAt,
      topic,
      topicName,
      taskType,
      setAt,
      idempotencyKey,
    } = inputData;

    const db = getDb();
    const baseAdapter = new PostgresAppendEventAdapter(db);
    const appendEvent = idempotencyKey
      ? withIdempotencyKey(baseAdapter, idempotencyKey)
      : baseAdapter;

    await appendEvent.append({
      studentId,
      eventType: 'IntentResponse',
      topicId: null,
      payload: {
        studentId,
        negotiatedIntentId,
        decision,
        respondedAt,
      },
    });

    if (decision === 'accepted' || decision === 'edited') {
      if (!topic) {
        throw new Error('IntentResponse with decision accepted/edited requires topic');
      }
      const p2Run = await protocol2ActivationWorkflow.createRun();
      return p2Run.start({
        inputData: {
          studentId,
          topic,
          topicName,
          taskType,
          setAt: setAt ?? respondedAt,
          idempotencyKey,
        },
      });
    }

    const checkinRun = await checkinViewWorkflow.createRun();
    return checkinRun.start({
      inputData: { studentId, isFirstOfDay: true },
    });
  },
});

export const intentResponseWorkflow = createWorkflow({
  id: 'ei-intent-response',
  inputSchema: IntentResponseInput,
  outputSchema: IntentResponseOutput,
})
  .then(intentResponseStep)
  .commit();
