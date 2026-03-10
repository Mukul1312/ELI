'use client';

import type { SduiComponent } from '@/ei/sdui/types/components';
import type { SduiViewTree, SduiAction, SduiSlotEntry } from '@/ei/sdui/types/sdui-contract';
import { getSduiComponent } from './registry';

// ─── Helpers ───────────────────────────────────────────────────────────────

const SYSTEM_TOKENS: Record<string, () => string | number> = {
  __nowIso: () => new Date().toISOString(),
  __nowEpochMs: () => Date.now(),
};

/** Recursively replace {{inputId}} in payload with formValues[inputId] or system tokens. Unresolved placeholders are omitted so optional fields are not sent as literal "{{id}}". */
export function resolvePayload(
  payload: Record<string, unknown>,
  formValues: Record<string, string | number>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === 'string' && v.startsWith('{{') && v.endsWith('}}')) {
      const id = v.slice(2, -2);
      const systemFn = SYSTEM_TOKENS[id];
      if (systemFn) {
        out[k] = systemFn();
      } else {
        const fv = formValues[id];
        if (fv !== undefined) out[k] = fv;
        // omit key when unresolved so server optional fields (e.g. pressure) are not sent as "{{pressure}}"
      }
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = resolvePayload(v as Record<string, unknown>, formValues);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ─── Slot Entry helpers ───────────────────────────────────────────────────

function isGrouped(entry: SduiSlotEntry): entry is { component: SduiComponent; visibilityGroup: string; initiallyVisible: boolean } {
  return 'component' in entry && 'visibilityGroup' in entry;
}

// ─── SduiSlot ──────────────────────────────────────────────────────────────

export function SduiSlot({
  components,
  formValues,
  onFormChange,
  onAction,
  visibleGroups,
  revealingGroups,
}: {
  components: SduiSlotEntry[];
  formValues: Record<string, string | number>;
  onFormChange: (id: string, value: string | number) => void;
  onAction: (actionId: string) => void;
  visibleGroups?: Set<string>;
  revealingGroups?: Set<string>;
}) {
  return (
    <>
      {components.map((entry, i) => {
        const node = isGrouped(entry) ? entry.component : (entry as SduiComponent);
        const group = isGrouped(entry) ? entry.visibilityGroup : undefined;

        // Visibility check: ungrouped always visible; grouped requires group in set
        if (group && visibleGroups && !visibleGroups.has(group)) return null;

        const Comp = getSduiComponent(node.type);
        if (!Comp) return <span key={i} />;
        const value = 'inputId' in node.props ? formValues[node.props.inputId] : undefined;

        const inner = (
          <Comp
            key={i}
            node={node}
            value={value}
            onChange={onFormChange}
            onAction={onAction}
            formValues={formValues}
          />
        );

        // Wrap with slide-in animation if this group is currently revealing
        if (group && revealingGroups?.has(group)) {
          return <div key={i} className="disclosure-reveal">{inner}</div>;
        }
        return inner;
      })}
    </>
  );
}

// ─── SduiView ───────────────────────────────────────────────────────────────

export function SduiView({
  view,
  formValues,
  onFormChange,
  onAction,
}: {
  view: SduiViewTree;
  formValues: Record<string, string | number>;
  onFormChange: (id: string, value: string | number) => void;
  onAction: (actionId: string) => void;
}) {
  const slotProps = {
    formValues,
    onFormChange,
    onAction,
  };
  const header = view?.header ?? [];
  const body = view?.body ?? [];
  const actionsSlot = view?.actions ?? [];
  return (
    <div>
      <SduiSlot components={header} {...slotProps} />
      <SduiSlot components={body} {...slotProps} />
      <SduiSlot components={actionsSlot} {...slotProps} />
    </div>
  );
}
