'use client';

import type { SduiPendingItemsList } from '@/ei/sdui/types/components';

export function SduiPendingItemsList({
  node,
  onAction,
}: {
  node: SduiPendingItemsList;
  onAction?: (actionId: string) => void;
}) {
  const { items, overflowLabel } = node.props;
  const MAX_VISIBLE = 5;
  const visible = items.slice(0, MAX_VISIBLE);

  return (
    <div style={{ marginBottom: 'var(--sp-4)' }}>
      {visible.map((item) => (
        <button
          key={item.topicId}
          type="button"
          onClick={() => onAction?.(item.actionId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            minHeight: 44,
            textAlign: 'left',
            padding: '0 var(--sp-3)',
            border: 'none',
            borderBottom: '1px solid var(--color-border)',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 'var(--font-size-label)',
            fontWeight: 400,
          }}
        >
          <span style={{ marginRight: 'var(--sp-2)', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>▸</span>
          <span style={{ color: 'var(--color-text-primary)', flex: 1 }}>{item.topicName}</span>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-label)', marginLeft: 'var(--sp-2)' }}>
            · {item.daysAgo}d ago
          </span>
        </button>
      ))}
      {overflowLabel && items.length > MAX_VISIBLE && (
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-caption)', padding: 'var(--sp-3)' }}>
          {overflowLabel}
        </div>
      )}
    </div>
  );
}
