/**
 * RunP1GateHandler — orchestrates the P1 Ignition gate.
 *
 * Load data (ports) → domain pipeline → StudySession.issueNegotiatedIntent()
 * → pull events → append to Ledger → return output.
 *
 * Per ei-runtime-tactical-spec.md §9 (Use Cases).
 */

import type { RunP1GateCommand } from './command';
import type { IRunP1GateUseCase } from './port';
import type { NegotiatedIntentIssuedOutput } from '../../schemas/outputs';
import type { IGetStudentSignalsPort } from '../assess-loop-health/port';
import type { IAssessLoopHealthUseCase } from '../assess-loop-health/port';
import type { IAppendEventPort } from '../shared/port-append-event';
import type { IProtocolEngine } from '../../domain/study-session/protocol-engine';
import type { StudentAggregates } from '../../domain/loop-health/assess-loop-health';

import { StudySession } from '../../domain/study-session/study-session';
import { P1GateContext } from '../../domain/study-session/value-objects/gate-context';
import { computeStateScore } from '../../engine/score';
import type { SleepBucket } from '../../engine/score';
import {
  computeEscalationContext,
  computeTightnessLevel,
} from '../../engine/escalation';
import type { PlayContext } from '../../engine/plays';
import { applyDoNoHarmGuardrail } from '../../engine/escalation';

export class RunP1GateHandler implements IRunP1GateUseCase {
  constructor(
    private readonly signalsPort: IGetStudentSignalsPort,
    private readonly assessLoopHealth: IAssessLoopHealthUseCase,
    private readonly appendEvent: IAppendEventPort,
    private readonly protocolEngine: IProtocolEngine,
  ) {}

  async execute(command: RunP1GateCommand): Promise<NegotiatedIntentIssuedOutput> {
    const { studentId, topicId, sessionId, energy } = command;
    const sleepBucket = (command.sleepBucket ?? '7-8') as SleepBucket;
    const pressure = command.pressure ?? 3;
    const backlogPressure = command.backlogPressure ?? 3;

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

    // ── 2. Compute state score ───────────────────────────────────────────────
    const stateScore = computeStateScore({ energy, sleepBucket, pressure, backlogPressure });

    // ── 3. Assess loop health (mode) ─────────────────────────────────────────
    const p1LhaContext = { energy, sleepBucket, pressure, backlogPressure };
    const snapshot = await this.assessLoopHealth.execute({
      studentId,
      gatePhase: 'P1',
      gateContext: p1LhaContext,
      aggregates,
      policy,
    });

    // ── 4. Apply DoNoHarm guardrail ──────────────────────────────────────────
    let mode = snapshot.mode;
    mode = applyDoNoHarmGuardrail(mode, aggregates, energy, pressure, sleepBucket);

    // ── 5. Compute escalation context ────────────────────────────────────────
    const escalation = computeEscalationContext(
      aggregates, energy, pressure, backlogPressure, sleepBucket,
    );
    const tightnessLevel = escalation.tightnessLevel;

    // ── 6. Build PlayContext and select play ─────────────────────────────────
    const playContext: PlayContext = {
      studentId,
      topicId,
      aggregates,
      tightnessLevel,
      p1FailurePatterns: escalation.p1FailurePatterns,
      currentEnergy: energy,
      currentPressure: pressure,
      currentBacklogPressure: backlogPressure,
      loopLatencyTrend: aggregates.loopLatencyTrend,
    };
    const play = this.protocolEngine.selectPlay(1, mode, playContext);

    // ── 7. Build P1GateContext VO ────────────────────────────────────────────
    const gateCtx = P1GateContext.create({
      studentId,
      energy,
      pressure,
      backlogPressure,
      sleepDebt: sleepBucket === '<6',
      openLoops: aggregates.openLoops,
      verificationRate7d: aggregates.verificationRate7d,
      scheduleMisses7d: aggregates.scheduleMisses7d,
      silenceDays: aggregates.silenceDays,
      startLatencyMedian7d: aggregates.startLatencyMin ?? null,
      tightnessLevel,
      loopLatencyTrend: aggregates.loopLatencyTrend ?? 'stable',
      p1FailurePatterns: escalation.p1FailurePatterns,
    });

    // ── 8. Drive StudySession aggregate ─────────────────────────────────────
    const session = StudySession.open(studentId, topicId, sessionId);
    session.issueNegotiatedIntent(play, gateCtx, policy, stateScore);

    // ── 9. Pull domain events + build output ─────────────────────────────────
    const domainEvents = session.pullDomainEvents();
    const negotiatedIntent = session.negotiatedIntent!;

    const output: NegotiatedIntentIssuedOutput = {
      studentId,
      mode: negotiatedIntent.mode,
      playId: negotiatedIntent.playId,
      topic: topicId,
      scope: negotiatedIntent.scope,
      verificationPlan: negotiatedIntent.verificationPlan,
      constraints: negotiatedIntent.constraints,
      stateScore: negotiatedIntent.stateScore,
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
