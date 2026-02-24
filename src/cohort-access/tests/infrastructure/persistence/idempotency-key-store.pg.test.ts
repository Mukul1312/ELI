import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresStore } from '@mastra/pg';
import type { CohortAccessDb } from '../../../infrastructure/persistence/db-types';
import { IdempotencyKeyStorePg } from '../../../infrastructure/persistence/idempotency-key-store.pg';
import { IdempotencyKeyConflictError } from '../../../domain/student-membership/errors';

const KEY_PREFIX = 'cohort-access:MembershipChangeOnRedemption:';
const TEST_KEY = 'int-test-idempotency-key-1';
const COHORT_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_COHORT_ID = '00000000-0000-0000-0000-000000000002';

function adaptDb(db: any): CohortAccessDb {
  return {
    one: db.one.bind(db),
    oneOrNone: db.oneOrNone.bind(db),
    many: db.many.bind(db),
    none: async (q: string, p?: unknown[]) => { await db.none(q, p); },
  };
}

async function cleanup(db: CohortAccessDb): Promise<void> {
  await db.none(
    `DELETE FROM ei_idempotency_keys WHERE key LIKE $1`,
    [`${KEY_PREFIX}int-test-%`],
  );
}

describe.skipIf(!process.env.DATABASE_URL)(
  'IdempotencyKeyStorePg (integration)',
  () => {
    let store: PostgresStore;
    let db: CohortAccessDb;

    beforeAll(async () => {
      store = new PostgresStore({
        id: 'cohort-access-idempotency-integration-test',
        connectionString: process.env.DATABASE_URL!,
      });
      db = adaptDb(store.db);
    });

    afterAll(async () => {
      await store.close();
    });

    beforeEach(async () => {
      await cleanup(db);
    });

    it('first call: returns { exists: false } and inserts row', async () => {
      const store = new IdempotencyKeyStorePg(db);
      const result = await store.checkAndRecord(TEST_KEY, COHORT_ID);
      expect(result).toEqual({ exists: false });
    });

    it('second call with same key + same cohortId: returns { exists: true, cohortId }', async () => {
      const idempStore = new IdempotencyKeyStorePg(db);
      await idempStore.checkAndRecord(TEST_KEY, COHORT_ID);
      const result = await idempStore.checkAndRecord(TEST_KEY, COHORT_ID);
      expect(result).toEqual({ exists: true, cohortId: COHORT_ID });
    });

    it('call with same key + different cohortId: throws IdempotencyKeyConflictError', async () => {
      const idempStore = new IdempotencyKeyStorePg(db);
      await idempStore.checkAndRecord(TEST_KEY, COHORT_ID);
      await expect(
        idempStore.checkAndRecord(TEST_KEY, OTHER_COHORT_ID),
      ).rejects.toThrow(IdempotencyKeyConflictError);
    });

    it('key prefix is prepended if not already present', async () => {
      const idempStore = new IdempotencyKeyStorePg(db);
      await idempStore.checkAndRecord(TEST_KEY, COHORT_ID);
      // Verify the row was stored with the prefix by calling again with the prefixed key
      const result = await idempStore.checkAndRecord(`${KEY_PREFIX}${TEST_KEY}`, COHORT_ID);
      expect(result).toEqual({ exists: true, cohortId: COHORT_ID });
    });
  },
);
