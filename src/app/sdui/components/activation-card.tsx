'use client';

import type { SduiActivationCard } from '@/ei/sdui/types/components';
import { SduiModeBadge } from './mode-badge';

export function SduiActivationCard({ node }: { node: SduiActivationCard }) {
  const { title, description, timebox, focusNote, badge } = node.props;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
        {badge && <SduiModeBadge node={{ type: 'mode-badge', props: badge }} />}
      </div>
      <div style={{ background: '#0f1117', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{description}</div>
        {timebox && (
          <div style={{ color: '#71717a', fontSize: 13 }}>Timebox: {timebox}</div>
        )}
      </div>
      {focusNote && (
        <div style={{ color: '#71717a', fontSize: 13, marginTop: 8 }}>{focusNote}</div>
      )}
    </div>
  );
}
