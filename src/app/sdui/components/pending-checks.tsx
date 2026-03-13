'use client';

import type { SduiPendingChecks } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiPendingChecks({ node }: { node: SduiPendingChecks }) {
  const { count, label, celebratory } = node.props;
  const style: React.CSSProperties = celebratory
    ? { color: 'var(--color-closed)', fontSize: 13, fontWeight: 600 }
    : { color: 'var(--color-text-secondary)', fontSize: 13 };
  return (
    <div style={style}>
      {label.replace('{{count}}', String(count))}
    </div>
  );
}
