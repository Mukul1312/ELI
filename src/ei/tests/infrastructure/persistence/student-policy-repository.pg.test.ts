import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresStore } from '@mastra/pg';
import type { EiDb } from '../../../runtime/db';
import { PostgresStudentPolicyRepository } from '../../../infrastructure/persistence/student-policy-repository.pg';
import { StudentPolicy } from '../../../domain/student-policy/student-policy';
import { StudentPolicyId } from '../../../domain/student-policy/value-objects';

const STUDENT_A = 'int-test-policy-a';
const STUDENT_B = 'int-test-policy-b';

async function cleanup(db: EiDb, ...studentIds: string[]): Promise<void> {
  for (const sid of studentIds) {
    await db.none('DELETE FROM ei_student_policy WHERE student_id = $1', [sid]);
  }
}

describe.skipIf(!process.env.DATABASE_URL)(
  'PostgresStudentPolicyRepository (integration)',
  () => {
    let store: PostgresStore;
    let db: EiDb;

    beforeAll(async () => {
      store = new PostgresStore({
        id: 'ei-integration-test-policy',
        connectionString: process.env.DATABASE_URL!,
      });
      db = store.db as EiDb;
    });

    afterAll(async () => {
      await store.close();
    });

    beforeEach(async () => {
      await cleanup(db, STUDENT_A, STUDENT_B);
    });

    it('findById returns null for unknown student', async () => {
      const repo = new PostgresStudentPolicyRepository(db);
      const id = StudentPolicyId.create(STUDENT_A);
      const result = await repo.findById(id);
      expect(result).toBeNull();
    });

    it('save + findById roundtrips', async () => {
      const repo = new PostgresStudentPolicyRepository(db);
      const id = StudentPolicyId.create(STUDENT_A);
      const policy = StudentPolicy.empty(id);

      policy.applyStrategicAdjustmentDecision({
        tightnessLevel: 'Tight',
        adjustmentMode: 'Recovery',
        dials: { scopeMultiplier: 0.7 },
        constraints: { maxOpenLoops: 3 },
        issuedAt: new Date('2025-06-01T12:00:00Z'),
      });

      await repo.save(policy);

      const loaded = await repo.findById(id);
      expect(loaded).not.toBeNull();
      expect(loaded!.state!.tightnessLevel).toBe('Tight');
      expect(loaded!.state!.adjustmentMode).toBe('Recovery');
      expect(loaded!.state!.dials).toEqual({ scopeMultiplier: 0.7 });
      expect(loaded!.state!.constraints).toEqual({ maxOpenLoops: 3 });
    });

    it('save overwrites existing policy', async () => {
      const repo = new PostgresStudentPolicyRepository(db);
      const id = StudentPolicyId.create(STUDENT_A);

      const policy1 = StudentPolicy.empty(id);
      policy1.applyStrategicAdjustmentDecision({
        tightnessLevel: 'Loose',
        adjustmentMode: null,
        dials: { scopeMultiplier: 1.0 },
        constraints: { maxOpenLoops: 5 },
        issuedAt: new Date('2025-06-01T12:00:00Z'),
      });
      await repo.save(policy1);

      const policy2 = (await repo.findById(id))!;
      policy2.applyStrategicAdjustmentDecision({
        tightnessLevel: 'Tight',
        adjustmentMode: 'IntegrityClamp',
        dials: { difficultyTierDelta: -1 },
        constraints: {},
        issuedAt: new Date('2025-06-08T12:00:00Z'),
      });
      await repo.save(policy2);

      const loaded = await repo.findById(id);
      expect(loaded!.state!.tightnessLevel).toBe('Tight');
      expect(loaded!.state!.adjustmentMode).toBe('IntegrityClamp');
      expect(loaded!.state!.dials).toEqual({ difficultyTierDelta: -1 });
      expect(loaded!.state!.constraints).toEqual({});
    });

    it('keeps separate policies per student', async () => {
      const repo = new PostgresStudentPolicyRepository(db);

      const policyA = StudentPolicy.empty(StudentPolicyId.create(STUDENT_A));
      policyA.applyStrategicAdjustmentDecision({
        tightnessLevel: 'Tight',
        adjustmentMode: 'Recovery',
        dials: {},
        constraints: {},
        issuedAt: new Date(),
      });

      const policyB = StudentPolicy.empty(StudentPolicyId.create(STUDENT_B));
      policyB.applyStrategicAdjustmentDecision({
        tightnessLevel: 'Loose',
        adjustmentMode: null,
        dials: {},
        constraints: {},
        issuedAt: new Date(),
      });

      await repo.save(policyA);
      await repo.save(policyB);

      const loadedA = await repo.findById(StudentPolicyId.create(STUDENT_A));
      const loadedB = await repo.findById(StudentPolicyId.create(STUDENT_B));

      expect(loadedA!.state!.tightnessLevel).toBe('Tight');
      expect(loadedB!.state!.tightnessLevel).toBe('Loose');
    });
  },
);
