/**
 * Work unit enumeration for backfill jobs.
 * Order: TopicLoop (all topics) → StudentAggregates → StudentPolicy per student.
 * Per ops-observability-tactical-spec.md and signal-compute ordering rule.
 */

export const ALLOWED_PROJECTIONS = ['TopicLoop', 'StudentAggregates', 'StudentPolicy'] as const;
export type AllowedProjection = (typeof ALLOWED_PROJECTIONS)[number];

export interface WorkUnit {
  projection: AllowedProjection;
  studentId: string;
  topicId?: string;
}

export interface EnumerateWorkUnitsResult {
  units: WorkUnit[];
  total: number;
}

/**
 * Enumerate work units in deterministic order.
 * For each student: TopicLoop (all topics) → StudentAggregates → StudentPolicy.
 * Topics ordered by topicId for determinism.
 *
 * @param projectionNames - Projections to run (e.g. TopicLoop, StudentAggregates, StudentPolicy)
 * @param studentIds - Scope (already resolved)
 * @param topicsByStudent - Topics per student from ei_topic_state (handler fetches)
 */
export function enumerateWorkUnits(
  projectionNames: AllowedProjection[],
  studentIds: string[],
  topicsByStudent: Map<string, string[]>
): EnumerateWorkUnitsResult {
  const units: WorkUnit[] = [];
  const sortedStudentIds = [...studentIds].sort();

  for (const studentId of sortedStudentIds) {
    const topics = topicsByStudent.get(studentId) ?? [];
    const sortedTopics = [...topics].sort();

    if (projectionNames.includes('TopicLoop')) {
      for (const topicId of sortedTopics) {
        units.push({ projection: 'TopicLoop', studentId, topicId });
      }
    }

    if (projectionNames.includes('StudentAggregates')) {
      units.push({ projection: 'StudentAggregates', studentId });
    }

    if (projectionNames.includes('StudentPolicy')) {
      units.push({ projection: 'StudentPolicy', studentId });
    }
  }

  return { units, total: units.length };
}

export function isAllowedProjection(name: string): name is AllowedProjection {
  return ALLOWED_PROJECTIONS.includes(name as AllowedProjection);
}
