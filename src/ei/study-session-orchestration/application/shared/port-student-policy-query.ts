/**
 * IStudentPolicyQuery — driven port for loading student policy (dials/cohort flags).
 *
 * Per tactical spec §8: driven port in application/shared/port-*.ts.
 * Per canvas R1.1: Projection queries → FlowSelectionContext assembly.
 * Returns domain-shaped data (plain object matching VO fields).
 */

export interface StudentPolicyForFlow {
  readonly dials: Record<string, boolean>;
}

export interface IStudentPolicyQuery {
  getPolicyForFlow(studentId: string): Promise<StudentPolicyForFlow | null>;
}
