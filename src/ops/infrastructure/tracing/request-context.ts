/**
 * Request-scoped context using AsyncLocalStorage.
 *
 * Allows the API route (composition root) to set a traced DB for the current request.
 * Downstream code calls getDb() to get the request-scoped traced DB or the raw fallback.
 *
 * Per ops-observability-tactical-spec.md §8 (Phase 3): "transparent wrapping at composition root."
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { EiDb } from '@/ei/runtime/db';

interface RequestContext {
  tracedDb: EiDb;
  correlationId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Returns the request-scoped traced DB if inside a traced context,
 * otherwise returns the raw fallback.
 */
export function getRequestDb(fallback: EiDb): EiDb {
  return requestContext.getStore()?.tracedDb ?? fallback;
}

/** Returns the current request's correlationId, or undefined if not in a traced context. */
export function getRequestCorrelationId(): string | undefined {
  return requestContext.getStore()?.correlationId;
}
