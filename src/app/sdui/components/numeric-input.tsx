'use client';

import type { SduiNumericInput } from '@/ei/study-session-orchestration/domain/types/components';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text-primary)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

export function SduiNumericInput({
  node,
  value,
  onChange,
}: {
  node: SduiNumericInput;
  value?: string | number;
  onChange?: (id: string, v: string | number) => void;
}) {
  const { inputId, label, min, placeholder, required } = node.props;
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
        {label}
        {required && ' *'}
      </label>
      <input
        type="number"
        min={min}
        style={inputStyle}
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          const num = v === '' ? 0 : parseInt(v, 10);
          onChange?.(inputId, isNaN(num) ? 0 : num);
        }}
        placeholder={placeholder}
      />
    </div>
  );
}
