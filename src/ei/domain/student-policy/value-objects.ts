import { ValueObject } from '../shared/value-object';
import { MissingStudentIdError } from './errors';

export const TIGHTNESS_LEVELS = ['Loose', 'Normal', 'Tight'] as const;
export type TightnessLevel = (typeof TIGHTNESS_LEVELS)[number];

export function isTightnessLevel(value: string): value is TightnessLevel {
  return (TIGHTNESS_LEVELS as readonly string[]).includes(value);
}

interface StudentPolicyIdProps {
  studentId: string;
}

export class StudentPolicyId extends ValueObject<StudentPolicyIdProps> {
  private constructor(props: StudentPolicyIdProps) {
    super(props);
  }

  static create(studentId: string): StudentPolicyId {
    if (!studentId || typeof studentId !== 'string' || studentId.trim().length === 0) {
      throw new MissingStudentIdError();
    }
    return new StudentPolicyId({ studentId: studentId.trim() });
  }

  get studentId(): string {
    return this.props.studentId;
  }
}
