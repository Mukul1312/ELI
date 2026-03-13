'use client';

import type { SduiSessionTimer } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiSessionTimer({
  node,
  onAction,
}: {
  node: SduiSessionTimer;
  onAction?: (actionId: string) => void;
}) {
  const { endActionId, endLabel, firstActionText } = node.props;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 var(--sp-4) var(--sp-10)',
    }}>
      {/* Middle: first-action instruction text — visible for the entire session */}
      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {firstActionText ? (
          <p style={{
            fontSize: 'var(--font-size-greeting)',
            fontWeight: 400,
            color: 'var(--color-text-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}>
            {firstActionText}
          </p>
        ) : null}
      </div>

      {/* "I'm done" — text link, bottom */}
      <button
        type="button"
        onClick={() => onAction?.(endActionId)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 'var(--font-size-label)',
          color: 'var(--color-text-secondary)',
          padding: 'var(--sp-2) 0',
          textDecoration: 'underline',
          
        }}
      >
        {endLabel ?? "I'm done"}
      </button>
    </div>
  );
}
