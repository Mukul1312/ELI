/**
 * StudySession aggregate root — EI Runtime bounded context.
 * Command Handler type per 01-ei-tactical-conventions.md §6.
 *
 * Manages the lifecycle of one student study session:
 *   negotiating → activating → active → verifying → closed
 *
 * Owns NegotiatedIntent, ActivationPlan, VerificationDecision value objects.
 * Enforces all cross-protocol invariants atomically.
 * Emits domain events collected by pullDomainEvents().
 *
 * Per ei-runtime-tactical-spec.md §2–6 and DDD-TACTICAL.md Aggregate pattern.
 */

import { AggregateRoot } from '../shared/aggregate-root';
import { SessionAlreadyClosedError, InvalidGateOrderError } from './errors';
import { NegotiatedIntent } from './value-objects/negotiated-intent';
import { DeclaredIntent } from './value-objects/declared-intent';
import type { DeclaredIntentInput } from './value-objects/declared-intent';
import { ActivationPlan } from './value-objects/activation-plan';
import { VerificationDecision } from './value-objects/verification-decision';
import type { PlaySelection } from './value-objects/play-selection';
import type { P1GateContext, P2GateContext, P3GateContext } from './value-objects/gate-context';
import type { StudentPolicyInput } from '../loop-health/aggregates-input';
import type { SleepBucket } from '../../engine/score';

export type SessionStatus = 'negotiating' | 'activating' | 'active' | 'verifying' | 'closed';

export class StudySession extends AggregateRoot<string> {
  private _studentId: string;
  private _topicId: string;
  private _status: SessionStatus;
  private _sessionIntent: NegotiatedIntent | DeclaredIntent | null;
  private _negotiatedIntentId: string | null;
  private _activationPlan: ActivationPlan | null;
  private _verificationDecision: VerificationDecision | null;

  private constructor(
    sessionId: string,
    studentId: string,
    topicId: string,
    status: SessionStatus,
    sessionIntent: NegotiatedIntent | DeclaredIntent | null,
    activationPlan: ActivationPlan | null,
    verificationDecision: VerificationDecision | null,
    negotiatedIntentId?: string | null
  ) {
    super(sessionId);
    this._studentId = studentId;
    this._topicId = topicId;
    this._status = status;
    this._sessionIntent = sessionIntent;
    this._negotiatedIntentId = negotiatedIntentId ?? null;
    this._activationPlan = activationPlan;
    this._verificationDecision = verificationDecision;
  }

  /**
   * Open a new study session. Call on AppOpen.
   */
  static open(studentId: string, topicId: string, sessionId: string): StudySession {
    return new StudySession(sessionId, studentId, topicId, 'negotiating', null, null, null, null);
  }

  /**
   * Reconstitute a session from persisted state (for cross-gate state threading).
   */
  static reconstitute(
    sessionId: string,
    studentId: string,
    topicId: string,
    status: SessionStatus,
    sessionIntent: NegotiatedIntent | DeclaredIntent | null,
    activationPlan: ActivationPlan | null,
    verificationDecision: VerificationDecision | null,
  ): StudySession {
    return new StudySession(
      sessionId, studentId, topicId, status,
      sessionIntent, activationPlan, verificationDecision,
    );
  }

  // ─── Fold (Event-Sourced Reconstitution) ──────────────────────────────────
  // ADR-004: Processes aggregate-emitted events to reconstitute full state.
  // Only 3 event types: SessionIntentIssued, ActivationPlanIssued, VerificationDecisionIssued.
  // SessionEnd and FirstActionStarted are NOT aggregate events.

