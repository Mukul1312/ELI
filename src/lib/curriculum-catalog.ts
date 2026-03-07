/**
 * Composition root for CurriculumCatalog bounded context.
 * Wires adapters and handlers. No DI container; manual constructor injection.
 */

import type { CurriculumCatalogDb } from '@/curriculum-catalog/infrastructure/persistence/db-types';
import { PostgresCatalogRepository } from '@/curriculum-catalog/infrastructure/persistence/catalog-repository.pg';
import { PostgresNormalizationQueueRepository } from '@/curriculum-catalog/infrastructure/persistence/normalization-queue-repository.pg';
import { PostgresTopicSearchAdapter } from '@/curriculum-catalog/infrastructure/search/topic-search-adapter.pg';
import { SearchTopicsHandler } from '@/curriculum-catalog/application/search-topics/handler';
import { BrowseTreeHandler } from '@/curriculum-catalog/application/browse-tree/handler';
import { ResolveTopicHandler } from '@/curriculum-catalog/application/resolve-topic/handler';
import { ImportCurriculumHandler } from '@/curriculum-catalog/application/import-curriculum/handler';
import { ResolveNormalizationEntryHandler } from '@/curriculum-catalog/application/resolve-normalization-entry/handler';
import type { ISearchTopicsUseCase } from '@/curriculum-catalog/application/search-topics/port';
import type { IBrowseTreeUseCase } from '@/curriculum-catalog/application/browse-tree/port';
import type { IResolveTopicUseCase } from '@/curriculum-catalog/application/resolve-topic/port';
import type { IImportCurriculumUseCase } from '@/curriculum-catalog/application/import-curriculum/port';
import type { IResolveNormalizationEntryUseCase } from '@/curriculum-catalog/application/resolve-normalization-entry/port';

export function createSearchTopicsUseCase(db: CurriculumCatalogDb): ISearchTopicsUseCase {
  const searchAdapter = new PostgresTopicSearchAdapter(db);
  return new SearchTopicsHandler(searchAdapter);
}

export function createBrowseTreeUseCase(db: CurriculumCatalogDb): IBrowseTreeUseCase {
  const catalogRepo = new PostgresCatalogRepository(db);
  return new BrowseTreeHandler(catalogRepo);
}

export function createResolveTopicUseCase(db: CurriculumCatalogDb): IResolveTopicUseCase {
  const catalogRepo = new PostgresCatalogRepository(db);
  const searchAdapter = new PostgresTopicSearchAdapter(db);
  const normalizationRepo = new PostgresNormalizationQueueRepository(db);
  return new ResolveTopicHandler(catalogRepo, searchAdapter, normalizationRepo);
}

export function createImportCurriculumUseCase(db: CurriculumCatalogDb): IImportCurriculumUseCase {
  const catalogRepo = new PostgresCatalogRepository(db);
  return new ImportCurriculumHandler(catalogRepo);
}

export function createResolveNormalizationEntryUseCase(
  db: CurriculumCatalogDb,
): IResolveNormalizationEntryUseCase {
  const catalogRepo = new PostgresCatalogRepository(db);
  const normalizationRepo = new PostgresNormalizationQueueRepository(db);
  return new ResolveNormalizationEntryHandler(catalogRepo, normalizationRepo);
}
