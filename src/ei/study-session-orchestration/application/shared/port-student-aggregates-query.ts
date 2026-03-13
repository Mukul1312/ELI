/**
 * IStudentAggregatesQuery — driven port for loading student aggregates.
 *
 * Per tactical spec §8: driven port in application/shared/port-*.ts.
 * Per canvas R1.1: Projection queries → FlowSelectionContext assembly.
 * Returns domain-shaped data (plain object matching VO fields).
 */

export interface StudentAggregatesForFlow {
  readonly sessionsTotal: number;
  readonly silenceDays: number;
  readonly pendingChecks: number;
  readonly openLoops: number;
}

export interface IStudentAggregatesQuery {
  getAggregatesForFlow(studentId: string): Promise<StudentAggregatesForFlow | null>;
}
