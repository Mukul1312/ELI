/**
 * PhaseDeriver — derives session phase from Ledger events.
 * Used for phase guards: IntentSet requires hasIntent; SessionEnd/SessionStart require hasActiveSession.
 *
 * Two session paths both produce valid active sessions:
 * 1. Negotiated path: P1 gate → SessionIntentIssued → P2 gate → ActivationPlanIssued → FirstActionStarted
 * 2. Declared path: RunDeclaredIntentHandler → SessionIntentIssued → sessionStartWorkflow → FirstActionStarted
 *
 * Therefore `hasActiveSession` checks for EITHER ActivationPlanIssued (negotiated
 * path completed P2) OR FirstActionStarted (both paths: session work has started).
 */

import type { IQueryEventsPort } from '../shared/port-query-events';

const RECENT_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface DerivedPhase {
  hasIntent: boolean;
  /**
   * True when the student has an active session for this topic.
   *
   * Two paths produce this:
   * 1. Negotiated path: P2 gate writes ActivationPlanIssued.
   * 2. Declared path: sessionStartWorkflow writes FirstActionStarted (no ActivationPlanIssued).
   *
   * Both are valid proof of an active session.
   */
  hasActiveSession: boolean;
  hasVerificationDecision: boolean;
}

export class PhaseDeriver {
  constructor(private readonly queryEvents: IQueryEventsPort) {}

  async derivePhase(studentId: string, topicId: string): Promise<DerivedPhase> {
    const since = new Date(Date.now() - RECENT_DAYS_MS);

    const [intentEvents, planEvents, decisionEvents, startedEvents] = await Promise.all([
      this.queryEvents.queryEvents(studentId, {
        eventTypes: ['SessionIntentIssued'],
        topicId,
        since,
        limit: 1,
      }),
      this.queryEvents.queryEvents(studentId, {
        eventTypes: ['ActivationPlanIssued'],
        topicId,
        since,
        limit: 1,
      }),
      this.queryEvents.queryEvents(studentId, {
        eventTypes: ['VerificationDecisionIssued'],
        topicId,
        since,
        limit: 1,
      }),
      // Declared-path evidence: sessionStartWorkflow writes FirstActionStarted
      // (no ActivationPlanIssued for declared sessions).
      this.queryEvents.queryEvents(studentId, {
        eventTypes: ['FirstActionStarted'],
        topicId,
        since,
        limit: 1,
      }),
    ]);

    return {
      hasIntent: intentEvents.length > 0,
      // ActivationPlanIssued = negotiated path completed P2
      // FirstActionStarted  = declared path started session work
      hasActiveSession: planEvents.length > 0 || startedEvents.length > 0,
      hasVerificationDecision: decisionEvents.length > 0,
    };
  }
}
