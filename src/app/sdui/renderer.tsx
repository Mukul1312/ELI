'use client';

import type { SduiComponent } from '@/ei/sdui/types/components';
import type { SduiViewTree, SduiAction, SduiResponse } from '@/ei/sdui/types/sdui-contract';
import { getSduiComponent } from './registry';

// ─── Helpers ───────────────────────────────────────────────────────────────

const SYSTEM_TOKENS: Record<string, () => string | number> = {
  __nowIso: () => new Date().toISOString(),
  __nowEpochMs: () => Date.now(),
};

/** Recursively replace {{inputId}} in payload with formValues[inputId] or system tokens. */
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
        out[k] = fv !== undefined ? fv : v;
      }
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = resolvePayload(v as Record<string, unknown>, formValues);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ─── SduiSlot ──────────────────────────────────────────────────────────────

export function SduiSlot({
  components,
  formValues,
  onFormChange,
  onAction,
}: {
  components: SduiComponent[];
  formValues: Record<string, string | number>;
  onFormChange: (id: string, value: string | number) => void;
  onAction: (actionId: string) => void;
}) {
  return (
    <>
      {components.map((node, i) => {
        const Comp = getSduiComponent(node.type);
        if (!Comp) return <span key={i} />;
        const value = 'inputId' in node.props ? formValues[node.props.inputId] : undefined;
        return (
          <Comp
            key={i}
            node={node}
            value={value}
            onChange={onFormChange}
            onAction={onAction}
          />
        );
      })}
    </>
  );
}

// ─── SduiView ───────────────────────────────────────────────────────────────

export function SduiView({
  view,
  actions,
  formValues,
  onFormChange,
  onAction,
}: {
  view: SduiViewTree;
  actions: Record<string, SduiAction>;
  formValues: Record<string, string | number>;
  onFormChange: (id: string, value: string | number) => void;
  onAction: (actionId: string) => void;
}) {
  const slotProps = {
    formValues,
    onFormChange,
    onAction,
  };
  return (
    <div>
      <SduiSlot components={view.header} {...slotProps} />
      <SduiSlot components={view.body} {...slotProps} />
      <SduiSlot components={view.actions} {...slotProps} />
      <SduiSlot components={view.footer} {...slotProps} />
    </div>
  );
}
