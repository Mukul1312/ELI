/**
 * EI AppOpen workflow — branches on payload.initial.
 *
 * If initial: true → returns checkin view (no P1).
 * Else → runs router, then P1 or P2 workflow.
 *
 * Per composed-churning-orbit: all branching inside Mastra; route stays thin.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../ei/runtime/db';
import { PostgresQueryEventsAdapter } from '../../ei/infrastructure/persistence/query-events.pg';
import { ProtocolRouter } from '../../ei/application/ei-protocol-router';
import {
  type EiCommandWithStudent,
  type AppOpenPayload,
  isAppOpenFirstTouch,
  isAppOpenOnboarding,
  isAppOpenMicro,
} from '../../ei/application/ei-protocol-router';
import { SduiResponseSchema } from '../../ei/sdui/types/sdui-contract';
import { protocol1IgnitionWorkflow } from './protocol1-ignition';
import { protocol2ActivationWorkflow } from './protocol2-activation';
import { checkinViewWorkflow } from './checkin-view';
import { composeOnboardingResponseView } from '../../ei/sdui/view-composer';

const AppOpenWorkflowInput = z.object({
  command: z.object({
    commandType: z.literal('AppOpen'),
    payload: z.record(z.unknown()),
  }),
  studentId: z.string(),
  idempotencyKey: z.string().optional(),
  correlationId: z.string().optional(),
});

/** Output: either SduiResponse (checkin) or P1/P2 result */
const AppOpenWorkflowOutput = z.union([
  SduiResponseSchema,
  z.record(z.unknown()),
]);

const appOpenBranchStep = createStep({
  id: 'app-open-branch',
  inputSchema: AppOpenWorkflowInput,
  outputSchema: AppOpenWorkflowOutput,
  execute: async ({ inputData }): Promise<z.infer<typeof AppOpenWorkflowOutput>> => {
    const { command, studentId, idempotencyKey, correlationId } = inputData;
    const payload = command.payload;

    if (isAppOpenFirstTouch(payload as AppOpenPayload)) {
      const isFirstOfDay = (payload as { isFirstOfDay?: boolean }).isFirstOfDay ?? true;
      const checkinRun = await checkinViewWorkflow.createRun();
      return checkinRun.start({
        inputData: { studentId, isFirstOfDay, correlationId, idempotencyKey },
      });
    }

    if (isAppOpenOnboarding(payload as AppOpenPayload)) {
      const onboardingPayload = payload as { topic: string; taskType: string; subject?: string };
      const p1InputData = {
        studentId,
        topic: onboardingPayload.topic,
        energy: 3,
        sleepBucket: '7-8' as const,
        pressure: 1,
        backlogPressure: 1,
        idempotencyKey,
        correlationId,
      };
      const run = await protocol1IgnitionWorkflow.createRun();
      await run.start({ inputData: p1InputData });
      return composeOnboardingResponseView(onboardingPayload.topic, onboardingPayload.taskType);
    }

    if (isAppOpenMicro(payload as AppOpenPayload)) {
      const microPayload = payload as {
        topic: string;
        energy: number;
        sleepBucket?: '<6' | '6-7' | '7-8' | '>=8';
        pressure?: number;
        backlogPressure?: number;
        openedAt?: string;
      };
      const p2InputData = {
        studentId,
        topic: microPayload.topic,
        setAt: new Date().toISOString(),
        taskType: 'micro', // Treat as micro task
        idempotencyKey,
        correlationId,
      };
      const run = await protocol2ActivationWorkflow.createRun();
      return run.start({ inputData: p2InputData });
    }

    const fullPayload = payload as {
      topic: string;
      energy: number;
      sleepBucket?: '<6' | '6-7' | '7-8' | '>=8';
      pressure?: number;
      backlogPressure?: number;
      openedAt?: string;
    };
    const commandWithStudent: EiCommandWithStudent = {
      commandType: 'AppOpen',
      payload: fullPayload,
      studentId,
    };

    const db = eiStore.db;
    const queryEvents = new PostgresQueryEventsAdapter(db);
    const router = new ProtocolRouter(queryEvents);
    const protocol = await router.decideProtocol(commandWithStudent);

    if (protocol === 1) {
      const p1InputData = {
        studentId,
        topic: fullPayload.topic,
        energy: fullPayload.energy,
        sleepBucket: (fullPayload.sleepBucket ?? '7-8') as '7-8' | '<6' | '6-7' | '>=8',
        pressure: fullPayload.pressure ?? 1,
        backlogPressure: fullPayload.backlogPressure ?? 1,
        openedAt: fullPayload.openedAt,
        idempotencyKey,
        correlationId,
      };
      const run = await protocol1IgnitionWorkflow.createRun();
      return run.start({ inputData: p1InputData });
    }

    if (protocol === 2) {
      const p2InputData = {
        studentId,
        topic: fullPayload.topic,
        setAt: new Date().toISOString(),
        taskType: undefined,
        idempotencyKey,
        correlationId,
      };
      const run = await protocol2ActivationWorkflow.createRun();
      return run.start({ inputData: p2InputData });
    }

    throw new Error(`AppOpen should not route to protocol ${protocol}`);
  },
});

export const eiAppOpenWorkflow = createWorkflow({
  id: 'ei-app-open',
  inputSchema: AppOpenWorkflowInput,
  outputSchema: AppOpenWorkflowOutput,
})
  .then(appOpenBranchStep)
  .commit();
