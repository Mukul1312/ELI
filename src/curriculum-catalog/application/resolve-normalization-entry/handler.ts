import type {
  IResolveNormalizationEntryUseCase,
  ResolveNormalizationEntryCommand,
  ResolveNormalizationEntryResult,
} from './port';
import type { ICatalogRepository } from '../../domain/catalog-repository';
import type { INormalizationQueueRepository } from '../../domain/normalization-queue-repository';
import { TopicNotFoundError } from '../../domain/errors';

export class ResolveNormalizationEntryHandler implements IResolveNormalizationEntryUseCase {
  constructor(
    private readonly catalogRepo: ICatalogRepository,
    private readonly normalizationRepo: INormalizationQueueRepository,
  ) {}

  async execute(command: ResolveNormalizationEntryCommand): Promise<ResolveNormalizationEntryResult> {
    // 1. Load entry
    const entry = await this.normalizationRepo.findById(command.entryId);
    if (!entry) throw new TopicNotFoundError(command.entryId);

    let resolvedTopicId: string;

    if (command.targetTopicId) {
      // 2a. Map to existing topic
      const topic = await this.catalogRepo.findTopicById(command.targetTopicId);
      if (!topic) throw new TopicNotFoundError(command.targetTopicId);

      // Add alias if provided
      if (command.newAlias) {
        topic.addAlias(command.newAlias);
        await this.catalogRepo.saveTopic(topic);
      }

      resolvedTopicId = command.targetTopicId;
    } else if (command.newTopicName) {
      // 2b. The provisional topic already exists — find and promote it
      // The provisional topic was created during ResolveTopic; find it by the raw text alias
      const normalized = entry.rawText.trim().toLowerCase();
      const provisionalMatches = await this.catalogRepo.findTopicsByAlias(normalized);
      const provisional = provisionalMatches.find(t => t.provisional);

      if (provisional) {
        if (command.newTopicName) {
          // Update the name if ops provides a better one — but keep using saveTopic
          // (markResolved will clear provisional)
        }
        provisional.markResolved();
        if (command.newAlias) {
          provisional.addAlias(command.newAlias);
        }
        await this.catalogRepo.saveTopic(provisional);
        resolvedTopicId = provisional.id.value;
      } else {
        throw new TopicNotFoundError(`No provisional topic found for "${entry.rawText}"`);
      }
    } else {
      throw new TopicNotFoundError('Must provide targetTopicId or newTopicName');
    }

    // 3. Resolve the queue entry
    entry.resolve(resolvedTopicId, command.newAlias ?? null, command.resolvedBy);
    await this.normalizationRepo.save(entry);

    return {
      entryId: entry.id,
      status: 'resolved',
      resolvedTopicId,
    };
  }
}
