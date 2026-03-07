import { describe, it, expect } from 'vitest';
import { TopicReference, TopicId, ExamId, SubjectId, UnitId, ChapterId } from '../domain/value-objects';
import { CatalogTopic } from '../domain/catalog-topic';
import { NormalizationQueueEntry } from '../domain/normalization-queue-entry';
import {
  InvalidTopicReferenceError,
  InvalidIdentifierError,
  NormalizationEntryAlreadyResolvedError,
} from '../domain/errors';

// ── Sentinel IDs for hierarchy FKs ─────────────────────────────────────
const SENTINEL = '00000000-0000-0000-0000-000000000000';

function makeTopicProps(overrides: Partial<Parameters<typeof CatalogTopic.create>[0]> = {}) {
  return {
    id: 'aaaaaaaa-1111-2222-3333-444444444444',
    name: 'Thermodynamics',
    aliases: ['thermo'],
    examId: SENTINEL,
    subjectId: SENTINEL,
    unitId: SENTINEL,
    chapterId: SENTINEL,
    provisional: false,
    ...overrides,
  };
}

// ── TopicReference ─────────────────────────────────────────────────────

describe('TopicReference', () => {
  it('creates with valid topicId and topicName', () => {
    const ref = TopicReference.create('abc-123', 'Thermodynamics');
    expect(ref.topicId).toBe('abc-123');
    expect(ref.topicName).toBe('Thermodynamics');
  });

  it('trims whitespace', () => {
    const ref = TopicReference.create('  abc-123  ', '  Thermo  ');
    expect(ref.topicId).toBe('abc-123');
    expect(ref.topicName).toBe('Thermo');
  });

  it('throws for empty topicId', () => {
    expect(() => TopicReference.create('', 'Thermo')).toThrow(InvalidTopicReferenceError);
  });

  it('throws for empty topicName', () => {
    expect(() => TopicReference.create('abc', '')).toThrow(InvalidTopicReferenceError);
  });

  it('equals returns true for same values', () => {
    const a = TopicReference.create('id-1', 'Name');
    const b = TopicReference.create('id-1', 'Name');
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different values', () => {
    const a = TopicReference.create('id-1', 'Name');
    const b = TopicReference.create('id-2', 'Name');
    expect(a.equals(b)).toBe(false);
  });
});

// ── Identity VOs ───────────────────────────────────────────────────────

