import { TopicId, ExamId, SubjectId, UnitId, ChapterId, TopicReference } from './value-objects';

export interface CatalogTopicProps {
  id: string;
  name: string;
  aliases: string[];
  examId: string;
  subjectId: string;
  unitId: string;
  chapterId: string;
  provisional: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CatalogTopic {
  private _id: TopicId;
  private _name: string;
  private _aliases: string[];
  private _examId: ExamId;
  private _subjectId: SubjectId;
  private _unitId: UnitId;
  private _chapterId: ChapterId;
  private _provisional: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: CatalogTopicProps) {
    this._id = TopicId.create(props.id);
    this._name = props.name;
    this._aliases = [...props.aliases];
    this._examId = ExamId.create(props.examId);
    this._subjectId = SubjectId.create(props.subjectId);
    this._unitId = UnitId.create(props.unitId);
    this._chapterId = ChapterId.create(props.chapterId);
    this._provisional = props.provisional;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: Omit<CatalogTopicProps, 'createdAt' | 'updatedAt'>): CatalogTopic {
    const now = new Date();
    return new CatalogTopic({ ...props, createdAt: now, updatedAt: now });
  }

  static reconstitute(props: CatalogTopicProps): CatalogTopic {
    return new CatalogTopic(props);
  }

  get id(): TopicId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get aliases(): readonly string[] {
    return this._aliases;
  }

  get examId(): ExamId {
    return this._examId;
  }

  get subjectId(): SubjectId {
    return this._subjectId;
  }

  get unitId(): UnitId {
    return this._unitId;
  }

  get chapterId(): ChapterId {
    return this._chapterId;
  }

  get provisional(): boolean {
    return this._provisional;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  addAlias(alias: string): void {
    const normalized = alias.trim().toLowerCase();
    if (normalized && !this._aliases.includes(normalized)) {
      this._aliases.push(normalized);
      this._updatedAt = new Date();
    }
  }

  markResolved(): void {
    if (this._provisional) {
      this._provisional = false;
      this._updatedAt = new Date();
    }
  }

  toTopicReference(): TopicReference {
    return TopicReference.create(this._id.value, this._name);
  }

  toProps(): CatalogTopicProps {
    return {
      id: this._id.value,
      name: this._name,
      aliases: [...this._aliases],
      examId: this._examId.value,
      subjectId: this._subjectId.value,
      unitId: this._unitId.value,
      chapterId: this._chapterId.value,
      provisional: this._provisional,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
