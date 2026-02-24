/**
 * RunP3GateHandler — orchestrates the P3 Verification gate.
 *
 * Load data (ports) → cross-protocol extraction → domain pipeline
 * → StudySession.issueVerificationDecision() → pull events → append to Ledger → return output.
 *
 * Per ei-runtime-tactical-spec.md §9 (Use Cases).
 */

import type { RunP3GateCommand } from './command';
import type { IRunP3GateUseCase } from './port';
import type { VerificationDecisionIssuedOutput } from '../../schemas/outputs';
import type { IGetStudentSignalsPort } from '../assess-loop-health/port';
import type { IAssessLoopHealthUseCase } from '../assess-loop-health/port';
import type { IAppendEventPort } from '../shared/port-append-event';
import type { IQueryEventsPort } from '../shared/port-query-events';
import type { IProtocolEngine } from '../../domain/study-session/protocol-engine';
import type { StudentAggregates } from '../../domain/loop-health/assess-loop-health';
import type { IStudySessionRepository } from '../../domain/study-session/repository';

import { StudySession } from '../../domain/study-session/study-session';
import { P3GateContext } from '../../domain/study-session/value-objects/gate-context';
import {
  computeTightnessLevel,
  getP3Escalation,
} from '../../engine/escalation';
import {
  findP1VerificationFloorFromEvents,
  findP2WatchOnlyFlagFromEvents,
} from './cross-protocol-read';
import type { StoredEvent } from './cross-protocol-read';
import type { PlayContext } from '../../engine/plays';

export class RunP3GateHandler implements IRunP3GateUseCase {
  constructor(
    private readonly signalsPort: IGetStudentSignalsPort,
    private readonly assessLoopHealth: IAssessLoopHealthUseCase,
    private readonly appendEvent: IAppendEventPort,
    private readonly queryEvents: IQueryEventsPort,
    private readonly protocolEngine: IProtocolEngine,
    private readonly sessionRepo?: IStudySessionRepository,
  ) {}

  async execute(command: RunP3GateCommand): Promise<VerificationDecisionIssuedOutput> {
    const { studentId, topicId, sessionId, endedAt } = command;

    // ── 1. Load student signals (aggregates + policy) ────────────────────────
    const signals = await this.signalsPort.getSignals(studentId);
    const aggregates: StudentAggregates = signals?.aggregates ?? {
      pendingChecks: 0,
      openLoops: 0,
      verificationRate7d: 1,
      scheduleMisses7d: 0,
      avoidantExits7d: 0,
      skipCount7d: 0,
      silenceDays: 0,
      replanLoopCount7d: 0,
      stateTrend7d: 'flat',
    };
    const policy = signals?.policy ?? {};

    // ── 2. Load cross-protocol session events ────────────────────────────────
    const rawEvents = await this.queryEvents.queryEvents(studentId, {
      eventTypes: [
        'NegotiatedIntentIssued', 'ActivationPlanIssued',
        'RetrievalVerified', 'RetrievalScheduled', 'VerificationCompleted',
      ],
      topicId,
      limit: 20,
    });

    const storedEvents: StoredEvent[] = rawEvents.map(e => ({
      id: e.id,
      eventType: e.eventType,
      topicId: e.topicId ?? undefined,
      payload: e.payload,
      occurredAt: e.occurredAt,
    }));

    // ── 3. Extract cross-protocol constraints ────────────────────────────────
    const p1VerificationFloor = findP1VerificationFloorFromEvents(storedEvents);
    const p2WatchOnlyFlag = findP2WatchOnlyFlagFromEvents(storedEvents);
    const hasRetrieval = storedEvents.some(e => e.eventType === 'RetrievalVerified');
    const hasSchedule = storedEvents.some(e => e.eventType === 'RetrievalScheduled');

    // ── 4. Assess loop health (mode) ─────────────────────────────────────────
    const p3LhaContext = { hasRetrieval, hasSchedule };
    const snapshot = await this.assessLoopHealth.execute({
      studentId,
      gatePhase: 'P3',
      gateContext: p3LhaContext,
      aggregates,
      policy,
    });
    const mode = snapshot.mode;

    // ── 5. Compute escalation context ────────────────────────────────────────
    const tightnessLevel = computeTightnessLevel(aggregates);
    const p3Escalation = getP3Escalation(aggregates);

    // ── 6. Build PlayContext and select play ─────────────────────────────────
    const playContext: PlayContext = {
      studentId,
      topicId,
      aggregates,
      tightnessLevel,
      p3Escalation,
      hasRetrieval,
      hasSchedule,
      loopLatencyTrend: aggregates.loopLatencyTrend,
    };
    const play = this.protocolEngine.selectPlay(3, mode, playContext);

    // ── 7. Build P3GateContext VO (carries cross-protocol constraints) ────────
    const gateCtx = P3GateContext.create({
      studentId,
      topicId,
      hasRetrieval,
      hasSchedule,
      skipReason: null,
      energy: 3, // energy not re-collected at P3; use neutral default
      openLoops: aggregates.openLoops,
      skipCount7d: aggregates.skipCount7d,
      verificationRate7d: aggregates.verificationRate7d,
      stateTrend7d: aggregates.stateTrend7d,
      tightnessLevel,
      p3Escalation,
      p1VerificationFloor,
      p2WatchOnlyFlag,
    });

    // ── 8. Drive StudySession aggregate ─────────────────────────────────────
    // Reconstitute in 'active' state (P1 and P2 have been run)
    const session = StudySession.reconstitute(sessionId, studentId, topicId, 'active', null, null, null);
    session.issueVerificationDecision(play, gateCtx, policy);

    // ── 9. Pull domain events + build output ─────────────────────────────────
    const domainEvents = session.pullDomainEvents();
    const verificationDecision = session.verificationDecision!;

    const output: VerificationDecisionIssuedOutput = {
      studentId,
      mode: verificationDecision.mode,
      playId: verificationDecision.playId,
      topic: topicId,
      verificationDecision: verificationDecision.decision,
      verificationSpec: verificationDecision.verifyNow
        ? {
            minQuestions: verificationDecision.verifyNow.minQuestions,
            timeboxSec: verificationDecision.verifyNow.timeboxSec,
            difficultyTier: verificationDecision.verifyNow.difficultyTier,
            format: verificationDecision.verifyNow.format,
          }
        : undefined,
      deadlineSpec: verificationDecision.scheduleVerify
        ? {
            dueInHours: verificationDecision.scheduleVerify.dueInHours,
            graceHours: verificationDecision.scheduleVerify.graceHours,
            minQuestions: verificationDecision.scheduleVerify.minQuestions,
          }
        : undefined,
      reason: verificationDecision.skipReason,
      issuedAt: new Date().toISOString(),
    };

    // ── 10. Persist to Ledger ─────────────────────────────────────────────────
    for (const event of domainEvents) {
      await this.appendEvent.append({
        studentId,
        eventType: event.eventType,
        topicId,
        payload: event.payload,
      });
    }

    // ── 11. Persist session status transition (active → verifying) ────────────
    if (this.sessionRepo) {
      await this.sessionRepo.save(session);
    }

    return output;
  }
}
