'use client';

import type { SduiModeBadge } from '@/ei/study-session-orchestration/domain/types/components';

const badgeStyles: Record<string, React.CSSProperties> = {
  Rescue: { background: '#FEE2E2', color: '#B91C1C' },
  Boost: { background: 'var(--color-closed-soft)', color: 'var(--color-closed)' },
  Neutral: { background: 'var(--color-accent-soft)', color: 'var(--color-accent)' },
};

export function SduiModeBadge({ node }: { node: SduiModeBadge }) {
  const { mode, label } = node.props;
  const style: React.CSSProperties = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    ...badgeStyles[mode],
  };
  return <span style={style}>{label || mode}</span>;
}
