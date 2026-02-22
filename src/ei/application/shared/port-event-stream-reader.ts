export interface StreamedEvent {
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface IEventStreamReader {
  readEventsForTopic(
    studentId: string,
    topicId: string,
  ): Promise<StreamedEvent[]>;
}
