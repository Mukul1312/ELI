/**
 * GetTopicsForStudentsAdapter — implements IGetTopicsForStudentsPort.
 * Fetches topics per student from ei_topic_state.
 */

import type { EiDb } from '@/ei/runtime/db';
import type { IGetTopicsForStudentsPort } from '@/ops/application/start-backfill-job/port';
import { getAllTopicStates } from '@/ei/db/queries';

export class GetTopicsForStudentsAdapter implements IGetTopicsForStudentsPort {
  constructor(private readonly db: EiDb) {}

  async getTopicsByStudent(studentIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    for (const studentId of studentIds) {
      const rows = await getAllTopicStates(this.db, studentId);
      const topicIds = rows.map((r) => r.topic_id);
      result.set(studentId, topicIds);
    }

    return result;
  }
}
