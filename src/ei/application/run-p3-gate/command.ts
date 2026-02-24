/**
 * RunP3Gate command — input for the P3 Verification gate use case.
 * Per ei-runtime-tactical-spec.md §9 (Use Cases).
 */

export interface RunP3GateCommand {
  studentId: string;
  topicId: string;
  sessionId: string;
  /** ISO datetime when the session ended */
  endedAt: string;
}
