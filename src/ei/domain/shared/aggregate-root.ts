export abstract class AggregateRoot<ID> {
  protected readonly _id: ID;

  protected constructor(id: ID) {
    this._id = id;
  }

  get id(): ID {
    return this._id;
  }
}
