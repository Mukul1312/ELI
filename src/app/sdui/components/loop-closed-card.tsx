'use client';

import { useState } from 'react';
import type { SduiLoopClosedCard } from '@/ei/sdui/types/components';

export function SduiLoopClosedCard({
  node,
  onAction,
}: {
  node: SduiLoopClosedCard;
  onAction?: (actionId: string) => void;
}) {
  const {
    title,
    topicName,
    message,
    countBefore,
    countAfter,
    seed,
    clearMoreCta,
    milestone,
    firstEver,
  } = node.props;

  const [showCounter] = useState(true);

  const titleStyle: React.CSSProperties = {
    fontSize: milestone || firstEver ? 22 : 18,
    fontWeight: 700,
    marginBottom: 4,
    color: milestone ? '#4ade80' : '#fafafa',
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={titleStyle}>{title}</div>
      {topicName && (
        <div style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 8 }}>{topicName}</div>
      )}

      {/* Counter animation: countBefore → countAfter */}
      {showCounter && countBefore !== undefined && countAfter !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '12px 0',
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          <span style={{ color: '#71717a', textDecoration: 'line-through' }}>{countBefore}</span>
          <span style={{ color: '#52525b' }}>→</span>
          <span style={{ color: '#4ade80' }}>{countAfter}</span>
          <span style={{ fontSize: 13, color: '#a1a1aa', fontWeight: 400 }}>pending checks</span>
        </div>
      )}

      {message && (
        <div style={{ color: '#d4d4d8', fontSize: 15, marginBottom: 8 }}>{message}</div>
      )}

      {seed && (
        <div style={{ color: '#71717a', fontSize: 13, marginTop: 8, fontStyle: 'italic' }}>
          {seed}
        </div>
      )}

      {clearMoreCta && (
        <button
          type="button"
          onClick={() => onAction?.(clearMoreCta.actionId)}
          style={{
            marginTop: 16,
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid #3f3f46',
            background: 'transparent',
            color: '#e4e4e7',
          }}
        >
          {clearMoreCta.label}
        </button>
      )}
    </div>
  );
}
