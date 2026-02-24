'use client';

import type { SduiVerificationCard } from '@/ei/sdui/types/components';
import { SduiModeBadge } from './mode-badge';

export function SduiVerificationCard({ node }: { node: SduiVerificationCard }) {
  const { title, prompt, badge, primarySection, fallbackSection } = node.props;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
        {badge && <SduiModeBadge node={{ type: 'mode-badge', props: badge }} />}
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#a1a1aa' }}>{prompt}</p>
      {primarySection?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {primarySection.map((item, i) => (
            <p
              key={i}
              style={{
                margin: 0,
                fontSize: 13,
                color: item.variant === 'muted' ? '#71717a' : item.variant === 'emphasis' ? '#e4e4e7' : '#a1a1aa',
              }}
            >
              {item.text}
            </p>
          ))}
        </div>
      )}
      {fallbackSection && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2b35' }}>
          <div style={{ fontSize: 12, color: '#71717a', marginBottom: 6 }}>{fallbackSection.label}</div>
          {fallbackSection.items.map((item, i) => (
            <p key={i} style={{ margin: 0, fontSize: 13, color: '#a1a1aa' }}>{item.text}</p>
          ))}
        </div>
      )}
    </div>
  );
}
