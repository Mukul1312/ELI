import type { ResolveNormalizationEntryCommand } from './command';

export type { ResolveNormalizationEntryCommand };

export interface ResolveNormalizationEntryResult {
  entryId: string;
  status: 'resolved';
  resolvedTopicId: string;
}

export interface IResolveNormalizationEntryUseCase {
  execute(command: ResolveNormalizationEntryCommand): Promise<ResolveNormalizationEntryResult>;
}
