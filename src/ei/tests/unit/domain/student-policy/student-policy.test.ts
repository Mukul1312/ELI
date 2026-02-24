import { describe, it, expect } from 'vitest';
import { StudentPolicy } from '../../../../domain/student-policy/student-policy';
import { StudentPolicyId } from '../../../../domain/student-policy/value-objects';
import { MissingStudentIdError, InvalidTightnessLevelError } from '../../../../domain/student-policy/errors';

describe('StudentPolicyId', () => {
  it('creates with valid studentId', () => {
    const id = StudentPolicyId.create('student-1');
    expect(id.studentId).toBe('student-1');
  });

  it('trims whitespace', () => {
    const id = StudentPolicyId.create('  student-1  ');
    expect(id.studentId).toBe('student-1');
  });

  it('rejects empty studentId', () => {
    expect(() => StudentPolicyId.create('')).toThrow(MissingStudentIdError);
  });

  it('rejects whitespace-only studentId', () => {
    expect(() => StudentPolicyId.create('   ')).toThrow(MissingStudentIdError);
  });

  it('equals another StudentPolicyId with same studentId', () => {
    const a = StudentPolicyId.create('student-1');
    const b = StudentPolicyId.create('student-1');
    expect(a.equals(b)).toBe(true);
  });

  it('does not equal a StudentPolicyId with different studentId', () => {
    const a = StudentPolicyId.create('student-1');
    const b = StudentPolicyId.create('student-2');
    expect(a.equals(b)).toBe(false);
  });
});

describe('StudentPolicy', () => {
  const baseDecision = {
    tightnessLevel: 'Tight',
    adjustmentMode: 'Recovery',
    dials: { scopeMultiplier: 0.7 },
    constraints: { maxOpenLoops: 3 },
    issuedAt: new Date('2025-06-01T12:00:00Z'),
  };

  it('empty policy has null state', () => {
    const id = StudentPolicyId.create('student-1');
    const policy = StudentPolicy.empty(id);
    expect(policy.state).toBeNull();
    expect(policy.hasPolicy).toBe(false);
    expect(policy.studentId).toBe('student-1');
  });

  it('first decision creates state', () => {
    const id = StudentPolicyId.create('student-1');
    const policy = StudentPolicy.empty(id);

    policy.applyStrategicAdjustmentDecision(baseDecision);

    expect(policy.hasPolicy).toBe(true);
    expect(policy.state!.tightnessLevel).toBe('Tight');
    expect(policy.state!.adjustmentMode).toBe('Recovery');
    expect(policy.state!.dials).toEqual({ scopeMultiplier: 0.7 });
    expect(policy.state!.constraints).toEqual({ maxOpenLoops: 3 });
    expect(policy.state!.updatedAt).toEqual(baseDecision.issuedAt);
  });

  it('replace overwrites all fields — old constraints removed', () => {
    const id = StudentPolicyId.create('student-1');
    const policy = StudentPolicy.empty(id);

    policy.applyStrategicAdjustmentDecision(baseDecision);

    policy.applyStrategicAdjustmentDecision({
      tightnessLevel: 'Loose',
      adjustmentMode: 'DifficultyRaise',
      dials: { difficultyTierDelta: 1 },
      constraints: {},
      issuedAt: new Date('2025-06-08T12:00:00Z'),
    });

    expect(policy.state!.tightnessLevel).toBe('Loose');
    expect(policy.state!.adjustmentMode).toBe('DifficultyRaise');
    expect(policy.state!.dials).toEqual({ difficultyTierDelta: 1 });
    expect(policy.state!.constraints).toEqual({});
    expect(policy.state!.updatedAt).toEqual(new Date('2025-06-08T12:00:00Z'));
  });

  it('rejects invalid tightnessLevel', () => {
    const id = StudentPolicyId.create('student-1');
    const policy = StudentPolicy.empty(id);

    expect(() =>
      policy.applyStrategicAdjustmentDecision({
        ...baseDecision,
        tightnessLevel: 'SuperTight',
      }),
    ).toThrow(InvalidTightnessLevelError);

    expect(policy.hasPolicy).toBe(false);
  });

  it('idempotent apply — same decision twice yields same state', () => {
    const id = StudentPolicyId.create('student-1');
    const policy = StudentPolicy.empty(id);

    policy.applyStrategicAdjustmentDecision(baseDecision);
    const stateAfterFirst = { ...policy.state! };

    policy.applyStrategicAdjustmentDecision(baseDecision);
    const stateAfterSecond = { ...policy.state! };

    expect(stateAfterSecond.tightnessLevel).toBe(stateAfterFirst.tightnessLevel);
    expect(stateAfterSecond.adjustmentMode).toBe(stateAfterFirst.adjustmentMode);
    expect(stateAfterSecond.dials).toEqual(stateAfterFirst.dials);
    expect(stateAfterSecond.constraints).toEqual(stateAfterFirst.constraints);
    expect(stateAfterSecond.updatedAt).toEqual(stateAfterFirst.updatedAt);
  });

  it('reconstitute restores aggregate from persisted state', () => {
    const id = StudentPolicyId.create('student-1');
    const state = {
      tightnessLevel: 'Normal' as const,
      adjustmentMode: null,
      dials: {},
      constraints: {},
      updatedAt: new Date('2025-06-01T12:00:00Z'),
    };

    const policy = StudentPolicy.reconstitute(id, state);
    expect(policy.hasPolicy).toBe(true);
    expect(policy.state!.tightnessLevel).toBe('Normal');
    expect(policy.state!.adjustmentMode).toBeNull();
  });

  it('does not mutate original decision dials/constraints', () => {
    const id = StudentPolicyId.create('student-1');
    const policy = StudentPolicy.empty(id);
    const dials = { scopeMultiplier: 0.7 };
    const constraints = { maxOpenLoops: 3 };

    policy.applyStrategicAdjustmentDecision({
      ...baseDecision,
      dials,
      constraints,
    });

    dials.scopeMultiplier = 999;
    (constraints as any).extra = true;

    expect(policy.state!.dials).toEqual({ scopeMultiplier: 0.7 });
    expect(policy.state!.constraints).toEqual({ maxOpenLoops: 3 });
  });
});
