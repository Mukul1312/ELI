import type { TopicStateRow } from '../../../db/queries';
import { TopicLoop } from '../../../domain/topic-loop/topic-loop';
import { TopicLoopId, TopicLoopState, SessionLifecycleState } from '../../../domain/topic-loop/value-objects';

export const TopicLoopMapper = {
  toDomain(row: TopicStateRow): TopicLoop {
    const id = TopicLoopId.create(row.student_id, row.topic_id);
    const state = TopicLoopState.create({
      lastEffortAt: row.last_effort_at,
      lastRetrievalAt: row.last_retrieval_at,
      lastScheduledDueAt: row.last_scheduled_due_at,
      consecutiveDeferrals: row.consecutive_deferrals ?? 0,
    });
    const sessionLifecycle = SessionLifecycleState.reconstitute({
      sessionPhase: row.session_phase,
      currentSessionId: row.current_session_id,
      verificationFloor: row.verification_floor,
      watchOnlyFlag: row.watch_only_flag ?? false,
      intentSource: row.intent_source,
      lastSessionStartedAt: row.last_session_started_at,
    });
    return TopicLoop.reconstitute(id, state, sessionLifecycle);
  },

  toPersistence(
    topicLoop: TopicLoop,
  ): Pick<TopicStateRow, 'last_effort_at' | 'last_retrieval_at' | 'last_scheduled_due_at' | 'consecutive_deferrals' | 'session_phase' | 'current_session_id' | 'verification_floor' | 'watch_only_flag' | 'intent_source' | 'last_session_started_at'> {
    const sl = topicLoop.sessionLifecycle;
    return {
      last_effort_at: topicLoop.state.lastEffortAt,
      last_retrieval_at: topicLoop.state.lastRetrievalAt,
      last_scheduled_due_at: topicLoop.state.lastScheduledDueAt,
      consecutive_deferrals: topicLoop.state.consecutiveDeferrals,
      session_phase: sl.sessionPhase,
      current_session_id: sl.currentSessionId,
      verification_floor: sl.verificationFloor,
      watch_only_flag: sl.watchOnlyFlag,
      intent_source: sl.intentSource,
      last_session_started_at: sl.lastSessionStartedAt,
    };
  },
};
