'use client';

import { useState } from 'react';
import type { SduiSessionSummaryFooter } from '@/ei/sdui/types/components';

export function SduiSessionSummaryFooter({ node }: { node: SduiSessionSummaryFooter }) {
  const [expanded, setExpanded] = useState(false);
  const { collapsedLabel, sessions, loopsClosed, pending, rate, trend, identityStatement, warmLabel, expandable = true } = node.props;

  const trendIcon = trend === 'improving' ? '↑' : trend === 'worsening' ? '↓' : '→';
  const ratePercent = Math.round(rate * 100);

  return (
    <div
      style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: 'var(--sp-2)',
        marginTop: 'var(--sp-1)',
        fontSize: 'var(--font-size-label)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {/* Collapsed label — tap to expand if expandable */}
      <button
        type="button"
        onClick={() => expandable && setExpanded((e) => !e)}
        style={{
          background: 'none',
          border: 'none',
          cursor: expandable ? 'pointer' : 'default',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-label)',
          fontWeight: 400,
          padding: 0,
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-2)',
        }}
      >
        {expandable && <span style={{ color: 'var(--color-text-tertiary)' }}>{expanded ? '▾' : '▸'}</span>}
        <span>{collapsedLabel}</span>
      </button>

      {/* Expanded details */}
      {expanded && expandable && (
        <div style={{ marginTop: 'var(--sp-2)', paddingLeft: 'var(--sp-4)', lineHeight: 1.8 }}>
          {identityStatement && (
            <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
              {identityStatement}
            </div>
          )}
          {warmLabel ? (
            <div style={{ color: 'var(--color-text-secondary)' }}>{warmLabel}</div>
          ) : (
            <>
              <div>Sessions: <strong style={{ color: 'var(--color-text-primary)' }}>{sessions}</strong></div>
              <div>Loops closed: <strong style={{ color: 'var(--color-text-primary)' }}>{loopsClosed}</strong></div>
              <div>Pending: <strong style={{ color: 'var(--color-text-primary)' }}>{pending}</strong></div>
              <div>
                Verification rate: <strong style={{ color: 'var(--color-text-primary)' }}>{ratePercent}%</strong>
              </div>
              <div>
                Trend: <strong style={{ color: 'var(--color-text-primary)' }}>{trendIcon}</strong>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
