import type { SearchResult } from './value-objects';

export interface ITopicSearchAdapter {
  search(query: string, instituteId: string | null, limit: number): Promise<SearchResult[]>;
}
