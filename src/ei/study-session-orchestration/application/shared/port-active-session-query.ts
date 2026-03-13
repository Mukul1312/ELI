/**
 * IActiveSessionQuery — driven port for resume detection.
 * Reads session_phase from ei_topic_state (ADR-003).
 *
 * Per tactical spec §8: driven port placement in application/shared/port-*.ts
 * Per canvas R1.3: "read-side query against projections, no domain concepts"
 */

/**
 * Tactical spec §8 names the broader port ITopicStateQuery (serving both R1.3 resume
 * detection and R3.4 PresentationContext). This port covers the R1.3 subset.
 * If R3.4 later needs its own projection queries, consider widening to ITopicStateQuery
 * or creating a sibling port.
 */


export interface ActiveSessionState {
  readonly topicId: string;
  readonly topicName: string | null;
  readonly sessionPhase: string;
  readonly currentSessionId: string | null;
  readonly lastSessionStartedAt: Date | null;
}

export interface IActiveSessionQuery {
  getActiveSession(studentId: string): Promise<ActiveSessionState | null>;

  /**
   * Event counts for P1 resume PresentationContext.
   * Wraps countStudentEventsLast7d — only called for the P1 (activating) resume case.
   */
  getStudentEventCounts7d(
    studentId: string,
  ): Promise<{ sessionsLast7d: number; loopsClosedLast7d: number }>;
}
