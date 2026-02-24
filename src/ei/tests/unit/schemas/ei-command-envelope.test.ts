import { describe, it, expect } from 'vitest';
import { EiCommandEnvelopeSchema } from '../../../application/ei-protocol-router';

describe('EiCommandEnvelopeSchema', () => {
  it('accepts command with optional idempotencyKey', () => {
    const parsed = EiCommandEnvelopeSchema.safeParse({
      commandType: 'AppOpen',
      payload: { initial: true },
      idempotencyKey: 'key-123',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.idempotencyKey).toBe('key-123');
      expect(parsed.data.commandType).toBe('AppOpen');
    }
  });

  it('accepts command without idempotencyKey', () => {
    const parsed = EiCommandEnvelopeSchema.safeParse({
      commandType: 'AppOpen',
      payload: { initial: true },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.idempotencyKey).toBeUndefined();
    }
  });

  it('rejects invalid command payload', () => {
    const parsed = EiCommandEnvelopeSchema.safeParse({
      commandType: 'AppOpen',
      payload: { invalid: true },
      idempotencyKey: 'key-123',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects unknown keys in envelope (returns 400, not silently stripped)', () => {
    const parsed = EiCommandEnvelopeSchema.safeParse({
      commandType: 'AppOpen',
      payload: { initial: true },
      unknownKey: 'x',
    });
    expect(parsed.success).toBe(false);
  });
});
