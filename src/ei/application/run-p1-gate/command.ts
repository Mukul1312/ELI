/**
 * RunP1Gate command — input for the P1 Ignition gate use case.
 * Per ei-runtime-tactical-spec.md §9 (Use Cases).
 */

export interface RunP1GateCommand {
  studentId: string;
  topicId: string;
  sessionId: string;
  energy: number;          // 1–5
  sleepBucket?: string;    // '<6' | '6-7' | '7-8' | '>=8'
  pressure?: number;       // 1–5
  backlogPressure?: number; // 1–5
}
