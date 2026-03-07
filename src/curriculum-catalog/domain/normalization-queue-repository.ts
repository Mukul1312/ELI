import type { NormalizationQueueEntry } from './normalization-queue-entry';

export interface INormalizationQueueRepository {
  append(entry: NormalizationQueueEntry): Promise<void>;
  findById(id: string): Promise<NormalizationQueueEntry | null>;
  save(entry: NormalizationQueueEntry): Promise<void>;
  listPending(limit?: number): Promise<NormalizationQueueEntry[]>;
}
