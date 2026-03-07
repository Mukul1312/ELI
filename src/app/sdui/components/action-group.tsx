'use client';

import type { SduiActionGroup } from '@/ei/sdui/types/components';

const btnStyles: Record<string, React.CSSProperties> = {
  primary: { background: 'var(--color-accent)', color: '#fff', border: 'none' },
  secondary: { background: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-strong)' },
  danger: { background: '#C0392B', color: '#fff', border: 'none' },
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
