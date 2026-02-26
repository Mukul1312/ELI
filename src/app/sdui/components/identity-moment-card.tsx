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
    <div style={{ marginBottom: 20 }}>
      {/* Statement is visually dominant — bold, larger */}
      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, marginBottom: 10 }}>
        {statement}
      </div>
      {/* Detail is supporting evidence */}
      <div style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
        {detail}
      </div>
      <button
        type="button"
        onClick={() => onAction?.(ctaActionId)}
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          border: 'none',
          background: '#18181b',
          color: '#fafafa',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
