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

import { getDb } from '../../ei/runtime/db';
import type { EiDb } from '../../ei/runtime/db';
import { PostgresQueryEventsAdapter } from '../../ei/infrastructure/persistence/query-events.pg';
import {
  type AppOpenPayload,
  isAppOpenFirstTouch,
  isAppOpenOnboarding,
  isAppOpenMicro,
} from '../../ei/application/ei-protocol-router';
import { SduiResponseSchema } from '../../ei/sdui/types/sdui-contract';
import { protocol1IgnitionWorkflow } from './protocol1-ignition';
import { protocol2ActivationWorkflow } from './protocol2-activation';
import { checkinViewWorkflow } from './checkin-view';
import { sessionStartWorkflow } from './session-start';
import { composeOnboardingResponseView, composeSessionView, composeP1View, composeP3View, FIRST_ACTION_BY_TASK, FIRST_ACTION_DEFAULT } from '../../ei/sdui/view-composer';
import { buildP1PresentationContext } from '../../ei/sdui/presentation-context';
import type { SessionIntentIssuedOutput } from '../../ei/schemas/outputs';
import type { StateTrend } from '../../ei/domain/student-aggregates/student-aggregates';
import { PostgresAppendEventAdapter } from '../../ei/infrastructure/persistence/append-event.pg';
import { RunDeclaredIntentHandler } from '../../ei/application/run-declared-intent/handler';
import { PostgresGetStudentSignalsAdapter } from '../../ei/infrastructure/persistence/get-student-signals.pg';
import { AssessLoopHealthHandler } from '../../ei/application/assess-loop-health/handler';
import { RunP2GateHandler } from '../../ei/application/run-p2-gate/handler';
import { PostgresStudySessionRepository } from '../../ei/infrastructure/persistence/study-session-repository.pg';
import { ProtocolEngine } from '../../ei/domain/study-session/protocol-engine';
import type { SessionTaskType } from '../../ei/schemas/events';
import type { SleepBucket } from '../../ei/engine/score';
import * as Q from '../../ei/db/queries';
import { createResolveTopicUseCase } from '../../lib/curriculum-catalog';
import { getTopicDisplayName } from '../../ei/sdui/topic-display-name';

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

