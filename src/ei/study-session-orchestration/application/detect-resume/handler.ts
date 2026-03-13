/**
 * DetectResumeHandler — extracts the 3 resume detection branches from appOpenBranchStep.
 *
 * Per ADR-005 §C3: handler is application-layer (needs I/O), not domain.
 * ViewComposer calls inside the handler are pure — no layer violation.
 * Handler owns all 3 branches (not 3 separate handlers) — polymorphism is internal.
 *
 * Per canvas R1.3: "read-side query against projections, no domain concepts"
 * Per ADR-005 §C5: No staleness recompute — event-sourced data (guaranteed fresh)
 *   + projection data (acceptably stale for display).
 */

import type { IActiveSessionQuery } from '../shared/port-active-session-query';
import type { IQueryEventsPort } from '../../../application/shared/port-query-events';
import type { IGetStudentSignalsPort } from '../../../application/assess-loop-health/port';
import type { DetectResumeQuery } from './query';
import type { ResumeDetectionResult } from './port';
import type { StateTrend } from '../../../domain/student-aggregates/student-aggregates';
import type { AggregatesForPresentation } from '../../domain/types/aggregates-for-presentation';
import { composeSessionView, composeP1View, composeP3View, FIRST_ACTION_BY_TASK, FIRST_ACTION_DEFAULT } from '../../domain/services/view-composer';
import { buildP1PresentationContext } from '../../domain/value-objects/presentation-context';
import { reconstructSessionIntentFromPayload } from './reconstruct-session-intent';

export class DetectResumeHandler {
  constructor(
    private readonly activeSessionQuery: IActiveSessionQuery,
    private readonly eventQuery: IQueryEventsPort,
    private readonly signalsPort: IGetStudentSignalsPort,
  ) {}

  async execute(query: DetectResumeQuery): Promise<ResumeDetectionResult> {
    const { studentId } = query;

    // 1. Check for active session via projection (ADR-003 D1)
    const activeSession = await this.activeSessionQuery.getActiveSession(studentId);

    if (!activeSession?.currentSessionId) {
      return { resumed: false };
    }

    const { topicId, topicName, sessionPhase, currentSessionId: sessionId, lastSessionStartedAt } =
      activeSession;

    // 2. Switch on sessionPhase (ADR-003 column)

    // ── Active session resume: student is mid-session ──
    if (sessionPhase === 'active') {
      return this.resumeActiveSession(sessionId, topicId, topicName, lastSessionStartedAt);
    }

    // ── Phase 3 resume: verification decision issued, awaiting student action ──
    if (sessionPhase === 'verifying') {
      return this.resumeVerifyingSession(studentId, sessionId, topicId, topicName);
    }

    // ── Intent phase resume: negotiated intent awaiting student acceptance ──
    if (sessionPhase === 'activating') {
      return this.resumeActivatingSession(studentId, sessionId, topicId, topicName);
    }

    // Unknown phase → no resume
    return { resumed: false };
  }

  /**
   * Active session (P2 resume) — load ActivationPlanIssued, compose session view.
   */
  private async resumeActiveSession(
    sessionId: string,
    topicId: string,
    topicName: string | null,
    lastSessionStartedAt: Date | null,
  ): Promise<ResumeDetectionResult> {
    const activationEvent = await this.eventQuery.queryBySessionId(
      sessionId,
      'ActivationPlanIssued',
    );

    if (!activationEvent) {
      // Defensive: projection says active but no ActivationPlanIssued found → fall through
      return { resumed: false };
    }

    const ap = activationEvent.payload;
    const mode = (ap.mode as 'Rescue' | 'Neutral' | 'Boost') ?? 'Neutral';
    const playId = (ap.playId as string) ?? 'P2-N1';
    const rawStartedAt = lastSessionStartedAt ?? activationEvent.occurredAt;
    const sessionStartedAt =
      rawStartedAt instanceof Date ? rawStartedAt.toISOString() : String(rawStartedAt);
    const resumeTaskType = (ap.taskType as string) ?? undefined;
    const firstActionText =
      (resumeTaskType ? FIRST_ACTION_BY_TASK[resumeTaskType] : undefined) ?? FIRST_ACTION_DEFAULT;

    const response = composeSessionView({
      topic: topicId,
      topicName: topicName ?? undefined,
      mode,
      playId,
      taskType: resumeTaskType,
      firstActionText,
      sessionStartedAt,
    });

    return { resumed: true, response };
  }

