'use client';

import type { SduiDoneCard } from '@/ei/sdui/types/components';
import { SduiModeBadge } from './mode-badge';

export function SduiDoneCard({ node }: { node: SduiDoneCard }) {
  const { title, topic, badge, summary, celebrationMessage } = node.props;
  return (
    <div style={{ marginBottom: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>&#10003;</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {badge && (
        <div style={{ marginBottom: 8 }}>
          <SduiModeBadge node={{ type: 'mode-badge', props: badge }} />
        </div>
      )}
      <div style={{ color: '#a1a1aa', fontSize: 14 }}>
        {summary.map((line, i) => (
          <p key={i} style={{ margin: '4px 0' }}>{line}</p>
        ))}
      </div>
      {celebrationMessage && (
        <p style={{ marginTop: 12, fontSize: 14, color: '#71717a' }}>{celebrationMessage}</p>
      )}
    </div>
  );
}
