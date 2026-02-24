/**
 * EI auth wrapper: resolves session via CohortAccess ResolveAuthSession.
 *
 * Returns either { authorized: true, studentId } or { authorized: false, response }.
 * studentId is always server-derived from the Neon Auth session — never trusted from client body.
 */

import { eiStore } from '@/ei/runtime/db';
import { createResolveAuthSessionUseCase } from '@/lib/cohort-access';
import { createServerGetSession } from '@/lib/auth/server';
import type { CohortAccessDb } from '@/cohort-access/infrastructure/persistence/db-types';

export type WithSessionResult =
  | { authorized: true; studentId: string }
  | { authorized: false; response: Response };

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

export async function withEiSession(req: Request): Promise<WithSessionResult> {
  const db = adaptDb(eiStore.db);
  const getSession = createServerGetSession();
  const resolveAuth = createResolveAuthSessionUseCase(db, getSession);
  const authSession = await resolveAuth.execute({ sessionContext: req });

  if (authSession) {
    return { authorized: true, studentId: authSession.studentId };
  }

  return {
    authorized: false,
    response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}
