export interface RecomputeStudentAggregatesCommand {
  studentId: string;
  now?: Date;
  /** Grace period in ms before a schedule is considered overdue. Injected by infrastructure from tunables. */
  graceMs: number;
}
