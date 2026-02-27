/**
 * StartBackfillJob command DTO.
 * Per ops-observability-tactical-spec.md §4 StartBackfillJob.
 */

export interface StartBackfillJobCommand {
  projectionNames: string[];
  studentIds: string[];
  throttleOpsPerSec?: number;
  projectionVersion?: string;
}
