/**
 * PhaseDeriver — derives session phase from Ledger events.
 * Used for phase guards: IntentSet requires hasIntent; SessionEnd/SessionStart require hasActiveSession.
 *
 * IMPORTANT — Gate-bypass flow:
 * When the AppOpen payload includes `taskType`, ei-app-open.ts intentionally
 * bypasses P1/P2 gates and goes directly to sessionStartWorkflow. This means
 * NO NegotiatedIntentIssued and NO ActivationPlanIssued events are written.
 * However, sessionStartWorkflow DOES write a FirstActionStarted event.
 *
 * Therefore `hasActiveSession` checks for EITHER ActivationPlanIssued (normal
 * gate flow) OR FirstActionStarted (gate-bypass flow). Both prove the student
 * has an active session for that topic.
 */

import type { IQueryEventsPort } from '../shared/port-query-events';

const RECENT_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface DerivedPhase {
  hasIntent: boolean;
  /**
   * True when the student has an active session for this topic.
   *
   * Two paths produce this:
   * 1. Normal gate flow: P2 gate writes ActivationPlanIssued.
   * 2. Gate-bypass flow: AppOpen with taskType skips P1/P2 and goes straight
   *    to sessionStartWorkflow, which writes FirstActionStarted (but NOT
   *    ActivationPlanIssued). See ei-app-open.ts lines 301-321.
   *
   * Both are valid proof of an active session — SessionEnd and SessionStart
   * commands should be allowed in either case.
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
        eventTypes: ['NegotiatedIntentIssued'],
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
      // Gate-bypass evidence: sessionStartWorkflow writes FirstActionStarted
      // even when P1/P2 are skipped (AppOpen with taskType present).
      this.queryEvents.queryEvents(studentId, {
        eventTypes: ['FirstActionStarted'],
        topicId,
        since,
        limit: 1,
      }),
    ]);

    return {
      hasIntent: intentEvents.length > 0,
      // ActivationPlanIssued = normal gate flow completed P2
      // FirstActionStarted  = gate-bypass flow started session directly
      hasActiveSession: planEvents.length > 0 || startedEvents.length > 0,
      hasVerificationDecision: decisionEvents.length > 0,
    };
  }
}
