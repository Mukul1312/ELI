/**
 * Minimal DB client interface for CohortAccess infrastructure.
 * Compatible with Mastra PostgresStore.db (pg-promise).
 * CohortAccess does not import from src/ei; this allows injection of the shared DB.
 */
export interface CohortAccessDb {
  one<T>(query: string, params?: unknown[]): Promise<T>;
  oneOrNone<T>(query: string, params?: unknown[]): Promise<T | null>;
  none(query: string, params?: unknown[]): Promise<void>;
  many<T>(query: string, params?: unknown[]): Promise<T[]>;
}
