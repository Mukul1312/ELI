import type { ITopicLoopRepository } from '../../domain/topic-loop/repository';
import { EVENT_TIMESTAMP_FIELD, isTopicLoopEventType } from '../../domain/topic-loop/events';
import { TopicLoop } from '../../domain/topic-loop/topic-loop';
import { TopicLoopId } from '../../domain/topic-loop/value-objects';
import type { ApplyEventCommand } from './command';
import type { IApplyEventToTopicLoopUseCase } from './port';
import { InvalidEventPayloadError } from './errors';

function parseTimestamp(raw: unknown): Date | null {
  if (raw === undefined || raw === null) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? null : d;
}

export class ApplyEventToTopicLoopHandler implements IApplyEventToTopicLoopUseCase {
  constructor(private readonly repo: ITopicLoopRepository) {}

  async execute(command: ApplyEventCommand): Promise<void> {
    const { studentId, topicId, eventType, payload } = command;
    const id = TopicLoopId.create(studentId, topicId);

    if (isTopicLoopEventType(eventType)) {
      const timestampField = EVENT_TIMESTAMP_FIELD[eventType];
      if (timestampField !== null) {
        const raw = payload[timestampField];
        const timestamp = parseTimestamp(raw);
        if (timestamp === null) {
          throw new InvalidEventPayloadError(
            `TopicLoop event ${eventType} requires valid ${timestampField}`,
            eventType,
            `Missing or invalid ${timestampField}`,
          );
        }
      }
    }

    let topicLoop = await this.repo.findById(id);
    if (!topicLoop) {
      topicLoop = TopicLoop.empty(id);
    }

    topicLoop.applyEvent(eventType, payload);
    await this.repo.save(topicLoop);
  }
}
