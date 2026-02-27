/**
 * ProtocolRouter — domain service that decides which protocol (P1/P2/P3) to run
 * based on command type and session state derived from event history.
 *
 * Per strategic design: Runtime orchestrates; client sends commands.
 * @see docs/engineering-ddd-design/canvas-ei-runtime.md
 * @see docs/engineering-ddd-design/05-domain-message-flows-storyboards.md (S2 Day 2-21)
 */

import type { EiCommand } from './command-schema';
import type { IQueryEventsPort } from '../shared/port-query-events';

export type EiCommandWithStudent = EiCommand & { studentId: string };

/** "Recent" = within last 7 days (per S2 Day 2-21 scenario). */
const RECENT_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class ProtocolRouter {
  constructor(private readonly queryEvents: IQueryEventsPort) {}

  /**
   * Decides which protocol to run for the given command.
   * Uses event history to derive session state.
   */
  async decideProtocol(command: EiCommandWithStudent): Promise<1 | 2 | 3> {
    const { commandType, payload, studentId } = command;
    const topic =
      commandType === 'AppOpen'
        ? (payload as { topic?: string }).topic ?? ''
        : (payload as { topic: string }).topic;

    switch (commandType) {
      case 'AppOpen':
        return this.decideForAppOpen(studentId, topic);
      case 'IntentSet':
        return 2; // Always P2 — client accepted intent, now activating
      case 'SessionEnd':
        return 3; // Always P3 — client ended session, now verify
      default:
        throw new Error(`Unknown commandType: ${commandType}`);
    }
  }

  /**
   * AppOpen: P1 if no recent NegotiatedIntent for topic; P2 if intent exists (S2 Day 2-21).
   */
  private async decideForAppOpen(studentId: string, topicId: string): Promise<1 | 2> {
    const since = new Date(Date.now() - RECENT_DAYS_MS);
    const events = await this.queryEvents.queryEvents(studentId, {
      eventTypes: ['NegotiatedIntentIssued'],
      topicId,
      since,
      limit: 1,
    });

    const hasRecentIntent = events.length > 0;
    return hasRecentIntent ? 2 : 1;
  }
}
