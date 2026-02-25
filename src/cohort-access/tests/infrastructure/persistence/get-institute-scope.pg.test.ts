import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { CohortAccessDb } from '../../../infrastructure/persistence/db-types';
import { GetInstituteScopePg } from '../../../infrastructure/persistence/get-institute-scope.pg';
import { setupDbForTests } from '../../../../test/db-test-setup';
import { canUseNeonBranching } from '../../../../test/neon-postgres';

const shouldRunDbTests =
  !!process.env.DATABASE_URL || canUseNeonBranching();

// Use fixed UUIDs for test isolation
const STUDENT_ID = '00000000-0000-0000-9999-000000000001';
const COHORT_ID_A = '00000000-0000-0000-9999-000000000010';
const COHORT_ID_B = '00000000-0000-0000-9999-000000000011';
const INSTITUTE_ID = '00000000-0000-0000-9999-000000000020';

function adaptDb(db: any): CohortAccessDb {
  return {
    one: db.one.bind(db),
    oneOrNone: db.oneOrNone.bind(db),
    many: db.many.bind(db),
    none: async (q: string, p?: unknown[]) => { await db.none(q, p); },
  };
}

async function cleanupData(db: CohortAccessDb): Promise<void> {
  await db.none('DELETE FROM roles WHERE student_id = $1', [STUDENT_ID]);
  await db.none('DELETE FROM students WHERE id = $1', [STUDENT_ID]);
  await db.none('DELETE FROM cohorts WHERE id IN ($1, $2)', [COHORT_ID_A, COHORT_ID_B]);
  await db.none('DELETE FROM institutes WHERE id = $1', [INSTITUTE_ID]);
}

async function seedBase(db: CohortAccessDb): Promise<void> {
  await db.none(
    `INSERT INTO institutes (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [INSTITUTE_ID, 'Test Institute'],
  );
  await db.none(
    `INSERT INTO cohorts (id, institute_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [COHORT_ID_A, INSTITUTE_ID, 'Cohort A'],
  );
  await db.none(
    `INSERT INTO cohorts (id, institute_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [COHORT_ID_B, INSTITUTE_ID, 'Cohort B'],
  );
  await db.none(
    `INSERT INTO students (id, auth_user_id, institute_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [STUDENT_ID, `auth-${STUDENT_ID}`, INSTITUTE_ID],
  );
}

describe.skipIf(!shouldRunDbTests)(
  'GetInstituteScopePg (integration)',
  () => {
    let db: CohortAccessDb;
    let cleanup: () => Promise<void>;

    beforeAll(async () => {
      const setup = await setupDbForTests('get-institute-scope');
      db = adaptDb(setup.store.db);
      cleanup = setup.cleanup;
    });

    afterAll(async () => {
      await cleanup();
    });

    beforeEach(async () => {
      await cleanupData(db);
      await seedBase(db);
    });

    it('unknown user returns default: empty cohortIds, student role, cohort scope', async () => {
      const adapter = new GetInstituteScopePg(db);
      // Must pass valid UUID — roles.student_id is UUID; non-UUID causes query error
      const result = await adapter.getScope('00000000-0000-0000-0000-000000000088');
      expect(result.cohortIds).toEqual([]);
      expect(result.role.value).toBe('student');
      expect(result.accessScope.scope).toBe('cohort');
    });

    it('institute user with no scope (NULL): returns global scope', async () => {
      await db.none(
        `INSERT INTO roles (student_id, role, scope) VALUES ($1, $2, NULL)`,
        [STUDENT_ID, 'institute'],
      );
      const adapter = new GetInstituteScopePg(db);
      const result = await adapter.getScope(STUDENT_ID);
      expect(result.role.value).toBe('institute');
      expect(result.accessScope.scope).toBe('global');
      expect(result.cohortIds).toEqual([]);
    });

    it('user with comma-separated cohortIds in scope: parses correctly', async () => {
      const scopeValue = `${COHORT_ID_A},${COHORT_ID_B}`;
      await db.none(
        `INSERT INTO roles (student_id, role, scope) VALUES ($1, $2, $3)`,
        [STUDENT_ID, 'admin', scopeValue],
      );
      const adapter = new GetInstituteScopePg(db);
      const result = await adapter.getScope(STUDENT_ID);
      expect(result.role.value).toBe('admin');
      expect(result.cohortIds).toEqual([COHORT_ID_A, COHORT_ID_B]);
      expect(result.accessScope.scope).toBe('cohort');
      expect(result.accessScope.cohortIds).toEqual([COHORT_ID_A, COHORT_ID_B]);
    });
  },
);
