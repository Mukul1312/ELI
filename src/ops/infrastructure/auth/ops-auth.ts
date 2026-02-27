/**
 * OpsAuth: platform-level auth for timeline, backfill, replay.
 * API key, cron secret, or dev bypass. Not CohortAccess.
 *
 * Per ops-observability-tactical-spec: timeline and backfill use OpsAuth only.
 */

import type { NextRequest } from 'next/server';

function getBearerOrHeader(req: NextRequest, headerName: string): string | null {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (bearer) return bearer;
  return req.headers.get(headerName);
}

/**
 * Validates platform-level ops auth. Returns true if authorized.
 *
 * Auth sources (checked in order):
 * 1. Dev bypass — NODE_ENV=development. If OPS_DEV_BYPASS_SECRET set, require header match.
 * 2. CRON_SECRET — Authorization: Bearer or x-cron-secret
 * 3. OPS_API_KEY — Authorization: Bearer or x-ops-api-key
 *
 * Never active in production: dev bypass only when NODE_ENV=development.
 */
export function validateOpsAuth(req: NextRequest): boolean {
  // 1. Dev bypass
  if (process.env.NODE_ENV === 'development') {
    const expected = process.env.OPS_DEV_BYPASS_SECRET;
    if (!expected) return true;
    const secret = getBearerOrHeader(req, 'x-ops-dev-bypass');
    return secret === expected;
  }

  // 2. CRON_SECRET
  const cronExpected = process.env.CRON_SECRET;
  if (cronExpected) {
    const secret = getBearerOrHeader(req, 'x-cron-secret');
    if (secret === cronExpected) return true;
  }

  // 3. OPS_API_KEY
  const apiKeyExpected = process.env.OPS_API_KEY;
  if (apiKeyExpected) {
    const key = getBearerOrHeader(req, 'x-ops-api-key');
    if (key === apiKeyExpected) return true;
  }

  return false;
}
