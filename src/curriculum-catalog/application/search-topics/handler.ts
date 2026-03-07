import type { ISearchTopicsUseCase, SearchTopicsCommand } from './port';
import type { ITopicSearchAdapter } from '../../domain/topic-search-service';
import type { SearchResult } from '../../domain/value-objects';

export class SearchTopicsHandler implements ISearchTopicsUseCase {
  constructor(private readonly searchAdapter: ITopicSearchAdapter) {}

  async execute(command: SearchTopicsCommand): Promise<SearchResult[]> {
    const query = command.query.trim();
    if (query.length < 2) return [];

    return this.searchAdapter.search(
      query,
      command.instituteId ?? null,
      command.limit ?? 10,
    );
  }
}
