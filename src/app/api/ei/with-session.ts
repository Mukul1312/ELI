/**
 * EI auth wrapper: resolves session via CohortAccess ResolveAuthSession,
 * with PILOT_SECRET fallback when session is null (for dev/pilot).
 *
 * Returns either { authorized: true, studentId } or { authorized: false, response }.
 */

import { eiStore } from '@/ei/runtime/db';
import { createResolveAuthSessionUseCase } from '@/lib/cohort-access';
import { createServerGetSession } from '@/lib/auth/server';
import type { CohortAccessDb } from '@/cohort-access/infrastructure/persistence/db-types';

export type WithSessionResult =
  | { authorized: true; studentId: string }
  | { authorized: false; response: Response };

function isPilotAuthorized(req: Request): boolean {
  const secret = process.env.PILOT_SECRET;
  if (!secret) return false;
  const header = req.headers.get('Authorization') ?? '';
  return header === `Bearer ${secret}`;
}

/**
 * Resolve EI auth: try ResolveAuthSession, fall back to PILOT_SECRET + body.studentId when null.
 * Caller must parse body before calling if PILOT fallback is needed.
 */
/** Adapt EI db to CohortAccessDb (none returns void instead of null). */
function adaptDb(db: typeof eiStore.db): CohortAccessDb {
  return {
    one: db.one.bind(db),
    oneOrNone: db.oneOrNone.bind(db),
    many: db.many.bind(db),
    none: async (q, p) => {
      await db.none(q, p);
    },
  };
}

export async function withEiSession(
  req: Request,
  bodyStudentId?: string | null,
): Promise<WithSessionResult> {
  const db = adaptDb(eiStore.db);
  const getSession = createServerGetSession();
  const resolveAuth = createResolveAuthSessionUseCase(db, getSession);
  const authSession = await resolveAuth.execute({ sessionContext: req });

  if (authSession) {
    return { authorized: true, studentId: authSession.studentId };
  }

  if (isPilotAuthorized(req) && bodyStudentId) {
    return { authorized: true, studentId: bodyStudentId };
  }

  return {
    authorized: false,
    response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}
