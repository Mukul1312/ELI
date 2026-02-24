export interface ApplyEventCommand {
  studentId: string;
  topicId: string;
  eventType: string;
  payload: Record<string, unknown>;
}
