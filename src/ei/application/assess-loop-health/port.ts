import type { LoopHealthSnapshot } from '../../domain/loop-health/loop-health-snapshot';
import type { TopicStateSnapshot } from '../../domain/student-aggregates/student-aggregates';
import type { StudentAggregatesInput, StudentPolicyInput } from '../../domain/loop-health/aggregates-input';
import type { AssessLoopHealthCommand } from './command';

export interface StudentSignals {
  aggregates: StudentAggregatesInput;
  topicState?: TopicStateSnapshot[];
  policy?: StudentPolicyInput;
}

export interface IGetStudentSignalsPort {
  getSignals(studentId: string): Promise<StudentSignals | null>;
}

export interface IAssessLoopHealthUseCase {
  execute(command: AssessLoopHealthCommand): Promise<LoopHealthSnapshot>;
}
