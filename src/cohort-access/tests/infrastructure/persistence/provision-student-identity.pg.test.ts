/**
 * Integration test for ProvisionStudentIdentityPg.
 * Verifies race-safe upsert: insert when missing, return existing id when present.
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { CohortAccessDb } from '../../../infrastructure/persistence/db-types';
import { ProvisionStudentIdentityPg } from '../../../infrastructure/persistence/provision-student-identity.pg';
import { setupDbForTests } from '../../../../test/db-test-setup';
import { canUseNeonBranching } from '../../../../test/neon-postgres';

const shouldRunDbTests =
  !!process.env.DATABASE_URL || canUseNeonBranching();

const AUTH_USER_ID = `provision-test-auth-${Date.now()}`;

function adaptDb(db: { one: any; oneOrNone: any; none: any; many: any }): CohortAccessDb {
  return {
    one: db.one.bind(db),
    oneOrNone: db.oneOrNone.bind(db),
    many: db.many.bind(db),
    none: async (q: string, p?: unknown[]) => {
      await db.none(q, p);
    },
  };
}

async function cleanup(db: CohortAccessDb): Promise<void> {
  await db.none('DELETE FROM students WHERE auth_user_id = $1', [AUTH_USER_ID]);
}

describe.skipIf(!shouldRunDbTests)(
  'ProvisionStudentIdentityPg (integration)',
  () => {
    let db: CohortAccessDb;
    let provision: ProvisionStudentIdentityPg;
    let cleanupFn: () => Promise<void>;

    beforeAll(async () => {
      const setup = await setupDbForTests('provision-student-identity');
      db = adaptDb(setup.store.db);
      provision = new ProvisionStudentIdentityPg(db);
      cleanupFn = setup.cleanup;
    });

    afterAll(async () => {
      await cleanupFn();
    });

    beforeEach(async () => {
      await cleanup(db);
    });

    it('ensureMapping creates students row when missing and returns studentId with provisioned: true', async () => {
      const { studentId, provisioned } = await provision.ensureMapping(AUTH_USER_ID);
      expect(provisioned).toBe(true);
      expect(studentId).toBeDefined();
      expect(typeof studentId).toBe('string');
      expect(studentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      const row = await db.oneOrNone<{ id: string; auth_user_id: string }>(
        'SELECT id, auth_user_id FROM students WHERE auth_user_id = $1',
        [AUTH_USER_ID],
      );
      expect(row).not.toBeNull();
      expect(row!.id).toBe(studentId);
      expect(row!.auth_user_id).toBe(AUTH_USER_ID);
    });

    it('ensureMapping returns same studentId with provisioned: false when called again (idempotent)', async () => {
      const first = await provision.ensureMapping(AUTH_USER_ID);
      const second = await provision.ensureMapping(AUTH_USER_ID);
      expect(first.studentId).toBe(second.studentId);
      expect(first.provisioned).toBe(true);
      expect(second.provisioned).toBe(false);
    });

    it('ensureMapping does not create student_cohort_membership or roles', async () => {
      const { studentId } = await provision.ensureMapping(AUTH_USER_ID);

      const membership = await db.oneOrNone<{ student_id: string }>(
        'SELECT student_id FROM student_cohort_membership WHERE student_id = $1',
        [studentId],
      );
      expect(membership).toBeNull();

      const role = await db.oneOrNone<{ student_id: string }>(
        'SELECT student_id FROM roles WHERE student_id = $1',
        [studentId],
      );
      expect(role).toBeNull();
    });
  },
);
