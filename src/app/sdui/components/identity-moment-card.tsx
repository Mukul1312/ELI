'use client';

import type { SduiIdentityMomentCard } from '@/ei/sdui/types/components';

export function SduiIdentityMomentCard({
  node,
  onAction,
}: {
  node: SduiIdentityMomentCard;
  onAction?: (actionId: string) => void;
}) {
  const { statement, detail, ctaLabel, ctaActionId } = node.props;

  return (
    <div style={{ marginBottom: 'var(--sp-5)' }}>
      {/* Statement is the ONLY weight-600 element in the product — quotation marks signal reflection */}
      <div
        style={{
          fontSize: 'var(--font-size-greeting)',
          fontWeight: 600,
          lineHeight: 1.3,
          marginBottom: 'var(--sp-3)',
          color: 'var(--color-text-primary)',
        }}
      >
        &ldquo;{statement}&rdquo;
      </div>
      {/* Detail is supporting evidence */}
      <div
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-body)',
          lineHeight: 1.5,
          marginBottom: 'var(--sp-4)',
        }}
      >
        {detail}
      </div>
      <button
        type="button"
        onClick={() => onAction?.(ctaActionId)}
        style={{
          padding: '14px 20px',
          borderRadius: 'var(--radius-lg)',
          fontSize: 'var(--font-size-body)',
          fontWeight: 500,
          cursor: 'pointer',
          border: 'none',
          background: 'var(--color-accent)',
          color: '#fff',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
