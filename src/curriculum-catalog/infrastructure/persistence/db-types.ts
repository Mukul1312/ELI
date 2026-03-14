/**
 * Minimal DB client interface for CurriculumCatalog infrastructure.
 * Compatible with Mastra PostgresStore.db (pg-promise).
 * CurriculumCatalog does not import from src/ei; this allows injection of the shared DB.
 */
export interface CurriculumCatalogDb {
  one<T>(query: string, params?: unknown[]): Promise<T>;
  oneOrNone<T>(query: string, params?: unknown[]): Promise<T | null>;
  none(query: string, params?: unknown[]): Promise<null>;
  many<T>(query: string, params?: unknown[]): Promise<T[]>;
  manyOrNone<T>(query: string, params?: unknown[]): Promise<T[]>;
}
