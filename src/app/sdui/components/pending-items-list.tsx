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
    <div style={{ marginBottom: 16 }}>
      {visible.map((item) => (
        <button
          key={item.topicId}
          type="button"
          onClick={() => onAction?.(item.actionId)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '10px 12px',
            marginBottom: 6,
            borderRadius: 8,
            border: '1px solid #3f3f46',
            background: 'transparent',
            cursor: 'pointer',
            color: '#e4e4e7',
            fontSize: 14,
          }}
        >
          <span style={{ marginRight: 6, color: '#71717a' }}>▸</span>
          {item.topicName}
          <span style={{ color: '#52525b', fontSize: 12, marginLeft: 8 }}>
            · {item.daysAgo}d ago
          </span>
        </button>
      ))}
      {overflowLabel && items.length > MAX_VISIBLE && (
        <div style={{ color: '#71717a', fontSize: 12, paddingLeft: 12 }}>
          {overflowLabel}
        </div>
      )}
    </div>
  );
}
