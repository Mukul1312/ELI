'use client';

import type { SduiResumeContextCard } from '@/ei/sdui/types/components';

export function SduiResumeContextCard({
  node,
  onAction,
}: {
  node: SduiResumeContextCard;
  onAction?: (actionId: string) => void;
}) {
  const { greeting, subGreeting, primaryCta, secondaryCta, tertiaryCta } = node.props;

  const ctaStyle = (variant: 'primary' | 'secondary') => ({
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    border: variant === 'primary' ? 'none' : '1px solid #3f3f46',
    background: variant === 'primary' ? '#18181b' : 'transparent',
    color: variant === 'primary' ? '#fafafa' : '#a1a1aa',
  });

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{greeting}</div>
      {subGreeting && (
        <div style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 16 }}>{subGreeting}</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={() => onAction?.(primaryCta.actionId)}
          style={ctaStyle('primary')}
        >
          {primaryCta.label}
        </button>
        {secondaryCta && (
          <button
            type="button"
            onClick={() => onAction?.(secondaryCta.actionId)}
            style={ctaStyle('secondary')}
          >
            {secondaryCta.label}
          </button>
        )}
        {tertiaryCta && (
          <button
            type="button"
            onClick={() => onAction?.(tertiaryCta.actionId)}
            style={ctaStyle('secondary')}
          >
            {tertiaryCta.label}
          </button>
        )}
      </div>
    </div>
  );
}
