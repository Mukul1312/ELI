'use client';

import * as React from 'react';
import type { SduiScaleInput } from '@/ei/sdui/types/components';

/** Chip style per Phase 1 spec: 44px height, 12px radius, 12px/10px padding, flex:1 for row fill. */
function chipStyle(selected: boolean, index: number, total: number): React.CSSProperties {
  const flexBasis = total > 0 ? `calc(${100 / total}% - var(--sp-1) * ${(total - 1) / total})` : undefined;
  return {
    flex: 1,
    minWidth: 0,
    ...(flexBasis && { flexBasis }),
    padding: '10px 12px',
    height: 44,
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-label)',
    fontWeight: 500,
    cursor: 'pointer',
    border: selected ? '1.5px solid var(--color-accent-border)' : '1px solid var(--color-border)',
    background: selected ? 'var(--color-accent-soft)' : 'var(--color-surface)',
    color: selected ? 'var(--color-accent)' : 'var(--color-text-primary)',
    transition: 'background 120ms, border 120ms',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  };
}

export function SduiScaleInput({
  node,
  value,
  onChange,
}: {
  node: SduiScaleInput;
  value?: string | number;
  onChange?: (id: string, v: string | number) => void;
}) {
  const { inputId, label, chips, required, collapsible, showNumber } = node.props;
  const [collapsed, setCollapsed] = React.useState(!collapsible?.defaultOpen);

  const chipRow = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)', marginBottom: 'var(--sp-4)' }}>
      {chips.map((c, i) => (
        <button
          key={String(c.value)}
          type="button"
          style={chipStyle(value === c.value, i, chips.length)}
          onClick={() => onChange?.(inputId, c.value)}
        >
          <span>{c.label}</span>
          {showNumber && (
            <span style={{ fontSize: 'var(--font-size-caption)', fontWeight: 400, color: 'var(--color-text-tertiary)' }}>
              ({String(c.value)})
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--font-size-label)',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--sp-3)',
  };

  if (collapsible) {
    return (
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: 'var(--sp-3)',
            textDecoration: 'underline',
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--font-size-caption)',
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? collapsible.toggleLabel : 'Hide context'}
        </button>
        {!collapsed && (
          <>
            <label style={labelStyle}>
              {label}
              {required && ' *'}
            </label>
            {chipRow}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 'var(--sp-4)' }}>
      <label style={labelStyle}>
        {label}
        {required && ' *'}
      </label>
      {chipRow}
    </div>
  );
}
