/**
 * RunP2GateHandler — orchestrates the P2 Activation gate.
 *
 * Load data (ports) → domain pipeline → StudySession.issueActivationPlan()
 * → pull events → append to Ledger → return output.
 *
 * Per ei-runtime-tactical-spec.md §9 (Use Cases).
 */

import type { RunP2GateCommand } from './command';
import type { IRunP2GateUseCase } from './port';
import type { ActivationPlanIssuedOutput } from '../../schemas/outputs';
import type { IGetStudentSignalsPort } from '../assess-loop-health/port';
import type { IAssessLoopHealthUseCase } from '../assess-loop-health/port';
import type { IAppendEventPort } from '../shared/port-append-event';
import type { IQueryEventsPort } from '../shared/port-query-events';
import type { IProtocolEngine } from '../../domain/study-session/protocol-engine';
import type { StudentAggregates } from '../../domain/loop-health/assess-loop-health';

import { StudySession } from '../../domain/study-session/study-session';
import { P2GateContext } from '../../domain/study-session/value-objects/gate-context';
import {
  computeTightnessLevel,
  getP2Escalation,
} from '../../engine/escalation';
import type { PlayContext } from '../../engine/plays';

export class RunP2GateHandler implements IRunP2GateUseCase {
  constructor(
    private readonly signalsPort: IGetStudentSignalsPort,
    private readonly assessLoopHealth: IAssessLoopHealthUseCase,
    private readonly appendEvent: IAppendEventPort,
    private readonly queryEvents: IQueryEventsPort,
    private readonly protocolEngine: IProtocolEngine,
  ) {}

  async execute(command: RunP2GateCommand): Promise<ActivationPlanIssuedOutput> {
    const { studentId, topicId, sessionId, setAt } = command;
    const setAtDate = new Date(setAt);

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

    // ── 2. Load session events since IntentSet ───────────────────────────────
    const sessionEvents = await this.queryEvents.queryEvents(studentId, {
      eventTypes: ['Replan', 'FirstActionStarted', 'IntentSet'],
      topicId,
      since: setAtDate,
      limit: 50,
    });

    // ── 3. Compute session metrics ───────────────────────────────────────────
    const replanCount = sessionEvents.filter(e => e.eventType === 'Replan').length;
    const firstActionEvent = sessionEvents.find(e => e.eventType === 'FirstActionStarted');
    const hasStartSignal = !!firstActionEvent;
    let startLatencyMin: number | null = null;
    if (firstActionEvent) {
      startLatencyMin = (firstActionEvent.occurredAt.getTime() - setAtDate.getTime()) / 60_000;
    }

    // ── 4. Assess loop health (mode) ─────────────────────────────────────────
    const p2LhaContext = {
      replanCount,
      startLatencyMin: startLatencyMin ?? undefined,
      hasStartSignal,
      timeSinceIntentSet: (Date.now() - setAtDate.getTime()) / 60_000,
    };
    const snapshot = await this.assessLoopHealth.execute({
      studentId,
      gatePhase: 'P2',
      gateContext: p2LhaContext,
      aggregates,
      policy,
    });
    const mode = snapshot.mode;

    // ── 5. Compute escalation context ────────────────────────────────────────
    const tightnessLevel = computeTightnessLevel(aggregates);
    const p2Escalation = getP2Escalation(aggregates, 0, 0);

    // ── 6. Build PlayContext and select play ─────────────────────────────────
    const playContext: PlayContext = {
      studentId,
      topicId,
      aggregates,
      tightnessLevel,
      p2Escalation,
      replanCount,
      startLatencyMin: startLatencyMin ?? undefined,
      currentEnergy: undefined,
      currentPressure: undefined,
    };
    const play = this.protocolEngine.selectPlay(2, mode, playContext);

    // ── 7. Build P2GateContext VO ────────────────────────────────────────────
    const gateCtx = P2GateContext.create({
      studentId,
      topicId,
      replanCount,
      startLatencyMin,
      openLoops: aggregates.openLoops,
      verificationRate7d: aggregates.verificationRate7d,
      stateTrend7d: aggregates.stateTrend7d,
      tightnessLevel,
      p2Escalation,
    });

    // ── 8. Drive StudySession aggregate ─────────────────────────────────────
    // Reconstitute in 'activating' state (P1 has been run)
    const session = StudySession.reconstitute(sessionId, studentId, topicId, 'activating', null, null, null);
    session.issueActivationPlan(play, gateCtx, policy);

    // ── 9. Pull domain events + build output ─────────────────────────────────
    const domainEvents = session.pullDomainEvents();
    const activationPlan = session.activationPlan!;

    const output: ActivationPlanIssuedOutput = {
      studentId,
      mode: activationPlan.mode,
      playId: activationPlan.playId,
      firstAction: activationPlan.firstAction,
      replanCap: activationPlan.replanCap,
      focusContract: activationPlan.constraints?.noSwitchingUntil !== undefined
        ? { noSwitchingUntil: activationPlan.constraints.noSwitchingUntil }
        : undefined,
      allowedFallback: activationPlan.constraints?.enforceWatchOnlyVerification
        ? { enforceWatchOnlyVerification: true }
        : undefined,
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

    return output;
  }
}
