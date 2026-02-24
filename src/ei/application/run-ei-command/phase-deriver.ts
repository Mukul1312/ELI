/**
 * PhaseDeriver — derives session phase from Ledger events.
 * Used for phase guards: IntentSet requires hasIntent; SessionEnd/SessionStart require hasActivationPlan.
 */

import type { IQueryEventsPort } from '../shared/port-query-events';

const RECENT_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface DerivedPhase {
  hasIntent: boolean;
  hasActivationPlan: boolean;
  hasVerificationDecision: boolean;
}

export class PhaseDeriver {
  constructor(private readonly queryEvents: IQueryEventsPort) {}

  async derivePhase(studentId: string, topicId: string): Promise<DerivedPhase> {
    const since = new Date(Date.now() - RECENT_DAYS_MS);

    const [intentEvents, planEvents, decisionEvents] = await Promise.all([
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
    ]);

    return {
      hasIntent: intentEvents.length > 0,
      hasActivationPlan: planEvents.length > 0,
      hasVerificationDecision: decisionEvents.length > 0,
    };
  }
}
