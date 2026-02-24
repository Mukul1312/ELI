'use client';

import * as React from 'react';
import type { SduiScaleInput } from '@/ei/sdui/types/components';

const chipStyle = (selected: boolean): React.CSSProperties => ({
  padding: '7px 14px',
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  border: selected ? '2px solid #818cf8' : '1px solid #3f3f46',
  background: selected ? '#312e81' : '#1a1b23',
  color: selected ? '#c7d2fe' : '#a1a1aa',
  transition: 'all 0.15s',
});

export function SduiScaleInput({
  node,
  value,
  onChange,
}: {
  node: SduiScaleInput;
  value?: string | number;
  onChange?: (id: string, v: string | number) => void;
}) {
  const { inputId, label, chips, required, collapsible } = node.props;
  const [collapsed, setCollapsed] = React.useState(!collapsible?.defaultOpen);

  const chipRow = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
      {chips.map((c) => (
        <button
          key={String(c.value)}
          type="button"
          style={chipStyle(value === c.value)}
          onClick={() => onChange?.(inputId, c.value)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );

  if (collapsible) {
    return (
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: 12,
            textDecoration: 'underline',
            color: '#71717a',
            fontSize: 13,
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? collapsible.toggleLabel : 'Hide context'}
        </button>
        {!collapsed && (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 6 }}>
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
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 6 }}>
        {label}
        {required && ' *'}
      </label>
      {chipRow}
    </div>
  );
}
