import { ValueObject } from '../shared/value-object';

interface StudentAggregatesIdProps {
  studentId: string;
}

export class StudentAggregatesId extends ValueObject<StudentAggregatesIdProps> {
  private constructor(props: StudentAggregatesIdProps) {
    super(props);
  }

  static create(studentId: string): StudentAggregatesId {
    return new StudentAggregatesId({ studentId });
  }

  get studentId(): string {
    return this.props.studentId;
  }
}