  static fold(events: ReadonlyArray<{ eventType: string; payload: Record<string, unknown>; occurredAt: Date }>): StudySession {
    if (events.length === 0) {
      throw new Error('Cannot fold empty event list — at least one SessionIntentIssued is required');
    }

    let sessionId: string | null = null;
    let studentId: string | null = null;
    let topicId: string | null = null;
    let status: SessionStatus = 'negotiating';
    let sessionIntent: NegotiatedIntent | DeclaredIntent | null = null;
    let activationPlan: ActivationPlan | null = null;
    let verificationDecision: VerificationDecision | null = null;

    for (const event of events) {
      const p = event.payload;

      switch (event.eventType) {
        case 'SessionIntentIssued': {
          sessionId = p.sessionId as string;
          studentId = p.studentId as string;
          topicId = p.topicId as string;
          status = 'activating';

          if (p.intentSource === 'declared') {
            sessionIntent = DeclaredIntent.reconstitute({
              timebox: p.timebox as number,
              taskType: p.taskType as any,
              energy: p.energy as number,
              sleepBucket: p.sleepBucket as any,
              verificationFloor: p.verificationFloor as any ?? null,
            });
          } else {
            // Negotiated — reverse the toEventPayload() field mapping
            const vf = p.verificationFloor as { minQuestions: number; preferVerifyNow: boolean };
            sessionIntent = NegotiatedIntent.reconstitute({
              playId: p.playId as string,
              mode: p.mode as any,
              scope: {
                timeboxMin: p.timebox as number,
                questionCount: p.questionCount as number,
                difficultyTier: p.difficultyTier as any,
              },
              verificationPlan: {
                minQuestions: vf.minQuestions,
                preferVerifyNow: vf.preferVerifyNow,
              },
              constraints: p.constraints as any,
              stateScore: p.stateScore as number,
              negotiatedIntentId: p.sessionIntentId as string | undefined,
              energy: p.energy as number,
              sleepBucket: p.sleepBucket as any,
            });
          }
          break;
        }

        case 'ActivationPlanIssued': {
          status = 'active';
          activationPlan = ActivationPlan.reconstitute({
            playId: p.playId as string,
            mode: p.mode as any,
            firstAction: p.firstAction as any,
            replanCap: p.replanCap as number | undefined,
            constraints: p.constraints as any,
          });
          break;
        }

        case 'VerificationDecisionIssued': {
          status = 'verifying';
          verificationDecision = VerificationDecision.reconstitute({
            playId: p.playId as string,
            mode: p.mode as any,
            decision: p.decision as any,
            verifyNow: p.verifyNow as any,
            scheduleVerify: p.scheduleVerify as any,
            skipReason: p.skipReason as string | undefined,
          });
          break;
        }

        // SessionEnd, FirstActionStarted are NOT aggregate events — skip
      }
    }

    if (!sessionId || !studentId || !topicId) {
      throw new Error('Fold requires at least one SessionIntentIssued event');
    }

    return StudySession.reconstitute(
      sessionId, studentId, topicId, status,
      sessionIntent, activationPlan, verificationDecision,
    );
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  get sessionId(): string { return this._id; }
  get studentId(): string { return this._studentId; }
  get topicId(): string { return this._topicId; }
  get status(): SessionStatus { return this._status; }
  get sessionIntent(): NegotiatedIntent | DeclaredIntent | null { return this._sessionIntent; }
  get negotiatedIntent(): NegotiatedIntent | null {
    return this._sessionIntent instanceof NegotiatedIntent ? this._sessionIntent : null;
  }
  get negotiatedIntentId(): string | null {
    return (this._sessionIntent instanceof NegotiatedIntent ? this._sessionIntent.negotiatedIntentId : undefined) ?? this._negotiatedIntentId ?? null;
  }
  get activationPlan(): ActivationPlan | null { return this._activationPlan; }
  get verificationDecision(): VerificationDecision | null { return this._verificationDecision; }

  // ─── Guards ────────────────────────────────────────────────────────────────

  private assertNotClosed(): void {
    if (this._status === 'closed') {
      throw new SessionAlreadyClosedError();
    }
  }

  private assertStatus(required: SessionStatus): void {
    this.assertNotClosed();
    if (this._status !== required) {
      throw new InvalidGateOrderError(required, this._status);
    }
  }

  // ─── Commands ──────────────────────────────────────────────────────────────

  /**
   * P1 gate: issue a negotiated intent.
   * Transitions: negotiating → activating
   * Invariants: lifecycle ordering, risk override, rescue scope floor, minQuestions >= 1.
   */
  issueNegotiatedIntent(
    play: PlaySelection,
    ctx: P1GateContext,
    policy: StudentPolicyInput,
    stateScore: number,
    negotiatedIntentId: string,
    sleepBucket: SleepBucket = '7-8',
  ): void {
    this.assertStatus('negotiating');

    // NegotiatedIntent.create() enforces all P1 invariants
    this._sessionIntent = NegotiatedIntent.create(play, ctx, policy, stateScore, negotiatedIntentId, sleepBucket);
    this._negotiatedIntentId = negotiatedIntentId;
    this._status = 'activating';

    // Per DDD canonical event structure (CQRS-EVENTS.md): every domain event carries
    // the aggregate ID (sessionId = this._id) so the aggregate can be reconstituted
    // from the Ledger alone — replacing ei_study_sessions as the identity store.
    this.addDomainEvent({
      eventType: 'SessionIntentIssued',
      payload: { sessionId: this._id, ...this._sessionIntent.toEventPayload(this._studentId, this._topicId) },
    });
  }

  /**
   * P1 declared path: student declares own intent without ELI negotiation.
   * Transitions: negotiating → activating
   * Data integrity invariants only (no ELI business rules).
   */
  issueDeclaredIntent(input: DeclaredIntentInput): void {
    this.assertStatus('negotiating');

    this._sessionIntent = DeclaredIntent.create(input);
    this._status = 'activating';

    // Per DDD canonical event structure (CQRS-EVENTS.md): aggregate ID in payload.
    this.addDomainEvent({
      eventType: 'SessionIntentIssued',
      payload: { sessionId: this._id, ...this._sessionIntent.toEventPayload(this._studentId, this._topicId) },
    });
  }

  /**
   * P2 gate: issue an activation plan.
   * Transitions: activating → active
   * Invariants: lifecycle ordering, watch-only constraint.
   */
  issueActivationPlan(
    play: PlaySelection,
    ctx: P2GateContext,
    policy: StudentPolicyInput
  ): void {
    this.assertStatus('activating');

    // ActivationPlan.create() enforces all P2 invariants
    this._activationPlan = ActivationPlan.create(play, ctx, policy);
    this._status = 'active';

    this.addDomainEvent({
      eventType: 'ActivationPlanIssued',
      payload: this._activationPlan.toEventPayload(this._studentId, this._topicId),
    });
  }

  /**
   * P3 gate: issue a verification decision.
   * Transitions: active → verifying
   * Invariants: lifecycle ordering, P1 verification floor, P2 watch-only override,
   *   VerifyNow completeness, ScheduleVerify dueInHours >= 24.
   *
   * The P3GateContext must have p1VerificationFloor populated from the session's
   * negotiatedIntent (populated by the application handler).
   */
  issueVerificationDecision(
    play: PlaySelection,
    ctx: P3GateContext,
    policy: StudentPolicyInput
  ): void {
    this.assertStatus('active');

    // VerificationDecision.create() enforces all P3 invariants (including cross-protocol)
    this._verificationDecision = VerificationDecision.create(play, ctx, policy);
    this._status = 'verifying';

    this.addDomainEvent({
      eventType: 'VerificationDecisionIssued',
      payload: this._verificationDecision.toEventPayload(this._studentId, this._topicId),
    });
  }

  /**
   * Close the session (from any non-closed state).
   */
  close(): void {
    this.assertNotClosed();
    this._status = 'closed';
  }
}
