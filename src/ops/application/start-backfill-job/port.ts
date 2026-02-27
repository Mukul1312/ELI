/**
 * Ports for StartBackfillJob, GetBackfillJobStatus, CancelBackfillJob, and RunBackfillJob.
 * Per ops-observability-tactical-spec.md §3, §6.
 */

import type { StartBackfillJobCommand } from './command';

// ============================================================================
// Types
// ============================================================================

export type BackfillJobStatus = 'queued' | 'running' | 'completed' | 'cancelled' | 'failed';

/** Snapshot of job state for reads (GetStatus, resume). */
export interface BackfillJobSnapshot {
  id: string;
  status: BackfillJobStatus;
  projectionNames: string[];
  studentIds: string[];
  throttleOpsPerSec: number | null;
  projectionVersion: string | null;
  totalUnits: number | null;
  completedUnits: number;
  checkpointPayload: BackfillCheckpoint | null;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
}

/** Checkpoint shape — projection-specific; opaque to repo. */
export interface BackfillCheckpoint {
  lastCompletedUnitIndex?: number;
  lastStudentIndex?: number;
  lastTopicIndex?: number;
  lastCompletedStudentId?: string;
  lastTopicId?: string;
  [key: string]: unknown;
}

export interface UpdateProgressOptions {
  status?: BackfillJobStatus;
  completedUnits?: number;
  checkpointPayload?: BackfillCheckpoint | null;
  errorMessage?: string | null;
  completedAt?: Date | null;
  startedAt?: Date | null;
}

// ============================================================================
// Driven Ports
// ============================================================================

/** Job state store for BackfillJob. */
export interface IBackfillJobRepository {
  save(job: BackfillJobSnapshot): Promise<void>;
  getById(jobId: string): Promise<BackfillJobSnapshot | null>;
  updateProgress(jobId: string, opts: UpdateProgressOptions): Promise<void>;
  findResumable(olderThan: Date): Promise<BackfillJobSnapshot[]>;
  /** Oldest queued or running job for worker to pick up. */
  findNextQueuedOrRunning(): Promise<BackfillJobSnapshot | null>;
}

/** Invoke EI projector/recompute entrypoints. */
export interface IProjectorEntrypointPort {
  recomputeTopicLoop(studentId: string, topicId: string): Promise<void>;
  recomputeStudentAggregates(studentId: string): Promise<void>;
  recomputeStudentPolicy(studentId: string): Promise<void>;
}

/** Resolve student scope: empty array → listActiveStudents, else return as-is. */
export interface IResolveStudentScopePort {
  resolveStudentIds(emptyOrIds: string[]): Promise<string[]>;
}

/** Fetch topics per student for work unit enumeration (TopicLoop needs topicId). */
export interface IGetTopicsForStudentsPort {
  getTopicsByStudent(studentIds: string[]): Promise<Map<string, string[]>>;
}

// ============================================================================
// Driver Ports
// ============================================================================

export interface StartBackfillJobResult {
  jobId: string;
  status: 'queued' | 'running';
  createdAt: string;
}

export interface IStartBackfillJobUseCase {
  execute(command: StartBackfillJobCommand): Promise<StartBackfillJobResult>;
}
