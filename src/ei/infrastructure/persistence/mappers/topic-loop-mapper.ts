import type { TopicStateRow } from '../../../db/queries';
import { TopicLoop } from '../../../domain/topic-loop/topic-loop';
import { TopicLoopId, TopicLoopState } from '../../../domain/topic-loop/value-objects';

export const TopicLoopMapper = {
  toDomain(row: TopicStateRow): TopicLoop {
    const id = TopicLoopId.create(row.student_id, row.topic_id);
    const state = TopicLoopState.create({
      lastEffortAt: row.last_effort_at,
      lastRetrievalAt: row.last_retrieval_at,
      lastScheduledDueAt: row.last_scheduled_due_at,
      consecutiveDeferrals: row.consecutive_deferrals ?? 0,
    });
    return TopicLoop.reconstitute(id, state);
  },

  toPersistence(
    topicLoop: TopicLoop,
  ): Pick<TopicStateRow, 'last_effort_at' | 'last_retrieval_at' | 'last_scheduled_due_at' | 'consecutive_deferrals'> {
    return {
      last_effort_at: topicLoop.state.lastEffortAt,
      last_retrieval_at: topicLoop.state.lastRetrievalAt,
      last_scheduled_due_at: topicLoop.state.lastScheduledDueAt,
      consecutive_deferrals: topicLoop.state.consecutiveDeferrals,
    };
  },
};
