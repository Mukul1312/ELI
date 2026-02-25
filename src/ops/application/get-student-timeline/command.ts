/**
 * GetStudentTimelineCommand — input for GetStudentTimeline use case.
 * Per ops-observability-tactical-spec.md.
 */

export interface GetStudentTimelineCommand {
  studentId: string;
  limit?: number;
}
