/**
 * RunEiCommandHandler unit tests.
 *
 * AppOpen (first-touch) uses checkinViewWorkflow which requires no DB.
 * Other commands require DB; test them in integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvalidCommandError } from '../../../../application/run-ei-command/errors';

// Mock DB before any workflow loads it (ei/runtime/db throws without DATABASE_URL)
vi.mock('../../../../runtime/db', () => ({
  eiStore: { db: {} },
}));

describe('RunEiCommandHandler', () => {
  let handler: InstanceType<typeof import('../../../../application/run-ei-command/handler').RunEiCommandHandler>;

  beforeEach(async () => {
    const { RunEiCommandHandler } = await import('../../../../application/run-ei-command/handler');
    handler = new RunEiCommandHandler();
  });

  it('AppOpen (first-touch) returns checkin view with schemaVersion, phase, view, actions', async () => {
    const result = await handler.execute({
      command: { commandType: 'AppOpen', payload: { initial: true } },
      studentId: 'student-1',
    });

    // Mastra returns run output; checkin workflow yields SduiResponse (may be wrapped)
    const data = result as Record<string, unknown>;
    const payload = data.result ?? data;
    const sdui = (typeof payload === 'object' && payload !== null && 'result' in payload)
      ? (payload as { result: Record<string, unknown> }).result
      : payload;

    expect(sdui).toBeDefined();
    expect((sdui as Record<string, unknown>).schemaVersion).toBe(1);
    expect((sdui as Record<string, unknown>).phase).toBe('checkin');
    expect((sdui as Record<string, unknown>).view).toBeDefined();
    expect((sdui as Record<string, unknown>).actions).toBeDefined();
  });

  it('AppOpen accepts optional idempotencyKey', async () => {
    const result = await handler.execute({
      command: { commandType: 'AppOpen', payload: { initial: true } },
      studentId: 'student-1',
      idempotencyKey: 'key-app-open-1',
    });

    expect(result).toBeDefined();
  });

  it('throws InvalidCommandError for unknown commandType', async () => {
    await expect(
      handler.execute({
        command: {
          commandType: 'UnknownCommand' as 'AppOpen',
          payload: {},
        } as never,
        studentId: 'student-1',
      }),
    ).rejects.toThrow(InvalidCommandError);
  });
});
