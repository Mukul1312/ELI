import type { CohortAccessDb } from './db-types';
import type { IIdempotencyKeyStore } from '../../application/change-student-membership/port';
import { IdempotencyKeyConflictError } from '../../domain/student-membership/errors';

const KEY_PREFIX = 'cohort-access:MembershipChangeOnRedemption:';

/**
 * Stores cohort-access membership idempotency keys in the shared ei_idempotency_keys table.
 *
 * NOTE: The `event_id` column (originally named for EI ledger event IDs) is reused here to
 * store the targetCohortId string. Collision with EI entries is prevented by the namespaced
 * key prefix `cohort-access:MembershipChangeOnRedemption:` — EI keys never use this prefix.
 *
 * Schema: src/ei/db/migrate.ts — `ei_idempotency_keys` table.
 */
export class IdempotencyKeyStorePg implements IIdempotencyKeyStore {
  constructor(private readonly db: CohortAccessDb) {}

  async checkAndRecord(
    key: string,
    cohortId: string,
  ): Promise<{ exists: true; cohortId: string } | { exists: false }> {
    const fullKey = key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`;
    const existing = await this.db.oneOrNone<{ event_id: string }>(
      'SELECT event_id FROM ei_idempotency_keys WHERE key = $1',
      [fullKey],
    );
    if (existing) {
      if (existing.event_id !== cohortId) {
        throw new IdempotencyKeyConflictError(fullKey, existing.event_id, cohortId);
      }
      return { exists: true, cohortId: existing.event_id };
    }
    await this.db.none(
      'INSERT INTO ei_idempotency_keys (key, event_id) VALUES ($1, $2)',
      [fullKey, cohortId],
    );
    return { exists: false };
  }
}
