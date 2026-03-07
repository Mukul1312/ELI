'use client';

import type { SduiTwoStepCard } from '@/ei/sdui/types/components';

export function SduiTwoStepCard({ node, onAction }: { node: SduiTwoStepCard; onAction?: (actionId: string) => void }) {
  const { message, step1, step2, actionId } = node.props;
  return (
    <div style={{ marginBottom: 16, background: 'var(--color-surface-subtle)', borderRadius: 8, padding: '12px 14px' }}>
      <p style={{ margin: '0 0 12px', fontSize: 14 }}>{message}</p>
      <div style={{ marginBottom: 8, fontSize: 13 }}>
        <strong>{step1.label}:</strong> {step1.description}
      </div>
      <div style={{ marginBottom: 12, fontSize: 13 }}>
        <strong>{step2.label}:</strong> {step2.description}
      </div>
      <button
        type="button"
        onClick={() => onAction?.(actionId)}
        style={{ padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: 'var(--color-accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
      >
        Start
      </button>
    </div>
  );
}
