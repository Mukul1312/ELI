/**
 * Ports for GetStudentTimeline use case.
 * Reuses IQueryEventsPort from EI. Adds IGetStudentAggregatesPort.
 * Per ops-observability-tactical-spec.md and ops-observability-tactical-spec.md.
 */

import type { QueriedEvent } from '@/ei/application/shared/port-query-events';
import type { IQueryEventsPort } from '@/ei/application/shared/port-query-events';
import type { GetStudentTimelineCommand } from './command';

/** Student aggregates row shape from ei_student_aggregates. */
export interface StudentAggregatesRow {
  student_id: string;
  pending_checks: number;
  open_loops: number;
  verification_rate_7d: number;
  schedule_misses_7d: number;
  avoidant_exits_7d: number;
  skip_count_7d: number;
  silence_days: number;
  start_latency_min_median_7d: number | null;
  intent_acceptance_rate_7d: number | null;
  replan_loop_count_7d: number;
  state_trend_7d: string;
  loop_latency_trend: string | null;
  updated_at: Date;
}

/** Driven port: returns student aggregates or null. */
export interface IGetStudentAggregatesPort {
  getStudentAggregates(studentId: string): Promise<StudentAggregatesRow | null>;
}

/** Result of GetStudentTimeline — events in chronological order (occurred_at ASC). */
export interface GetStudentTimelineResult {
  events: QueriedEvent[];
  aggregates: StudentAggregatesRow | null;
}

export interface IGetStudentTimelineDataPort extends IQueryEventsPort, IGetStudentAggregatesPort {}

export interface IGetStudentTimelineUseCase {
  execute(command: GetStudentTimelineCommand): Promise<GetStudentTimelineResult>;
}

export type { IQueryEventsPort };
