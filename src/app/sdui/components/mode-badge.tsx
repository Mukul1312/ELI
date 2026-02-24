'use client';

import type { SduiModeBadge } from '@/ei/sdui/types/components';

const badgeStyles: Record<string, React.CSSProperties> = {
  Rescue: { background: '#7f1d1d', color: '#fca5a5' },
  Boost: { background: '#14532d', color: '#86efac' },
  Neutral: { background: '#1e3a5f', color: '#93c5fd' },
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
