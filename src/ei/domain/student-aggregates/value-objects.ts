import { ValueObject } from '../shared/value-object';
import { MissingStudentIdError } from './errors';

interface StudentAggregatesIdProps {
  studentId: string;
}

export class StudentAggregatesId extends ValueObject<StudentAggregatesIdProps> {
  private constructor(props: StudentAggregatesIdProps) {
    super(props);
  }

  static create(studentId: string): StudentAggregatesId {
    if (!studentId || typeof studentId !== 'string' || studentId.trim().length === 0) {
      throw new MissingStudentIdError();
    }
    return new StudentAggregatesId({ studentId: studentId.trim() });
  }

  get studentId(): string {
    return this.props.studentId;
  }
}
