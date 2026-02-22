import { describe, it, expect } from 'vitest';
import { validateEventPayload } from '../../../schemas/validate-event-payload';

describe('validateEventPayload', () => {
  it('accepts valid SessionEnd payload', () => {
    const result = validateEventPayload('SessionEnd', {
      studentId: 's1',
      topic: 't1',
      endedAt: '2025-04-01T10:00:00Z',
    });
    expect(result.studentId).toBe('s1');
    expect(result.topic).toBe('t1');
    expect(result.endedAt).toBe('2025-04-01T10:00:00Z');
  });

  it('rejects SessionEnd with missing required field', () => {
    expect(() =>
      validateEventPayload('SessionEnd', { studentId: 's1', topic: 't1' }),
    ).toThrow(/endedAt|Invalid payload/);
  });

  it('rejects SessionEnd with unknown top-level key when using strict schema', () => {
    expect(() =>
      validateEventPayload('SessionEnd', {
        studentId: 's1',
        topic: 't1',
        endedAt: '2025-04-01T10:00:00Z',
        extraKey: 'bad',
      }),
    ).toThrow();
  });

  it('returns payload as-is for unmapped event type', () => {
    const payload = { foo: 'bar' };
    const result = validateEventPayload('UnknownEventType', payload);
    expect(result).toEqual(payload);
  });
});