/** Map free-form payload taskType strings to the SessionTaskType enum values. */
function mapToSessionTaskType(raw: string): SessionTaskType {
  const normalized = raw.toLowerCase();
  if (normalized === 'test') return 'Test';
  if (normalized === 'learn') return 'Learn';
  return 'Practice';
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
      // ADR-004 D3: Derive session phase from projection column instead of 50-event scan.
      // Single indexed read (~50ms) replaces 9-type, 50-event Ledger scan (~600ms).
      const db = getDb();
      const activeSession = await Q.getActiveSessionForStudent(db, studentId);

      if (activeSession?.current_session_id) {
        const { topic_id: topicId, topic_name: topicName, session_phase: sessionPhase, current_session_id: sessionId } = activeSession;

        // ── Active session resume: student is mid-session ──
        if (sessionPhase === 'active') {
          const activationEvent = await Q.getEventBySessionId(db, sessionId, 'ActivationPlanIssued');
          if (activationEvent) {
            const ap = activationEvent.payload;
            const mode = (ap.mode as 'Rescue' | 'Neutral' | 'Boost') ?? 'Neutral';
            const playId = (ap.playId as string) ?? 'P2-N1';
            const rawStartedAt = activeSession.last_session_started_at
              ?? activationEvent.occurred_at;
            const sessionStartedAt = rawStartedAt instanceof Date
              ? rawStartedAt.toISOString()
              : String(rawStartedAt);
            const resumeTaskType = (ap.taskType as string) ?? undefined;
            const firstActionText = (resumeTaskType ? FIRST_ACTION_BY_TASK[resumeTaskType] : undefined)
              ?? FIRST_ACTION_DEFAULT;
            return composeSessionView({ topic: topicId, topicName: topicName ?? undefined, mode, playId, taskType: resumeTaskType, firstActionText, sessionStartedAt });
          }
          // Defensive: projection says active but no ActivationPlanIssued found → fall through to checkin
        }

        // ── Phase 3 resume: verification decision issued, awaiting student action ──
        if (sessionPhase === 'verifying') {
          const vdEvent = await Q.getEventBySessionId(db, sessionId, 'VerificationDecisionIssued');
          if (vdEvent) {
            const p = vdEvent.payload;
            const output = {
              studentId,
              mode: (p.mode as 'Rescue' | 'Neutral' | 'Boost') ?? 'Neutral',
              playId: (p.playId as string) ?? 'P2-N1',
              topic: topicId,
              topicName: topicName ?? undefined,
              verificationDecision: (p.verificationDecision as 'VerifyNow' | 'ScheduleVerify' | 'Skip') ?? 'VerifyNow',
              verificationSpec: p.verificationSpec as any,
              deadlineSpec: p.deadlineSpec as any,
              reason: p.reason as string | undefined,
              sessionDurationSec: (p.sessionDurationSec as number) ?? undefined,
              dropoutSignalActive: (p.dropoutSignalActive as boolean) ?? false,
              issuedAt: vdEvent.occurred_at.toISOString(),
            };
            return composeP3View(
              output,
              output.sessionDurationSec,
              output.dropoutSignalActive,
            );
          }
          // Defensive: projection says verifying but no VerificationDecisionIssued → fall through
        }

        // ── Intent phase resume: negotiated intent awaiting student acceptance ──
        if (sessionPhase === 'activating') {
          const intentEvent = await Q.getEventBySessionId(db, sessionId, 'SessionIntentIssued');
          // Only negotiated sessions show a plan screen; declared sessions go direct to session.
          if (intentEvent && intentEvent.payload?.intentSource === 'negotiated') {
            const intentTopicId = topicId;
            // Load aggregates + event counts for PresentationContext.
            const [aggregates, eventCounts, lastEnergy] = await Promise.all([
              Q.getAggregates(db, studentId),
              Q.countStudentEventsLast7d(db, studentId),
              Q.getLastAppOpenEnergy(db, studentId),
            ]);

            // Resume: reconstruct P1 view from stored SessionIntentIssued event payload (flat shape).
            // Backward compat: old events have nested scope/verificationPlan; new events have flat fields.
            const p = intentEvent.payload;
            const resolvedTopicName = topicName ?? (p.topicName as string) ?? undefined;
            const resumeVerificationFloor = p.verificationFloor
              ? p.verificationFloor as { minQuestions: number; preferVerifyNow: boolean }
              : p.verificationPlan
                ? { minQuestions: (p.verificationPlan as any).minQuestions ?? 1, preferVerifyNow: (p.verificationPlan as any).preferVerifyNow ?? false }
                : null;
            const intentOutput: SessionIntentIssuedOutput = {
              studentId,
              topicId: intentTopicId,
              intentSource: (p.intentSource as 'negotiated' | 'declared') ?? 'negotiated',
              timebox: (p.timebox as number) ?? (p.scope as any)?.timeboxMin ?? 30,
              taskType: (p.taskType as SessionTaskType) ?? 'Practice',
              energy: (p.energy as number) ?? 3,
              sleepBucket: (p.sleepBucket as SleepBucket) ?? '7-8',
              issuedAt: intentEvent.occurred_at.toISOString(),
              topic: intentTopicId,
              topicName: resolvedTopicName,
              mode: (p.mode as 'Rescue' | 'Neutral' | 'Boost' | null) ?? 'Neutral',
              playId: (p.playId as string | null) ?? null,
              verificationFloor: resumeVerificationFloor,
              constraints: (p.constraints as { closeOpenLoopFirst?: boolean; noNewTopicUntil?: string } | null) ?? null,
              stateScore: (p.stateScore as number | null) ?? null,
              questionCount: (p.questionCount as number | null) ?? (p.scope as any)?.questionCount ?? null,
              difficultyTier: (p.difficultyTier as 'easy' | 'med' | 'hard' | 'advanced' | null) ?? (p.scope as any)?.difficultyTier ?? null,
              sessionIntentId: (p.sessionIntentId as string | null) ?? (p.negotiatedIntentId as string | null) ?? null,
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
          // Declared intent in activating phase is transient → fall through to checkin
        }
      }

      // No active session → show checkin view
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
        : await resolveTopicSafe(getDb(), onboardingPayload.topic, studentId);
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
        : await resolveTopicSafe(getDb(), microPayload.topic, studentId);
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
      taskType?: string;
      timebox?: number;
    };
    const db = getDb();
    const topicRef = fullPayload.topicId
      ? { topicId: fullPayload.topicId, topicName: fullPayload.topicName ?? fullPayload.topic }
      : await resolveTopicSafe(db, fullPayload.topic, studentId);

    // ── Declared-intent path: student declares own intent (no ELI negotiation) ──
    // RunDeclaredIntentHandler → SessionIntentIssued(declared): negotiating → activating
    // RunP2GateHandler → ActivationPlanIssued: activating → active (required per aggregate lifecycle)
    // Student skips P1/P2 gate UI but P2 domain logic always runs (ADR-001, ei-runtime-tactical-spec §6).
    if (fullPayload.taskType) {
      const sessionId = crypto.randomUUID();
      const appendEventAdapter = new PostgresAppendEventAdapter(db);
      const declaredIntentHandler = new RunDeclaredIntentHandler(appendEventAdapter);

      const intentOutput = await declaredIntentHandler.execute({
        studentId,
        topicId: topicRef.topicId,
        sessionId,
        timebox: fullPayload.timebox ?? 30,
        taskType: mapToSessionTaskType(fullPayload.taskType),
        energy: fullPayload.energy ?? 3,
        sleepBucket: (fullPayload.sleepBucket ?? '7-8') as SleepBucket,
      });

      // P2 gate: compute real mode via LoopHealth + emit ActivationPlanIssued.
      const signalsPort = new PostgresGetStudentSignalsAdapter(db);
      const p2Handler = new RunP2GateHandler(
        signalsPort,
        new AssessLoopHealthHandler(signalsPort, { now: () => new Date() }),
        appendEventAdapter,
        new PostgresQueryEventsAdapter(db),
        new ProtocolEngine(),
        new PostgresStudySessionRepository(db),
      );
      const p2Output = await p2Handler.execute({
        studentId,
        topicId: topicRef.topicId,
        sessionId,
        setAt: intentOutput.issuedAt,
      });

      // Persist last task type for pre-selection (formation-period feature)
      await Q.upsertTopicState(db, studentId, topicRef.topicId, { last_task_type: fullPayload.taskType });
      const run = await sessionStartWorkflow.createRun();
      const sessionResult = await run.start({
        inputData: {
          studentId,
          topic: topicRef.topicId,
          topicName: topicRef.topicName,
          mode: p2Output.mode,
          taskType: fullPayload.taskType,
          timebox: fullPayload.timebox,
          idempotencyKey,
          correlationId,
        },
      });
      return sessionResult;
    }

    // ADR-004 D3: Route via projection column instead of ProtocolRouter event scan.
    const topicState = await Q.getTopicState(db, studentId, topicRef.topicId);
    const sessionPhase = topicState?.session_phase;

    if (sessionPhase === 'activating' || sessionPhase === 'active') {
      // Intent exists for this topic → resume via P2
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

    // No active session for this topic → fresh P1
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
  },
});

export const eiAppOpenWorkflow = createWorkflow({
  id: 'ei-app-open',
  inputSchema: AppOpenWorkflowInput,
  outputSchema: AppOpenWorkflowOutput,
})
  .then(appOpenBranchStep)
  .commit();
