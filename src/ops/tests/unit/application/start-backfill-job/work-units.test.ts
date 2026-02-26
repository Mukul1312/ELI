/**
 * Work units unit tests.
 * Verifies enumerateWorkUnits ordering, count, and projection filtering; isAllowedProjection.
 */

import { describe, it, expect } from 'vitest';
import { enumerateWorkUnits, isAllowedProjection } from '../../../../application/start-backfill-job/work-units';

describe('enumerateWorkUnits', () => {
  it('orders units: TopicLoop (with topicId) before StudentAggregates before StudentPolicy per student', () => {
    const topicsByStudent = new Map<string, string[]>([
      ['s1', ['t2', 't1']],
      ['s2', ['t3']],
    ]);
    const { units } = enumerateWorkUnits(
      ['TopicLoop', 'StudentAggregates', 'StudentPolicy'],
      ['s2', 's1'],
      topicsByStudent
    );

    expect(units).toHaveLength(7); // s1: 2 TopicLoop + SA + SP = 4; s2: 1 TopicLoop + SA + SP = 3

    const s1Units = units.filter((u) => u.studentId === 's1');
    const s2Units = units.filter((u) => u.studentId === 's2');

    expect(s1Units[0]).toEqual({ projection: 'TopicLoop', studentId: 's1', topicId: 't1' });
    expect(s1Units[1]).toEqual({ projection: 'TopicLoop', studentId: 's1', topicId: 't2' });
    expect(s1Units[2]).toEqual({ projection: 'StudentAggregates', studentId: 's1' });
    expect(s1Units[3]).toEqual({ projection: 'StudentPolicy', studentId: 's1' });

    expect(s2Units[0]).toEqual({ projection: 'TopicLoop', studentId: 's2', topicId: 't3' });
    expect(s2Units[1]).toEqual({ projection: 'StudentAggregates', studentId: 's2' });
    expect(s2Units[2]).toEqual({ projection: 'StudentPolicy', studentId: 's2' });
  });

  it('sorts students by studentId and topics by topicId', () => {
    const topicsByStudent = new Map<string, string[]>([
      ['s2', ['tz', 'ta']],
      ['s1', ['tb', 'ta']],
    ]);
    const { units } = enumerateWorkUnits(
      ['TopicLoop', 'StudentAggregates'],
      ['s2', 's1'],
      topicsByStudent
    );

    expect(units[0].studentId).toBe('s1');
    expect(units[0].topicId).toBe('ta');
    expect(units[1].topicId).toBe('tb');
    expect(units[2].projection).toBe('StudentAggregates');
    expect(units[3].studentId).toBe('s2');
    expect(units[3].topicId).toBe('ta');
  });

  it('total matches units.length', () => {
    const topicsByStudent = new Map<string, string[]>([['s1', ['t1', 't2']]]);
    const { units, total } = enumerateWorkUnits(
      ['TopicLoop', 'StudentAggregates', 'StudentPolicy'],
      ['s1'],
      topicsByStudent
    );
    expect(total).toBe(units.length);
    expect(total).toBe(2 + 1 + 1);
  });

  it('empty topics yields only StudentAggregates + StudentPolicy per student', () => {
    const topicsByStudent = new Map<string, string[]>([
      ['s1', []],
      ['s2', []],
    ]);
    const { units } = enumerateWorkUnits(
      ['TopicLoop', 'StudentAggregates', 'StudentPolicy'],
      ['s1', 's2'],
      topicsByStudent
    );
    expect(units).toHaveLength(4);
    expect(units.every((u) => u.projection !== 'TopicLoop' || u.topicId != null)).toBe(true);
    const topicLoopUnits = units.filter((u) => u.projection === 'TopicLoop');
    expect(topicLoopUnits).toHaveLength(0);
    expect(units.filter((u) => u.projection === 'StudentAggregates')).toHaveLength(2);
    expect(units.filter((u) => u.projection === 'StudentPolicy')).toHaveLength(2);
  });

  it('only requested projections appear (TopicLoop only)', () => {
    const topicsByStudent = new Map<string, string[]>([['s1', ['t1']]]);
    const { units } = enumerateWorkUnits(['TopicLoop'], ['s1'], topicsByStudent);
    expect(units).toHaveLength(1);
    expect(units[0]).toEqual({ projection: 'TopicLoop', studentId: 's1', topicId: 't1' });
  });

  it('only requested projections appear (StudentAggregates only)', () => {
    const topicsByStudent = new Map<string, string[]>([['s1', ['t1']]]);
    const { units } = enumerateWorkUnits(['StudentAggregates'], ['s1'], topicsByStudent);
    expect(units).toHaveLength(1);
    expect(units[0]).toEqual({ projection: 'StudentAggregates', studentId: 's1' });
  });

  it('only requested projections appear (StudentPolicy only)', () => {
    const topicsByStudent = new Map<string, string[]>([]);
    const { units } = enumerateWorkUnits(['StudentPolicy'], ['s1'], topicsByStudent);
    expect(units).toHaveLength(1);
    expect(units[0]).toEqual({ projection: 'StudentPolicy', studentId: 's1' });
  });
});

describe('isAllowedProjection', () => {
  it('accepts TopicLoop', () => {
    expect(isAllowedProjection('TopicLoop')).toBe(true);
  });
  it('accepts StudentAggregates', () => {
    expect(isAllowedProjection('StudentAggregates')).toBe(true);
  });
  it('accepts StudentPolicy', () => {
    expect(isAllowedProjection('StudentPolicy')).toBe(true);
  });
  it('rejects UnknownProjection', () => {
    expect(isAllowedProjection('UnknownProjection')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isAllowedProjection('')).toBe(false);
  });
  it('rejects random string', () => {
    expect(isAllowedProjection('FakeProjection')).toBe(false);
  });
});
