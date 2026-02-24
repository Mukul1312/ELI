/**
 * Microcopy resolver — priority chain lookup + variable interpolation.
 *
 * Resolution order (most specific → least):
 *   1. Play-specific (e.g. P1-R1 + scope_title)
 *   2. Mode-specific (e.g. Rescue + scope_title)
 *   3. Default (always exists)
 */

import type { Mode } from '../../schemas/outputs';
import type { MicrocopyCatalog, MicrocopySlot } from './catalog';

export interface MicrocopyKey {
  readonly gate: 'P1' | 'P2' | 'P3';
  readonly slot: MicrocopySlot;
  readonly mode: Mode;
  readonly playId: string;
}

/**
 * Resolve microcopy for a given key, then interpolate variables.
 *
 * Variables use {{name}} syntax: "You have {{count}} pending checks."
 */
export function resolveMicrocopy(
  catalog: MicrocopyCatalog,
  key: MicrocopyKey,
  vars: Record<string, string | number> = {},
): string {
  const gateCatalog = catalog[key.gate];
  if (!gateCatalog) return interpolate(catalog._fallback, vars);

  const slotCatalog = gateCatalog[key.slot];
  if (!slotCatalog) return interpolate(catalog._fallback, vars);

  // 1. Play-specific
  const playText = slotCatalog.byPlay?.[key.playId];
  if (playText) return interpolate(playText, vars);

  // 2. Mode-specific
  const modeText = slotCatalog.byMode?.[key.mode];
  if (modeText) return interpolate(modeText, vars);

  // 3. Default
  return interpolate(slotCatalog.default, vars);
}

function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
    const val = vars[varName];
    return val !== undefined ? String(val) : `{{${varName}}}`;
  });
}
