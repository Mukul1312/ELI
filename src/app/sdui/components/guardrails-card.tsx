'use client';

import type { SduiGuardrailsCard } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiGuardrailsCard({ node }: { node: SduiGuardrailsCard }) {
  const { title, rules } = node.props;
  return (
    <div style={{ marginBottom: 16, background: 'var(--color-surface-subtle)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--color-text-secondary)' }}>
        {rules.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