  /**
   * Verifying session (P3 resume) — load VerificationDecisionIssued, compose P3 view.
   */
  private async resumeVerifyingSession(
    studentId: string,
    sessionId: string,
    topicId: string,
    topicName: string | null,
  ): Promise<ResumeDetectionResult> {
    const vdEvent = await this.eventQuery.queryBySessionId(
      sessionId,
      'VerificationDecisionIssued',
    );

    if (!vdEvent) {
      // Defensive: projection says verifying but no VerificationDecisionIssued → fall through
      return { resumed: false };
    }

    const p = vdEvent.payload;
    const output = {
      studentId,
      mode: (p.mode as 'Rescue' | 'Neutral' | 'Boost') ?? 'Neutral',
      playId: (p.playId as string) ?? 'P2-N1',
      topic: topicId,
      topicName: topicName ?? undefined,
      verificationDecision:
        (p.verificationDecision as 'VerifyNow' | 'ScheduleVerify' | 'Skip') ?? 'VerifyNow',
      verificationSpec: p.verificationSpec as any,
      deadlineSpec: p.deadlineSpec as any,
      reason: p.reason as string | undefined,
      sessionDurationSec: (p.sessionDurationSec as number) ?? undefined,
      dropoutSignalActive: (p.dropoutSignalActive as boolean) ?? false,
      issuedAt: vdEvent.occurredAt.toISOString(),
    };

    const response = composeP3View(output, output.sessionDurationSec, output.dropoutSignalActive);

    return { resumed: true, response };
  }

  /**
   * Activating session (P1 resume) — only negotiated sessions show P1 resume view.
   * Declared sessions in activating phase are transient → fall through (ADR-005 §C3).
   */
  private async resumeActivatingSession(
    studentId: string,
    sessionId: string,
    topicId: string,
    topicName: string | null,
  ): Promise<ResumeDetectionResult> {
    const intentEvent = await this.eventQuery.queryBySessionId(
      sessionId,
      'SessionIntentIssued',
    );

    // Only negotiated sessions show a plan screen; declared sessions go direct to session.
    if (!intentEvent || intentEvent.payload?.intentSource !== 'negotiated') {
      // Declared intent in activating phase is transient → fall through to checkin
      return { resumed: false };
    }

    // Load aggregates + event counts for PresentationContext (C3: P1 resume only)
    const [signals, eventCounts] = await Promise.all([
      this.signalsPort.getSignals(studentId),
      this.activeSessionQuery.getStudentEventCounts7d(studentId),
    ]);

    // Reconstruct SessionIntentIssuedOutput from stored event payload (C4)
    const resolvedTopicName = topicName ?? (intentEvent.payload.topicName as string) ?? undefined;
    const intentOutput = reconstructSessionIntentFromPayload(
      studentId,
      topicId,
      resolvedTopicName,
      intentEvent.payload,
      intentEvent.occurredAt,
    );

    // Map StudentAggregatesInput → AggregatesForPresentation
    const aggregatesForPresentation: AggregatesForPresentation | null = signals?.aggregates
      ? {
          pendingChecks: signals.aggregates.pendingChecks,
          silenceDays: signals.aggregates.silenceDays,
          verificationRate7d: signals.aggregates.verificationRate7d,
          stateTrend7d: signals.aggregates.stateTrend7d as StateTrend,
        }
      : null;

    const ctx = buildP1PresentationContext(
      {
        studentId,
        topic: topicId,
        mode: intentOutput.mode,
        playId: intentOutput.playId,
        stateScore: intentOutput.stateScore,
        constraints: intentOutput.constraints,
      },
      { energy: intentOutput.energy },
      aggregatesForPresentation,
      undefined, // topicSnapshots — not loaded for resume (display-only)
      eventCounts,
    );

    const response = composeP1View(intentOutput, ctx);

    return { resumed: true, response };
  }
}
