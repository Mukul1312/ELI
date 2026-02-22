import { describe, it, expect, beforeEach } from 'vitest';
import { ApplyStrategicAdjustmentDecisionHandler } from '../../../../application/apply-strategic-adjustment-decision/handler';
import type { IStudentPolicyRepository } from '../../../../domain/student-policy/repository';
import type { StudentPolicy } from '../../../../domain/student-policy/student-policy';
import type { StudentPolicyId } from '../../../../domain/student-policy/value-objects';
import { MissingStudentIdError, InvalidTightnessLevelError } from '../../../../domain/student-policy/errors';

class InMemoryStudentPolicyRepository implements IStudentPolicyRepository {
  private store = new Map<string, StudentPolicy>();

  async findById(id: StudentPolicyId): Promise<StudentPolicy | null> {
    return this.store.get(id.studentId) ?? null;
  }

  async save(policy: StudentPolicy): Promise<void> {
    this.store.set(policy.studentId, policy);
  }

  getAll(): StudentPolicy[] {
    return Array.from(this.store.values());
  }
}

describe('ApplyStrategicAdjustmentDecisionHandler', () => {
  let repo: InMemoryStudentPolicyRepository;
  let handler: ApplyStrategicAdjustmentDecisionHandler;

  const baseCommand = {
    studentId: 'student-1',
    tightnessLevel: 'Tight',
    adjustmentMode: 'Recovery' as string | null,
    dials: { scopeMultiplier: 0.7 },
    constraints: { maxOpenLoops: 3 },
    issuedAt: new Date('2025-06-01T12:00:00Z'),
  };

  beforeEach(() => {
    repo = new InMemoryStudentPolicyRepository();
    handler = new ApplyStrategicAdjustmentDecisionHandler(repo);
  });

  it('creates new policy for unknown student', async () => {
    await handler.execute(baseCommand);

    const all = repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].state!.tightnessLevel).toBe('Tight');
    expect(all[0].state!.adjustmentMode).toBe('Recovery');
    expect(all[0].state!.dials).toEqual({ scopeMultiplier: 0.7 });
    expect(all[0].state!.constraints).toEqual({ maxOpenLoops: 3 });
  });

  it('replaces existing policy', async () => {
    await handler.execute(baseCommand);

    await handler.execute({
      studentId: 'student-1',
      tightnessLevel: 'Loose',
      adjustmentMode: 'DifficultyRaise',
      dials: { difficultyTierDelta: 1 },
      constraints: {},
      issuedAt: new Date('2025-06-08T12:00:00Z'),
    });

    const all = repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].state!.tightnessLevel).toBe('Loose');
    expect(all[0].state!.adjustmentMode).toBe('DifficultyRaise');
    expect(all[0].state!.dials).toEqual({ difficultyTierDelta: 1 });
    expect(all[0].state!.constraints).toEqual({});
  });

  it('rejects missing studentId', async () => {
    await expect(
      handler.execute({ ...baseCommand, studentId: '' }),
    ).rejects.toThrow(MissingStudentIdError);

    expect(repo.getAll()).toHaveLength(0);
  });

  it('rejects invalid tightnessLevel', async () => {
    await expect(
      handler.execute({ ...baseCommand, tightnessLevel: 'Invalid' }),
    ).rejects.toThrow(InvalidTightnessLevelError);

    expect(repo.getAll()).toHaveLength(0);
  });

  it('idempotent — same command twice yields same state', async () => {
    await handler.execute(baseCommand);
    await handler.execute(baseCommand);

    const all = repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].state!.tightnessLevel).toBe('Tight');
    expect(all[0].state!.dials).toEqual({ scopeMultiplier: 0.7 });
  });

  it('handles null adjustmentMode', async () => {
    await handler.execute({
      ...baseCommand,
      adjustmentMode: null,
    });

    const all = repo.getAll();
    expect(all[0].state!.adjustmentMode).toBeNull();
  });

  it('keeps separate policies for different students', async () => {
    await handler.execute(baseCommand);
    await handler.execute({
      ...baseCommand,
      studentId: 'student-2',
      tightnessLevel: 'Normal',
    });

    const all = repo.getAll();
    expect(all).toHaveLength(2);
  });
});
