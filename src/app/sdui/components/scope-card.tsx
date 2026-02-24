'use client';

import type { SduiScopeCard } from '@/ei/sdui/types/components';
import { SduiModeBadge } from './mode-badge';

export function SduiScopeCard({ node }: { node: SduiScopeCard }) {
  const { title, topic, scopeSummary, verificationSummary, badge } = node.props;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
        {badge && <SduiModeBadge node={{ type: 'mode-badge', props: badge }} />}
      </div>
      <div style={{ background: '#0f1117', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{topic}</div>
        <div style={{ color: '#71717a', fontSize: 13 }}>{scopeSummary}</div>
        <div style={{ color: '#71717a', fontSize: 13, marginTop: 4 }}>{verificationSummary}</div>
      </div>
    </div>
  );
}
