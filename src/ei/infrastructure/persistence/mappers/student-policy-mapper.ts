import type { PolicyRow } from '../../../db/queries';
import { StudentPolicy } from '../../../domain/student-policy/student-policy';
import { StudentPolicyId, isTightnessLevel } from '../../../domain/student-policy/value-objects';

export const StudentPolicyMapper = {
  toDomain(row: PolicyRow): StudentPolicy {
    const id = StudentPolicyId.create(row.student_id);
    const raw = row.tightness_level as string;
    const tightnessLevel = isTightnessLevel(raw) ? raw : 'Normal';
    return StudentPolicy.reconstitute(id, {
      tightnessLevel,
      adjustmentMode: row.adjustment_mode,
      dials: row.dials,
      constraints: row.constraints,
      updatedAt: row.updated_at,
    });
  },

  toPersistence(policy: StudentPolicy): {
    tightness_level: string;
    adjustment_mode: string | null;
    dials: Record<string, unknown>;
    constraints: Record<string, unknown>;
  } {
    const state = policy.state!;
    return {
      tightness_level: state.tightnessLevel,
      adjustment_mode: state.adjustmentMode,
      dials: state.dials,
      constraints: state.constraints,
    };
  },
};
