/**
 * EI AppOpen workflow — branches on payload.initial.
 *
 * If initial: true → returns checkin view (no P1).
 * Else → SelectFlow → FlowExecutor → route result to view/workflow.
 *
 * Per ADR-005 §M4: old branches removed. FlowExecutor is the only path.
 * Per ADR-005 §C11: resume detection runs before flow selection (cross-topic).
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { getDb } from '../../ei/runtime/db';
import type { EiDb } from '../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import {
  type AppOpenPayload,
  isAppOpenFirstTouch,
  isAppOpenOnboarding,
  isAppOpenMicro,
} from '../../ei/application/ei-protocol-router';
import { SduiResponseSchema } from '../../ei/study-session-orchestration/types/sdui-contract';
import { executeComposeP1View } from './steps/compose-p1-view';
import { checkinViewWorkflow } from './checkin-view';
import { sessionStartWorkflow } from './session-start';
import { composeOnboardingResponseView } from '../../ei/study-session-orchestration/domain/services/view-composer';
import * as Q from '../../ei/db/queries';
import { createResolveTopicUseCase } from '../../lib/curriculum-catalog';
import { getTopicDisplayName } from '../../ei/study-session-orchestration/domain/services/topic-display-name';
import { DetectResumeHandler } from '../../ei/study-session-orchestration/application/detect-resume/handler';
import { PostgresActiveSessionQueryAdapter } from '../../ei/infrastructure/persistence/active-session-query.pg';
import { PostgresQueryEventsAdapter } from '../../ei/infrastructure/persistence/query-events.pg';
import { PostgresGetStudentSignalsAdapter } from '../../ei/infrastructure/persistence/get-student-signals.pg';
import { SelectFlowHandler } from '../../ei/study-session-orchestration/application/select-flow/handler';
import { FlowExecutor } from '../../ei/study-session-orchestration/application/execute-flow/handler';
import { PostgresStudentAggregatesQueryAdapter } from '../../ei/infrastructure/persistence/student-aggregates-query.pg';
import { PostgresStudentPolicyQueryAdapter } from '../../ei/infrastructure/persistence/student-policy-query.pg';
import { PostgresSsoEventAppenderAdapter } from '../../ei/infrastructure/persistence/sso-event-appender.pg';
import {
  createDeclaredIntentHandler,
  createP1GateHandler,
  createP2GateHandler,
} from '../../ei/infrastructure/handler-factories';

/** Resolve raw topic text via CurriculumCatalog. Never blocks — falls back to raw string on error. */
async function resolveTopicSafe(
  db: EiDb,
  rawText: string,
  studentId: string,
): Promise<{ topicId: string; topicName: string }> {
  try {
    const ref = await createResolveTopicUseCase(db).execute({ rawText, studentId });
    return { topicId: ref.topicId, topicName: ref.topicName };
  } catch {
    return { topicId: rawText, topicName: getTopicDisplayName(rawText) };
  }
}

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

    // ── 0. First touch: resume detection → checkin view ──
    if (isAppOpenFirstTouch(payload as AppOpenPayload)) {
      const db = getDb();
      const detectResumeHandler = new DetectResumeHandler(
        new PostgresActiveSessionQueryAdapter(db),
        new PostgresQueryEventsAdapter(db),
        new PostgresGetStudentSignalsAdapter(db),
      );
      const resumeResult = await detectResumeHandler.execute({ studentId });
      if (resumeResult.resumed) return resumeResult.response;

      const isFirstOfDay = (payload as { isFirstOfDay?: boolean }).isFirstOfDay ?? true;
      const checkinRun = await checkinViewWorkflow.createRun();
      return checkinRun.start({
        inputData: { studentId, isFirstOfDay, correlationId, idempotencyKey },
      });
    }

    // ── 1. Topic resolution (ADR-005 §C14: stays in Mastra) ──
    const db = getDb();
    const fullPayload = payload as {
      topic: string;
      topicId?: string;
      topicName?: string;
      energy: number;
      sleepBucket?: '<6' | '6-7' | '7-8' | '>=8';
      openedAt?: string;
      taskType?: string;
      timebox?: number;
    };
    const topicRef = fullPayload.topicId
      ? { topicId: fullPayload.topicId, topicName: fullPayload.topicName ?? fullPayload.topic }
      : await resolveTopicSafe(db, fullPayload.topic, studentId);

    // ── 2. SelectFlow: SSO domain decides template ──
    const sessionId = crypto.randomUUID();
    const selectFlowHandler = new SelectFlowHandler(
      new PostgresStudentAggregatesQueryAdapter(db),
      new PostgresStudentPolicyQueryAdapter(db),
      new PostgresSsoEventAppenderAdapter(db),
    );
    const { template } = await selectFlowHandler.execute({
      studentId,
      topicId: topicRef.topicId,
      taskType: fullPayload.taskType,
      isOnboarding: isAppOpenOnboarding(payload as AppOpenPayload),
      isMicro: isAppOpenMicro(payload as AppOpenPayload),
      sessionId,
      idempotencyKey,
    });

    // ── 3. FlowExecutor: walk template phases via gate handler ports ──
    const flowExecutor = new FlowExecutor(
      createDeclaredIntentHandler(db, idempotencyKey),
      createP1GateHandler(db, idempotencyKey),
      createP2GateHandler(db, idempotencyKey),
    );
    const flowResult = await flowExecutor.execute(template, {
      studentId,
      topicId: topicRef.topicId,
      topicName: topicRef.topicName,
      sessionId,
      timebox: fullPayload.timebox,
      taskType: fullPayload.taskType,
      energy: fullPayload.energy,
      sleepBucket: fullPayload.sleepBucket,
      idempotencyKey,
      correlationId,
    });

    // ── 4. Route result to view/workflow (ADR-005 §C14/C16: stays in Mastra) ──
    switch (flowResult.kind) {
      case 'declared':
      case 'onboarding': {
        if (fullPayload.taskType) {
          await Q.upsertTopicState(db, studentId, topicRef.topicId, { last_task_type: fullPayload.taskType });
        }
        if (flowResult.kind === 'onboarding') {
          const sduiResult = composeOnboardingResponseView(topicRef.topicId, fullPayload.taskType ?? 'Practice', topicRef.topicName);
          // Emit ViewComposed — PresentationTrace observability (ops-observability-tactical-spec §12).
          await new PostgresAppendEventAdapter(db).append({
            studentId,
            eventType: 'ViewComposed',
            topicId: topicRef.topicId,
            payload: { studentId, correlationId, phase: 'p2', composedAt: new Date().toISOString() },
          });
          return sduiResult;
        }
        const run = await sessionStartWorkflow.createRun();
        return run.start({
          inputData: {
            studentId,
            topic: topicRef.topicId,
            topicName: topicRef.topicName,
            mode: flowResult.p2Output.mode,
            taskType: fullPayload.taskType,
            timebox: fullPayload.timebox,
            idempotencyKey,
            correlationId,
          },
        });
      }
      case 'negotiated': {
        // Per ADR-005 §Execution Model: FlowExecutor already ran P1.
        // Load aggregates (same as protocol1IgnitionWorkflow's .map() step) and compose view directly.
        const [aggregates, topicStates, checkinCtx, historicalIndicators] = await Promise.all([
          Q.getAggregates(db, studentId),
          Q.getAllTopicStates(db, studentId),
          Q.getCheckinEventContext(db, studentId),
          Q.getHistoricalIdentityIndicators(db, studentId),
        ]);
        return executeComposeP1View({
          domainOutput: { ...flowResult.p1Output, topicName: topicRef.topicName },
          workflowInput: { energy: fullPayload.energy },
          aggregates: aggregates ?? null,
          topicStates,
          sessionsLast7d: checkinCtx.sessionsLast7d,
          loopsClosedLast7d: checkinCtx.loopsClosedLast7d,
          sessionsTotal: checkinCtx.sessionsTotal,
          hasPriorOpen: checkinCtx.hasPriorOpen,
          lastIdentityShownAt: checkinCtx.lastIdentityShownAt,
          historicalIndicators,
          correlationId,
        });
      }
      case 'micro': {
        const run = await sessionStartWorkflow.createRun();
        return run.start({
          inputData: {
            studentId,
            topic: topicRef.topicId,
            topicName: topicRef.topicName,
            mode: flowResult.p2Output.mode,
            taskType: 'micro',
            timebox: fullPayload.timebox,
            idempotencyKey,
            correlationId,
          },
        });
      }
    }
  },
});

export const eiAppOpenWorkflow = createWorkflow({
  id: 'ei-app-open',
  inputSchema: AppOpenWorkflowInput,
  outputSchema: AppOpenWorkflowOutput,
})
  .then(appOpenBranchStep)
  .commit();