describe('Identity VOs', () => {
  const cases: Array<{ name: string; factory: (v: string) => unknown }> = [
    { name: 'TopicId', factory: TopicId.create },
    { name: 'ExamId', factory: ExamId.create },
    { name: 'SubjectId', factory: SubjectId.create },
    { name: 'UnitId', factory: UnitId.create },
    { name: 'ChapterId', factory: ChapterId.create },
  ];

  for (const { name, factory } of cases) {
    it(`${name}.create throws for empty string`, () => {
      expect(() => factory('')).toThrow(InvalidIdentifierError);
      expect(() => factory('   ')).toThrow(InvalidIdentifierError);
    });

    it(`${name}.create succeeds for valid string`, () => {
      const vo = factory('valid-id') as { value: string };
      expect(vo.value).toBe('valid-id');
    });
  }

  it('TopicId.equals works', () => {
    const a = TopicId.create('id-1');
    const b = TopicId.create('id-1');
    const c = TopicId.create('id-2');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

// ── CatalogTopic ───────────────────────────────────────────────────────

describe('CatalogTopic', () => {
  it('create sets timestamps and wraps ids', () => {
    const topic = CatalogTopic.create(makeTopicProps());
    expect(topic.id.value).toBe('aaaaaaaa-1111-2222-3333-444444444444');
    expect(topic.name).toBe('Thermodynamics');
    expect(topic.aliases).toEqual(['thermo']);
    expect(topic.provisional).toBe(false);
    expect(topic.createdAt).toBeInstanceOf(Date);
  });

  it('reconstitute hydrates from stored props', () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const topic = CatalogTopic.reconstitute({
      ...makeTopicProps(),
      createdAt: now,
      updatedAt: now,
    });
    expect(topic.createdAt).toEqual(now);
    expect(topic.updatedAt).toEqual(now);
  });

  it('addAlias appends normalized alias', () => {
    const topic = CatalogTopic.create(makeTopicProps({ aliases: [] }));
    topic.addAlias('  THERMO  ');
    expect(topic.aliases).toContain('thermo');
  });

  it('addAlias deduplicates', () => {
    const topic = CatalogTopic.create(makeTopicProps({ aliases: ['thermo'] }));
    topic.addAlias('thermo');
    expect(topic.aliases).toEqual(['thermo']);
  });

  it('addAlias ignores empty string', () => {
    const topic = CatalogTopic.create(makeTopicProps({ aliases: [] }));
    topic.addAlias('   ');
    expect(topic.aliases).toEqual([]);
  });

  it('markResolved clears provisional flag', () => {
    const topic = CatalogTopic.create(makeTopicProps({ provisional: true }));
    expect(topic.provisional).toBe(true);
    topic.markResolved();
    expect(topic.provisional).toBe(false);
  });

  it('markResolved is idempotent on non-provisional', () => {
    const topic = CatalogTopic.create(makeTopicProps({ provisional: false }));
    const before = topic.updatedAt;
    topic.markResolved();
    // updatedAt shouldn't change if already non-provisional
    expect(topic.updatedAt).toEqual(before);
  });

  it('toTopicReference returns valid VO', () => {
    const topic = CatalogTopic.create(makeTopicProps());
    const ref = topic.toTopicReference();
    expect(ref.topicId).toBe('aaaaaaaa-1111-2222-3333-444444444444');
    expect(ref.topicName).toBe('Thermodynamics');
  });

  it('toProps round-trips', () => {
    const props = makeTopicProps();
    const topic = CatalogTopic.create(props);
    const out = topic.toProps();
    expect(out.id).toBe(props.id);
    expect(out.name).toBe(props.name);
    expect(out.aliases).toEqual(props.aliases);
    expect(out.provisional).toBe(props.provisional);
  });
});

// ── NormalizationQueueEntry ────────────────────────────────────────────

describe('NormalizationQueueEntry', () => {
  it('create sets status to pending', () => {
    const entry = NormalizationQueueEntry.create('entry-1', 'thermodynamix', 'student-1');
    expect(entry.id).toBe('entry-1');
    expect(entry.rawText).toBe('thermodynamix');
    expect(entry.studentId).toBe('student-1');
    expect(entry.status).toBe('pending');
    expect(entry.resolvedTopicId).toBeNull();
  });

  it('resolve transitions pending to resolved', () => {
    const entry = NormalizationQueueEntry.create('entry-1', 'thermodynamix', 'student-1');
    entry.resolve('topic-uuid', 'thermo', 'ops-user');
    expect(entry.status).toBe('resolved');
    expect(entry.resolvedTopicId).toBe('topic-uuid');
    expect(entry.resolvedAlias).toBe('thermo');
    expect(entry.resolvedBy).toBe('ops-user');
    expect(entry.resolvedAt).toBeInstanceOf(Date);
  });

  it('resolve throws if already resolved', () => {
    const entry = NormalizationQueueEntry.create('entry-1', 'thermodynamix', 'student-1');
    entry.resolve('topic-uuid', null, 'ops-user');
    expect(() => entry.resolve('topic-uuid-2', null, 'ops-user')).toThrow(
      NormalizationEntryAlreadyResolvedError
    );
  });

  it('reconstitute hydrates from stored props', () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const entry = NormalizationQueueEntry.reconstitute({
      id: 'entry-1',
      rawText: 'thermodynamix',
      studentId: 'student-1',
      occurredAt: now,
      status: 'resolved',
      resolvedTopicId: 'topic-uuid',
      resolvedAlias: 'thermo',
      resolvedAt: now,
      resolvedBy: 'ops',
      createdAt: now,
    });
    expect(entry.status).toBe('resolved');
    expect(entry.resolvedTopicId).toBe('topic-uuid');
  });

  it('toProps round-trips', () => {
    const entry = NormalizationQueueEntry.create('entry-1', 'raw', 'student-1');
    const props = entry.toProps();
    expect(props.id).toBe('entry-1');
    expect(props.status).toBe('pending');
    expect(props.resolvedTopicId).toBeNull();
  });
});
