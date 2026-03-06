'use client';

import { useState, useEffect, useRef } from 'react';
import type { SduiSessionTimer } from '@/ei/sdui/types/components';

// Nudge fires after this many seconds of active session time
const NUDGE_DELAY_SEC: Record<'Rescue' | 'Neutral' | 'Boost', number | null> = {
  Rescue: 20 * 60,   // 20 min
  Neutral: 15 * 60,  // 15 min
  Boost: null,       // No nudge for Boost
};

export function SduiSessionTimer({
  node,
  onAction,
}: {
  node: SduiSessionTimer;
  onAction?: (actionId: string) => void;
}) {
  const { endActionId, endLabel, mode, nudgeCopy } = node.props;

  // Track elapsed seconds for nudge trigger
  const [elapsed, setElapsed] = useState(0);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const nudgeFired = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Fire nudge once after mode-specific delay
  useEffect(() => {
    const delay = NUDGE_DELAY_SEC[mode];
    if (delay === null || nudgeFired.current || nudgeDismissed) return;
    if (elapsed >= delay && nudgeCopy) {
      nudgeFired.current = true;
      setNudgeVisible(true);
    }
  }, [elapsed, mode, nudgeCopy, nudgeDismissed]);

  return (
    // Fills remaining height (page is flex column in session phase), nudge in middle, end-session at bottom
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 var(--sp-4) var(--sp-10)',
    }}>
      {/* Middle: intentionally empty — student should be studying */}
      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {nudgeVisible && !nudgeDismissed && nudgeCopy && (
          // ELI nudge card — fades in, dismissible
          <div
            className="eli-nudge-card"
            style={{
              background: 'var(--color-surface, #fff)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              padding: '14px var(--sp-4)',
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: 'fadeSlideIn 200ms ease-out both',
            }}
          >
            <span style={{
              fontSize: 'var(--font-size-body)',
              fontWeight: 400,
              color: 'var(--color-text-secondary)',
            }}>
              {nudgeCopy}
            </span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => { setNudgeVisible(false); setNudgeDismissed(true); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--font-size-label)',
                color: 'var(--color-text-tertiary)',
                padding: '0 0 0 var(--sp-3)',
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* End session — text link only, tertiary, bottom */}
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
          textDecoration: 'none',
        }}
      >
        {endLabel ?? 'End session'}
      </button>
    </div>
  );
}
