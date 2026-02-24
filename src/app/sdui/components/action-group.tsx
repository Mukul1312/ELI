'use client';

import type { SduiActionGroup } from '@/ei/sdui/types/components';

const btnStyles: Record<string, React.CSSProperties> = {
  primary: { background: '#4f46e5', color: '#fff', border: 'none' },
  secondary: { background: '#27272a', color: '#a1a1aa', border: '1px solid #3f3f46' },
  danger: { background: '#991b1b', color: '#fecaca', border: 'none' },
};

export function SduiActionGroup({
  node,
  onAction,
}: {
  node: SduiActionGroup;
  onAction?: (actionId: string) => void;
}) {
  const { layout, buttons } = node.props;
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: layout === 'column' ? 'column' : 'row',
    gap: 8,
    marginTop: 12,
  };
  return (
    <div style={containerStyle}>
      {buttons.map((b) => (
        <button
          key={b.actionId}
          type="button"
          onClick={() => !b.disabled && onAction?.(b.actionId)}
          disabled={b.disabled}
          title={b.disabledReason}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: b.disabled ? 'not-allowed' : 'pointer',
            opacity: b.disabled ? 0.6 : 1,
            ...btnStyles[b.variant],
          }}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
