/**
 * DetectResumeQuery — input for the resume detection use case.
 *
 * Per canvas R1.3: DetectResume is a read-side query against projections.
 * Named "query" not "command" because it's side-effect-free.
 */

export interface DetectResumeQuery {
  readonly studentId: string;
}
