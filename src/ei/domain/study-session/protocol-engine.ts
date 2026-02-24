/**
 * ProtocolEngine — Domain Service for play selection.
 * Stateless logic that doesn't naturally belong to any single entity.
 * Per ei-runtime-tactical-spec.md §8 and DDD-TACTICAL.md "Domain Service: When to Use".
 *
 * Responsibility: Given protocol, mode, and PlayContext → select the best play.
 * The 24 plays catalog lives in engine/plays.ts; this service delegates to it.
 */

import type { Mode } from '../loop-health/loop-health-snapshot';
import { selectPlay, type PlayContext } from '../../engine/plays';
import { PlaySelection } from './value-objects/play-selection';
import { PlaySelectionError } from './errors';

export interface IProtocolEngine {
  selectPlay(protocol: 1 | 2 | 3, mode: Mode, context: PlayContext): PlaySelection;
}

export class ProtocolEngine implements IProtocolEngine {
  selectPlay(protocol: 1 | 2 | 3, mode: Mode, context: PlayContext): PlaySelection {
    const play = selectPlay(protocol, mode, context);

    if (!play) {
      throw new PlaySelectionError(
        `No play found for protocol=${protocol} mode=${mode}`
      );
    }

    return PlaySelection.create(
      play.id,
      play.mode as Mode,
      play.protocol,
      play.name,
      play.description
    );
  }
}
