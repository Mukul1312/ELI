'use client';

import type { SduiPendingHeroCard } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiPendingHeroCard({
  node,
  onAction,
}: {
  node: SduiPendingHeroCard;
  onAction?: (actionId: string) => void;
}) {
  const { topicName, daysAgo, actionId, label } = node.props;

  return (
    <div style={{ marginBottom: 'var(--sp-3)' }}>
      {label && (
        <div
          style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--color-text-tertiary)',
            marginBottom: 'var(--sp-2)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </div>
      )}
      <button
        type="button"
        onClick={() => onAction?.(actionId)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: 56,
          padding: 'var(--sp-4)',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--color-border-strong)',
          background: 'var(--color-surface)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 'var(--font-size-body)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              marginBottom: 2,
            }}
          >
            {topicName}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            Revisit from {daysAgo}d ago
          </div>
        </div>
        <span style={{ color: 'var(--color-accent)', fontSize: 'var(--font-size-body)' }}>
          ▸
        </span>
      </button>
    </div>
  );
}
