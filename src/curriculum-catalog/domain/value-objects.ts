import { ValueObject } from '@/ei/domain/shared/value-object';
import { InvalidTopicReferenceError, InvalidIdentifierError } from './errors';

// ── Published Language VO ──────────────────────────────────────────────
// Consumed by EI Runtime, Projections, Radar.

interface TopicReferenceProps {
  topicId: string;
  topicName: string;
}

export class TopicReference extends ValueObject<TopicReferenceProps> {
  private constructor(props: TopicReferenceProps) {
    super(props);
  }

  static create(topicId: string, topicName: string): TopicReference {
    if (!topicId?.trim()) throw new InvalidTopicReferenceError('topicId must be non-empty');
    if (!topicName?.trim()) throw new InvalidTopicReferenceError('topicName must be non-empty');
    return new TopicReference({ topicId: topicId.trim(), topicName: topicName.trim() });
  }

  get topicId(): string {
    return this.props.topicId;
  }

  get topicName(): string {
    return this.props.topicName;
  }
}

// ── Identity VOs ───────────────────────────────────────────────────────

export class TopicId {
  private constructor(private readonly _value: string) {}

  static create(value: string): TopicId {
    if (!value?.trim()) throw new InvalidIdentifierError('TopicId');
    return new TopicId(value.trim());
  }

  get value(): string {
    return this._value;
  }

  equals(other: TopicId): boolean {
    return other !== null && other !== undefined && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export class ExamId {
  private constructor(private readonly _value: string) {}

  static create(value: string): ExamId {
    if (!value?.trim()) throw new InvalidIdentifierError('ExamId');
    return new ExamId(value.trim());
  }

  get value(): string {
    return this._value;
  }

  equals(other: ExamId): boolean {
    return other !== null && other !== undefined && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export class SubjectId {
  private constructor(private readonly _value: string) {}

  static create(value: string): SubjectId {
    if (!value?.trim()) throw new InvalidIdentifierError('SubjectId');
    return new SubjectId(value.trim());
  }

  get value(): string {
    return this._value;
  }

  equals(other: SubjectId): boolean {
    return other !== null && other !== undefined && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export class UnitId {
  private constructor(private readonly _value: string) {}

  static create(value: string): UnitId {
    if (!value?.trim()) throw new InvalidIdentifierError('UnitId');
    return new UnitId(value.trim());
  }

  get value(): string {
    return this._value;
  }

  equals(other: UnitId): boolean {
    return other !== null && other !== undefined && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export class ChapterId {
  private constructor(private readonly _value: string) {}

  static create(value: string): ChapterId {
    if (!value?.trim()) throw new InvalidIdentifierError('ChapterId');
    return new ChapterId(value.trim());
  }

  get value(): string {
    return this._value;
  }

  equals(other: ChapterId): boolean {
    return other !== null && other !== undefined && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

// ── Structural VOs ─────────────────────────────────────────────────────

export type MatchType = 'exact_name' | 'alias' | 'fuzzy' | 'provisional';

export interface SearchResult {
  topicId: string;
  topicName: string;
  examName: string;
  matchType: MatchType;
  isInstituteCurriculum: boolean;
}

export interface ImportResult {
  created: number;
  deduplicated: number;
  errors: string[];
}

export interface CurriculumTreeNode {
  id: string;
  name: string;
  type: 'exam' | 'subject' | 'unit' | 'chapter' | 'topic';
  childCount: number;
}

export interface CurriculumTreeLevel {
  level: 'exam' | 'subject' | 'unit' | 'chapter' | 'topic';
  parentId: string | null;
  nodes: CurriculumTreeNode[];
}
