import { NormalizationEntryAlreadyResolvedError } from './errors';

export interface NormalizationQueueEntryProps {
  id: string;
  rawText: string;
  studentId: string;
  occurredAt: Date;
  status: 'pending' | 'resolved';
  resolvedTopicId: string | null;
  resolvedAlias: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  createdAt: Date;
}

export class NormalizationQueueEntry {
  private _id: string;
  private _rawText: string;
  private _studentId: string;
  private _occurredAt: Date;
  private _status: 'pending' | 'resolved';
  private _resolvedTopicId: string | null;
  private _resolvedAlias: string | null;
  private _resolvedAt: Date | null;
  private _resolvedBy: string | null;
  private _createdAt: Date;

  private constructor(props: NormalizationQueueEntryProps) {
    this._id = props.id;
    this._rawText = props.rawText;
    this._studentId = props.studentId;
    this._occurredAt = props.occurredAt;
    this._status = props.status;
    this._resolvedTopicId = props.resolvedTopicId;
    this._resolvedAlias = props.resolvedAlias;
    this._resolvedAt = props.resolvedAt;
    this._resolvedBy = props.resolvedBy;
    this._createdAt = props.createdAt;
  }

  static create(id: string, rawText: string, studentId: string): NormalizationQueueEntry {
    const now = new Date();
    return new NormalizationQueueEntry({
      id,
      rawText,
      studentId,
      occurredAt: now,
      status: 'pending',
      resolvedTopicId: null,
      resolvedAlias: null,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: now,
    });
  }

  static reconstitute(props: NormalizationQueueEntryProps): NormalizationQueueEntry {
    return new NormalizationQueueEntry(props);
  }

  get id(): string {
    return this._id;
  }

  get rawText(): string {
    return this._rawText;
  }

  get studentId(): string {
    return this._studentId;
  }

  get occurredAt(): Date {
    return this._occurredAt;
  }

  get status(): 'pending' | 'resolved' {
    return this._status;
  }

  get resolvedTopicId(): string | null {
    return this._resolvedTopicId;
  }

  get resolvedAlias(): string | null {
    return this._resolvedAlias;
  }

  get resolvedAt(): Date | null {
    return this._resolvedAt;
  }

  get resolvedBy(): string | null {
    return this._resolvedBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  resolve(topicId: string, alias: string | null, resolvedBy: string): void {
    if (this._status === 'resolved') {
      throw new NormalizationEntryAlreadyResolvedError(this._id);
    }
    this._status = 'resolved';
    this._resolvedTopicId = topicId;
    this._resolvedAlias = alias;
    this._resolvedAt = new Date();
    this._resolvedBy = resolvedBy;
  }

  toProps(): NormalizationQueueEntryProps {
    return {
      id: this._id,
      rawText: this._rawText,
      studentId: this._studentId,
      occurredAt: this._occurredAt,
      status: this._status,
      resolvedTopicId: this._resolvedTopicId,
      resolvedAlias: this._resolvedAlias,
      resolvedAt: this._resolvedAt,
      resolvedBy: this._resolvedBy,
      createdAt: this._createdAt,
    };
  }
}
