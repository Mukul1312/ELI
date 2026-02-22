import { AggregateRoot } from '../shared/aggregate-root';
import { InvalidTightnessLevelError } from './errors';
import { isTightnessLevel, type TightnessLevel, StudentPolicyId } from './value-objects';

export interface PolicyState {
  tightnessLevel: TightnessLevel;
  adjustmentMode: string | null;
  dials: Record<string, unknown>;
  constraints: Record<string, unknown>;
  updatedAt: Date;
}

export interface StrategicAdjustmentDecision {
  tightnessLevel: string;
  adjustmentMode: string | null;
  dials: Record<string, unknown>;
  constraints: Record<string, unknown>;
  issuedAt: Date;
}

export class StudentPolicy extends AggregateRoot<StudentPolicyId> {
  private _state: PolicyState | null;

  private constructor(id: StudentPolicyId, state: PolicyState | null) {
    super(id);
    this._state = state;
  }

  static empty(id: StudentPolicyId): StudentPolicy {
    return new StudentPolicy(id, null);
  }

  static reconstitute(id: StudentPolicyId, state: PolicyState): StudentPolicy {
    return new StudentPolicy(id, state);
  }

  get state(): PolicyState | null {
    return this._state;
  }

  get studentId(): string {
    return this._id.studentId;
  }

  get hasPolicy(): boolean {
    return this._state !== null;
  }

  applyStrategicAdjustmentDecision(decision: StrategicAdjustmentDecision): void {
    const { tightnessLevel } = decision;
    if (!isTightnessLevel(tightnessLevel)) {
      throw new InvalidTightnessLevelError(tightnessLevel);
    }

    this._state = {
      tightnessLevel,
      adjustmentMode: decision.adjustmentMode,
      dials: { ...decision.dials },
      constraints: { ...decision.constraints },
      updatedAt: decision.issuedAt,
    };
  }
}
