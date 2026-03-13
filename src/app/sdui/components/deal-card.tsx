'use client';

import type { SduiDealCard } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiDealCard({
  node,
  onAction,
}: {
  node: SduiDealCard;
  onAction?: (actionId: string) => void;
}) {
  const { message, pendingCount, choices } = node.props;
  return (
    <div
      style={{
        background: '#FFF7ED',
        border: '1px solid #FED7AA',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 16,
        fontSize: 13,
      }}
    >
      <div style={{ marginBottom: 8 }}>{message}</div>
      <div style={{ marginBottom: 8 }}>Pending: {pendingCount}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {choices.map((c) => (
          <button
            key={c.actionId}
            type="button"
            onClick={() => onAction?.(c.actionId)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
