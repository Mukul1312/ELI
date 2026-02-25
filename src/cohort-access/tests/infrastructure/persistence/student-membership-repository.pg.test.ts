import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresStore } from '@mastra/pg';
import type { CohortAccessDb } from '../../../infrastructure/persistence/db-types';
import { StudentMembershipRepositoryPg } from '../../../infrastructure/persistence/student-membership-repository.pg';
import { StudentId, CohortId } from '../../../domain/shared/ids';

const STUDENT_ID = '00000000-0000-0000-0000-000000000099';
const COHORT_ID_1 = '00000000-0000-0000-0000-000000000001';
const COHORT_ID_2 = '00000000-0000-0000-0000-000000000002';

function adaptDb(db: any): CohortAccessDb {
  return {
    one: db.one.bind(db),
    oneOrNone: db.oneOrNone.bind(db),
    many: db.many.bind(db),
    none: async (q: string, p?: unknown[]) => { await db.none(q, p); },
  };
}

async function cleanup(db: CohortAccessDb): Promise<void> {
  await db.none('DELETE FROM student_cohort_membership WHERE student_id = $1', [STUDENT_ID]);
  await db.none('DELETE FROM students WHERE id = $1', [STUDENT_ID]);
}

async function seedStudent(db: CohortAccessDb): Promise<void> {
  await db.none(
    `INSERT INTO students (id, auth_user_id) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [STUDENT_ID, `auth-${STUDENT_ID}`],
  );
}

describe.skipIf(!process.env.DATABASE_URL)(
  'StudentMembershipRepositoryPg (integration)',
  () => {
    let store: PostgresStore;
    let db: CohortAccessDb;

    beforeAll(async () => {
      store = new PostgresStore({
        id: 'cohort-access-membership-integration-test',
        connectionString: process.env.DATABASE_URL!,
      });
      db = adaptDb(store.db);
    });

    afterAll(async () => {
      await store.close();
    });

    beforeEach(async () => {
      await cleanup(db);
      await seedStudent(db);
    });

    it('findByStudentId returns null when no membership row exists', async () => {
      const repo = new StudentMembershipRepositoryPg(db);
      const result = await repo.findByStudentId(StudentId.create(STUDENT_ID));
      expect(result).toBeNull();
    });

    it('save creates membership row; findByStudentId returns aggregate with correct state', async () => {
      const repo = new StudentMembershipRepositoryPg(db);
      const studentId = StudentId.create(STUDENT_ID);
      const cohortId = CohortId.create(COHORT_ID_1);
      const now = new Date('2025-06-01T10:00:00Z');

      const membership = (await import('../../../domain/student-membership/student-membership'))
        .StudentMembership.create(studentId, cohortId, now);
      await repo.save(membership);

      const loaded = await repo.findByStudentId(studentId);
      expect(loaded).not.toBeNull();
      expect(loaded!.studentId.value).toBe(STUDENT_ID);
      expect(loaded!.cohortId?.value).toBe(COHORT_ID_1);
      expect(loaded!.membershipState).toBe('active');
    });

    it('save called twice (upsert): second call updates cohortId', async () => {
      const repo = new StudentMembershipRepositoryPg(db);
      const studentId = StudentId.create(STUDENT_ID);
      const { StudentMembership } = await import('../../../domain/student-membership/student-membership');

      const first = StudentMembership.create(studentId, CohortId.create(COHORT_ID_1), new Date());
      await repo.save(first);

      const second = StudentMembership.create(studentId, CohortId.create(COHORT_ID_2), new Date());
      await repo.save(second);

      const loaded = await repo.findByStudentId(studentId);
      expect(loaded!.cohortId?.value).toBe(COHORT_ID_2);
    });

    it('save with null cohortId stores unassigned state', async () => {
      const repo = new StudentMembershipRepositoryPg(db);
      const studentId = StudentId.create(STUDENT_ID);
      const { StudentMembership } = await import('../../../domain/student-membership/student-membership');

      const membership = StudentMembership.unassigned(studentId, new Date());
      await repo.save(membership);

      const loaded = await repo.findByStudentId(studentId);
      expect(loaded!.cohortId).toBeNull();
      expect(loaded!.membershipState).toBe('unassigned');
    });
  },
);
