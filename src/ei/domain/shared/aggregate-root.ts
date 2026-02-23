export interface DomainEvent {
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
}

export abstract class AggregateRoot<ID> {
  protected readonly _id: ID;
  private readonly _domainEvents: DomainEvent[] = [];

  protected constructor(id: ID) {
    this._id = id;
  }

  get id(): ID {
    return this._id;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0;
    return events;
  }
}
