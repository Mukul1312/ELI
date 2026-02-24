import type { AggregateMetrics } from '../../domain/student-aggregates/student-aggregates';
import type { RecomputeStudentAggregatesCommand } from './command';

export interface RecomputeStudentAggregatesResult extends AggregateMetrics {
  studentId: string;
}

export interface IRecomputeStudentAggregatesUseCase {
  execute(command: RecomputeStudentAggregatesCommand): Promise<RecomputeStudentAggregatesResult>;
}
