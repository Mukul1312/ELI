export interface ResolveNormalizationEntryCommand {
  entryId: string;
  targetTopicId?: string;
  newAlias?: string;
  newTopicName?: string;
  resolvedBy: string;
}
