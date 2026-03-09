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
import { composeOnboardingResponseView, composeSessionView, composeP1View } from '../../ei/sdui/view-composer';
import { buildP1PresentationContext } from '../../ei/sdui/presentation-context';
import type { NegotiatedIntentIssuedOutput } from '../../ei/schemas/outputs';
import type { StateTrend } from '../../ei/domain/student-aggregates/student-aggregates';
import * as Q from '../../ei/db/queries';
import { createResolveTopicUseCase } from '../../lib/curriculum-catalog';
import { getTopicDisplayName } from '../../ei/sdui/topic-display-name';

/** Resolve raw topic text via CurriculumCatalog. Never blocks — falls back to raw string on error. */
async function resolveTopicSafe(
  db: typeof eiStore.db,
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

    if (isAppOpenFirstTouch(payload as AppOpenPayload)) {
      // Detect active session via Ledger (per spec §10: phase derivation is Ledger-driven).
      // A session is "active" if FirstActionStarted exists with no subsequent SessionEnd or
      // VerificationDecisionIssued for the same topic within the last 7 days.
      const db = eiStore.db;
      const queryEventsAdapter = new PostgresQueryEventsAdapter(db);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      // Per §10.2: derive session phase from Ledger evidence flags.
      // Query all protocol output events + terminal events for phase derivation.
      const recentEvents = await queryEventsAdapter.queryEvents(studentId, {
        eventTypes: [
          'NegotiatedIntentIssued', 'IntentResponse',
          'ActivationPlanIssued', 'FirstActionStarted',
          'SessionEnd', 'VerificationDecisionIssued', 'VerificationCompleted',
        ],
        since,
        limit: 50,
      });

      // Results are DESC by occurred_at — find() gives the most recent.
      const lastStarted = recentEvents.find(e => e.eventType === 'FirstActionStarted');
      if (lastStarted?.topicId) {
        const topicId = lastStarted.topicId;
        const sessionClosed = recentEvents.some(
          e =>
            (e.eventType === 'SessionEnd' || e.eventType === 'VerificationDecisionIssued') &&
            e.topicId === topicId &&
            e.occurredAt > lastStarted.occurredAt,
        );
        if (!sessionClosed) {
          const activationEvent = recentEvents.find(
            e => e.eventType === 'ActivationPlanIssued' && e.topicId === topicId,
          );
          const mode = (activationEvent?.payload?.mode as 'Rescue' | 'Neutral' | 'Boost') ?? 'Neutral';
          const playId = (activationEvent?.payload?.playId as string) ?? 'P2-N1';
          const sessionTopicName = await Q.getTopicName(db, studentId, topicId);
          return composeSessionView({ topic: topicId, topicName: sessionTopicName ?? undefined, mode, playId });
        }
      }

      // ── Intent phase resume (§10.2: Intent but no plan → activating) ────
      // Per routing matrix §10.3: AppOpen + Recent NegotiatedIntent → resume flow.
      // If NegotiatedIntentIssued exists without a subsequent IntentResponse,
      // ActivationPlanIssued, or SessionEnd → student was viewing "Your Plan" screen.
      const lastIntent = recentEvents.find(e => e.eventType === 'NegotiatedIntentIssued');
      if (lastIntent?.topicId) {
        const intentTopicId = lastIntent.topicId;
        const intentProgressed = recentEvents.some(
          e =>
            (e.eventType === 'IntentResponse' ||
              e.eventType === 'ActivationPlanIssued' ||
              e.eventType === 'SessionEnd') &&
            e.topicId === intentTopicId &&
            e.occurredAt > lastIntent.occurredAt,
        );
        if (!intentProgressed) {
          // Load aggregates + event counts for PresentationContext (same pattern as protocol1-ignition .map() step).
          const [aggregates, eventCounts, lastEnergy, intentTopicName] = await Promise.all([
            Q.getAggregates(db, studentId),
            Q.countStudentEventsLast7d(db, studentId),
            Q.getLastAppOpenEnergy(db, studentId),
            Q.getTopicName(db, studentId, intentTopicId),
          ]);

          // Resume: reconstruct P1 view from stored NegotiatedIntentIssued event payload.
          // Event payload uses `topicId`; NegotiatedIntentIssuedOutput uses `topic`.
          const p = lastIntent.payload;
          const resolvedTopicName = intentTopicName ?? (p.topicName as string) ?? undefined;
          const intentOutput: NegotiatedIntentIssuedOutput = {
            negotiatedIntentId: (p.negotiatedIntentId as string) ?? lastIntent.id,
            studentId,
            mode: (p.mode as 'Rescue' | 'Neutral' | 'Boost') ?? 'Neutral',
            playId: (p.playId as string) ?? 'P1-N1',
            topic: intentTopicId,
            topicName: resolvedTopicName,
            scope: p.scope as NegotiatedIntentIssuedOutput['scope'],
            verificationPlan: p.verificationPlan as NegotiatedIntentIssuedOutput['verificationPlan'],
            constraints: p.constraints as NegotiatedIntentIssuedOutput['constraints'],
            stateScore: (p.stateScore as number) ?? 0,
            issuedAt: lastIntent.occurredAt.toISOString(),
          };

          const aggregatesForPresentation = aggregates
            ? {
                pendingChecks: aggregates.pending_checks,
                silenceDays: aggregates.silence_days,
                verificationRate7d: aggregates.verification_rate_7d,
                stateTrend7d: aggregates.state_trend_7d as StateTrend,
              }
            : null;

          const ctx = buildP1PresentationContext(
            {
              studentId,
              topic: intentTopicId,
              mode: intentOutput.mode,
              playId: intentOutput.playId,
              stateScore: intentOutput.stateScore,
              constraints: intentOutput.constraints,
            },
            lastEnergy,
            aggregatesForPresentation,
            undefined,
            eventCounts,
          );

          return composeP1View(intentOutput, ctx);
        }
      }

      const isFirstOfDay = (payload as { isFirstOfDay?: boolean }).isFirstOfDay ?? true;
      const checkinRun = await checkinViewWorkflow.createRun();
      return checkinRun.start({
        inputData: { studentId, isFirstOfDay, correlationId, idempotencyKey },
      });
    }

    if (isAppOpenOnboarding(payload as AppOpenPayload)) {
      const onboardingPayload = payload as { topic: string; topicId?: string; topicName?: string; taskType: string; subject?: string };
      const topicRef = onboardingPayload.topicId
        ? { topicId: onboardingPayload.topicId, topicName: onboardingPayload.topicName ?? onboardingPayload.topic }
        : await resolveTopicSafe(eiStore.db, onboardingPayload.topic, studentId);
      const p1InputData = {
        studentId,
        topic: topicRef.topicId,
        topicName: topicRef.topicName,
        energy: 3,
        sleepBucket: '7-8' as const,
        idempotencyKey,
        correlationId,
      };
      const run = await protocol1IgnitionWorkflow.createRun();
      await run.start({ inputData: p1InputData });
      return composeOnboardingResponseView(topicRef.topicId, onboardingPayload.taskType, topicRef.topicName);
    }

    if (isAppOpenMicro(payload as AppOpenPayload)) {
      const microPayload = payload as {
        topic: string;
        topicId?: string;
        topicName?: string;
        energy: number;
        sleepBucket?: '<6' | '6-7' | '7-8' | '>=8';
        openedAt?: string;
      };
      const topicRef = microPayload.topicId
        ? { topicId: microPayload.topicId, topicName: microPayload.topicName ?? microPayload.topic }
        : await resolveTopicSafe(eiStore.db, microPayload.topic, studentId);
      const p2InputData = {
        studentId,
        topic: topicRef.topicId,
        topicName: topicRef.topicName,
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
      topicId?: string;
      topicName?: string;
      energy: number;
      sleepBucket?: '<6' | '6-7' | '7-8' | '>=8';
      openedAt?: string;
    };
    const commandWithStudent: EiCommandWithStudent = {
      commandType: 'AppOpen',
      payload: fullPayload,
      studentId,
    };

    const db = eiStore.db;
    const topicRef = fullPayload.topicId
      ? { topicId: fullPayload.topicId, topicName: fullPayload.topicName ?? fullPayload.topic }
      : await resolveTopicSafe(db, fullPayload.topic, studentId);
    const queryEvents = new PostgresQueryEventsAdapter(db);
    const router = new ProtocolRouter(queryEvents);
    const protocol = await router.decideProtocol(commandWithStudent);

    if (protocol === 1) {
      const p1InputData = {
        studentId,
        topic: topicRef.topicId,
        topicName: topicRef.topicName,
        energy: fullPayload.energy,
        sleepBucket: (fullPayload.sleepBucket ?? '7-8') as '7-8' | '<6' | '6-7' | '>=8',
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
        topic: topicRef.topicId,
        topicName: topicRef.topicName,
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
