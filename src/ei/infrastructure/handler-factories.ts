/**
 * Handler factories — centralize adapter/handler construction.
 *
 * Per ADR-005 §C9: 51 `new` adapter/handler constructions across 16 files.
 * Each factory: create adapters → construct handler → return. 5-10 lines each.
 * Per ADR-005 §C13: well below the 15-adapter threshold for reconsidering DI.
 */

import type { EiDb } from '../runtime/db';
import { PostgresAppendEventAdapter, withIdempotencyKey } from './persistence/append-event.pg';
import { PostgresGetStudentSignalsAdapter } from './persistence/get-student-signals.pg';
import { PostgresQueryEventsAdapter } from './persistence/query-events.pg';
import { PostgresStudySessionRepository } from './persistence/study-session-repository.pg';
import { AssessLoopHealthHandler } from '../application/assess-loop-health/handler';
import { ProtocolEngine } from '../domain/study-session/protocol-engine';
import { RunDeclaredIntentHandler } from '../application/run-declared-intent/handler';
import { RunP1GateHandler } from '../application/run-p1-gate/handler';
import { RunP2GateHandler } from '../application/run-p2-gate/handler';

export function createDeclaredIntentHandler(
  db: EiDb,
  idempotencyKey?: string,
): RunDeclaredIntentHandler {
  const baseAdapter = new PostgresAppendEventAdapter(db);
  const appendEvent = idempotencyKey ? withIdempotencyKey(baseAdapter, idempotencyKey) : baseAdapter;
  return new RunDeclaredIntentHandler(appendEvent);
}

export function createP1GateHandler(
  db: EiDb,
  idempotencyKey?: string,
): RunP1GateHandler {
  const signalsPort = new PostgresGetStudentSignalsAdapter(db);
  const baseAdapter = new PostgresAppendEventAdapter(db);
  const appendEvent = idempotencyKey ? withIdempotencyKey(baseAdapter, idempotencyKey) : baseAdapter;
  return new RunP1GateHandler(
    signalsPort,
    new AssessLoopHealthHandler(signalsPort, { now: () => new Date() }),
    appendEvent,
    new ProtocolEngine(),
  );
}

export function createP2GateHandler(
  db: EiDb,
  idempotencyKey?: string,
): RunP2GateHandler {
  const signalsPort = new PostgresGetStudentSignalsAdapter(db);
  const baseAdapter = new PostgresAppendEventAdapter(db);
  const appendEvent = idempotencyKey ? withIdempotencyKey(baseAdapter, idempotencyKey) : baseAdapter;
  return new RunP2GateHandler(
    signalsPort,
    new AssessLoopHealthHandler(signalsPort, { now: () => new Date() }),
    appendEvent,
    new PostgresQueryEventsAdapter(db),
    new ProtocolEngine(),
    new PostgresStudySessionRepository(db),
  );
}
