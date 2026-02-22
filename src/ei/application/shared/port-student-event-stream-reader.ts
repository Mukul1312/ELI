export interface StudentStreamedEvent {
  eventType: string;
  topicId: string | null;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

export interface IStudentEventStreamReader {
  readEventsForStudentInWindow(
    studentId: string,
    since: Date,
    until?: Date,
  ): Promise<StudentStreamedEvent[]>;

  /** Fetch the single most-recent event (any type) for silence-days fallback. */
  readLatestEvent(studentId: string): Promise<StudentStreamedEvent | null>;
}
