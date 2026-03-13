'use client';

import * as React from 'react';
import type { SduiScaleInput } from '@/ei/study-session-orchestration/domain/types/components';

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
  formValues,
}: {
  node: SduiScaleInput;
  value?: string | number;
  onChange?: (id: string, v: string | number) => void;
  formValues?: Record<string, string | number>;
}) {
  const { inputId, label, chips, required, collapsible, showNumber, hiddenChipsByTopic, defaultByTopic, topicSourceField } = node.props;
  const [collapsed, setCollapsed] = React.useState(!collapsible?.defaultOpen);

  // ── Topic-aware chip filtering & default ─────────────────────────────────
  const selectedTopic = topicSourceField && formValues ? String(formValues[topicSourceField] ?? '') : '';
  const hiddenValues = selectedTopic && hiddenChipsByTopic ? hiddenChipsByTopic[selectedTopic] : undefined;
  const hiddenSet = React.useMemo(
    () => new Set((hiddenValues ?? []).map(String)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTopic],
  );
  const visibleChips = hiddenSet.size > 0 ? chips.filter((c) => !hiddenSet.has(String(c.value))) : chips;

  // Auto-select default when topic changes and no value is selected yet (or current value is hidden)
  const topicDefault = selectedTopic && defaultByTopic ? defaultByTopic[selectedTopic] : undefined;
  const appliedDefaultRef = React.useRef('');
  React.useEffect(() => {
    if (!topicDefault || !selectedTopic || !onChange) return;
    if (appliedDefaultRef.current === selectedTopic) return;
    if (value === undefined || hiddenSet.has(String(value))) {
      appliedDefaultRef.current = selectedTopic;
      onChange(inputId, topicDefault);
    }
  }, [selectedTopic, topicDefault, value, hiddenSet, onChange, inputId]);

  const chipRow = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)', marginBottom: 'var(--sp-4)' }}>
      {visibleChips.map((c, i) => (
        <button
          key={String(c.value)}
          type="button"
          style={chipStyle(value === c.value, i, visibleChips.length)}
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
