/**
 * Microcopy catalog types.
 */

import type { Mode } from '../../schemas/outputs';

export interface SlotCatalog {
  default: string;
  byMode?: Partial<Record<Mode, string>>;
  byPlay?: Record<string, string>;
}

export interface GateCatalog {
  [slot: string]: SlotCatalog;
}
