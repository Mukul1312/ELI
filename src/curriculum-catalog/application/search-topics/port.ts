import type { SearchTopicsCommand } from './command';
import type { SearchResult } from '../../domain/value-objects';

export type { SearchTopicsCommand };

export interface ISearchTopicsUseCase {
  execute(command: SearchTopicsCommand): Promise<SearchResult[]>;
}
