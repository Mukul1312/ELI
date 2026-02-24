import type { IClock } from '../application/shared/port-clock';
import { EI_CLOCK_KEY } from './request-context';

/**
 * Returns the clock from request context, or a default that uses system time.
 * Use this in tools so tests can inject a fixed clock via context.
 */
export function getClock(context: any): IClock {
  const clock = context?.requestContext?.get(EI_CLOCK_KEY);
  if (clock) return clock as IClock;
  return { now: () => new Date() };
}
