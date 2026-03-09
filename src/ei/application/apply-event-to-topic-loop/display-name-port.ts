/**
 * Driven port for persisting topic display names.
 *
 * Separated from ITopicLoopRepository per tactical conventions §5:
 * "Repository interfaces contain only domain concepts."
 * topicName is a denormalized display concern, not TopicLoop domain state.
 */
export interface ITopicDisplayNameWriter {
  upsertDisplayName(studentId: string, topicId: string, displayName: string): Promise<void>;
}
