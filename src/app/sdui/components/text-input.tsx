'use client';

import type { SduiTextInput } from '@/ei/sdui/types/components';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#0f1117',
  border: '1px solid #2a2b35',
  borderRadius: 8,
  color: '#e4e4e7',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

export function SduiTextInput({
  node,
  value,
  onChange,
}: {
  node: SduiTextInput;
  value?: string | number;
  onChange?: (id: string, v: string | number) => void;
}) {
  const { inputId, label, placeholder, required } = node.props;
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 6 }}>
        {label}
        {required && ' *'}
      </label>
      <input
        style={inputStyle}
        value={value ?? ''}
        onChange={(e) => onChange?.(inputId, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
