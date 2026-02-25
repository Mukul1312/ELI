/**
 * InMemoryStudentAggregatesRepo — implements IStudentAggregatesRepository.
 *
 * Simple Map-based store for StudentAggregates. Used by the pipeline harness
 * to avoid a real PostgreSQL dependency.
 */

import type { IStudentAggregatesRepository } from '../../domain/student-aggregates/repository';
import type { StudentAggregates } from '../../domain/student-aggregates/student-aggregates';
import type { StudentAggregatesId } from '../../domain/student-aggregates/value-objects';

export class InMemoryStudentAggregatesRepo implements IStudentAggregatesRepository {
  private store = new Map<string, StudentAggregates>();

  async findById(id: StudentAggregatesId): Promise<StudentAggregates | null> {
    return this.store.get(id.studentId) ?? null;
  }

  async save(aggregates: StudentAggregates): Promise<void> {
    this.store.set(aggregates.studentId, aggregates);
  }

  // ── Test helpers ────────────────────────────────────────────────────────────

  getByStudentId(studentId: string): StudentAggregates | null {
    return this.store.get(studentId) ?? null;
  }

  clear(): void {
    this.store.clear();
  }
}
