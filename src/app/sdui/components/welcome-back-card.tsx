'use client';

import type { SduiWelcomeBackCard } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiWelcomeBackCard({
  node,
  onAction,
}: {
  node: SduiWelcomeBackCard;
  onAction?: (actionId: string) => void;
}) {
  const { greeting, suggestion, choices } = node.props;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{greeting}</div>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }}>{suggestion}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
              border: '1px solid var(--color-border-strong)',
              background: 'var(--color-surface-subtle)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
