'use client';

import { useState } from 'react';
import type { SduiSessionSummaryFooter } from '@/ei/sdui/types/components';

export function SduiSessionSummaryFooter({ node }: { node: SduiSessionSummaryFooter }) {
  const [expanded, setExpanded] = useState(false);
  const { collapsedLabel, sessions, loopsClosed, pending, rate, trend, identityStatement, warmLabel } = node.props;

  const trendIcon = trend === 'improving' ? '↑' : trend === 'worsening' ? '↓' : '→';
  const ratePercent = Math.round(rate * 100);

  return (
    <div
      style={{
        borderTop: '1px solid #27272a',
        paddingTop: 8,
        marginTop: 4,
        fontSize: 13,
        color: '#71717a',
      }}
    >
      {/* Collapsed label — tap to expand */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#71717a',
          fontSize: 13,
          padding: 0,
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{collapsedLabel}</span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 8, paddingLeft: 14, lineHeight: 1.8 }}>
          {identityStatement && (
            <div style={{ color: '#d4d4d8', fontWeight: 600, marginBottom: 6 }}>
              {identityStatement}
            </div>
          )}
          {warmLabel ? (
            <div style={{ color: '#a1a1aa' }}>{warmLabel}</div>
          ) : (
            <>
              <div>Sessions: <strong style={{ color: '#e4e4e7' }}>{sessions}</strong></div>
              <div>Loops closed: <strong style={{ color: '#e4e4e7' }}>{loopsClosed}</strong></div>
              <div>Pending: <strong style={{ color: '#e4e4e7' }}>{pending}</strong></div>
              <div>
                Verification rate: <strong style={{ color: '#e4e4e7' }}>{ratePercent}%</strong>
              </div>
              <div>
                Trend: <strong style={{ color: '#e4e4e7' }}>{trendIcon}</strong>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
