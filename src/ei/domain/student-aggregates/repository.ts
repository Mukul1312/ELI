import type { StudentAggregates } from './student-aggregates';
import type { StudentAggregatesId } from './value-objects';

export interface IStudentAggregatesRepository {
  findById(id: StudentAggregatesId): Promise<StudentAggregates | null>;
  save(aggregates: StudentAggregates): Promise<void>;
}
