/**
 * RunP2Gate command — input for the P2 Activation gate use case.
 * Per ei-runtime-tactical-spec.md §9 (Use Cases).
 */

export interface RunP2GateCommand {
  studentId: string;
  topicId: string;
  sessionId: string;
  /** ISO datetime when the intent was set (used to compute startLatencyMin) */
  setAt: string;
  taskType?: string;
}
