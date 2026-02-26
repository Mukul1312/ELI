/**
 * ResolveStudentScopeAdapter — implements IResolveStudentScopePort.
 * Empty studentIds → listActiveStudents; otherwise return as-is.
 */

import type { EiDb } from '@/ei/runtime/db';
import type { IResolveStudentScopePort } from '@/ops/application/start-backfill-job/port';
import { listActiveStudents } from '@/ei/db/queries';

const DEFAULT_ACTIVE_DAYS = 30;

export class ResolveStudentScopeAdapter implements IResolveStudentScopePort {
  constructor(private readonly db: EiDb) {}

  async resolveStudentIds(emptyOrIds: string[]): Promise<string[]> {
    if (emptyOrIds.length > 0) {
      return emptyOrIds;
    }
    return listActiveStudents(this.db, DEFAULT_ACTIVE_DAYS);
  }
}
