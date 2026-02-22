export interface TopicStateSnapshot {
  topicId: string;
  lastEffortAt: Date | null;
  lastRetrievalAt: Date | null;
  lastScheduledDueAt: Date | null;
}

export interface ITopicStateReader {
  getAllTopicStates(studentId: string): Promise<TopicStateSnapshot[]>;
}
