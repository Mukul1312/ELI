'use client';

import { useState, useEffect, useRef } from 'react';
import type { SduiActivationCard } from '@/ei/study-session-orchestration/domain/types/components';

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--color-surface, #fff)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--sp-5)',
  marginBottom: 'var(--sp-4)',
};

const FIRST_ACTION_STYLE: React.CSSProperties = {
  fontSize: 'var(--font-size-greeting)',
  fontWeight: 400,
  color: 'var(--color-text-primary)',
  lineHeight: 1.4,
  whiteSpace: 'pre-line',
};

const RATIONALE_STYLE: React.CSSProperties = {
  fontSize: 'var(--font-size-label)',
  color: 'var(--color-text-tertiary)',
  marginTop: 'var(--sp-3)',
};

const FOCUS_STYLE: React.CSSProperties = {
  fontSize: 'var(--font-size-caption)',
  color: 'var(--color-text-tertiary)',
  marginBottom: 'var(--sp-3)',
};

function makeButton(primary: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    height: primary ? 52 : 44,
    marginTop: 'var(--sp-4)',
    borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--font-size-body)',
    fontWeight: primary ? 500 : 400,
    cursor: 'pointer',
    border: primary ? 'none' : '1.5px solid var(--color-border-strong, var(--color-accent-border))',
    background: primary ? 'var(--color-accent)' : 'transparent',
    color: primary ? '#fff' : 'var(--color-text-primary)',
  };
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SduiActivationCard({
  node,
  onAction,
}: {
  node: SduiActivationCard;
  onAction?: (actionId: string) => void;
}) {
  const { variant, firstAction, rationale, primaryCta, secondaryCta, focusReminder } = node.props;

  // 2-minute elapsed timer (rescue_two_min variant only)
  const [elapsed, setElapsed] = useState(0);
  const [timerDone, setTimerDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (variant !== 'rescue_two_min') return;
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= 120) {
          clearInterval(intervalRef.current!);
          setTimerDone(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [variant]);

  // rescue_two_min: transforms to "Keep going?" after 2 min
  const showKeepGoing = variant === 'rescue_two_min' && timerDone;

  return (
    <div>
      {/* Focus reminder — boost variants only, shown briefly at top */}
      {focusReminder && (
        <div style={FOCUS_STYLE}>{focusReminder}</div>
      )}

      <div style={CARD_STYLE}>
        {showKeepGoing ? (
          // Post-2min transform: "2 minutes done. Keep going?"
          <>
            <div style={{ ...FIRST_ACTION_STYLE }}>2 minutes done.</div>
            <div style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', marginTop: 'var(--sp-2)' }}>
              Keep going?
            </div>
          </>
        ) : (
          <>
            <div style={FIRST_ACTION_STYLE}>{firstAction}</div>

            {/* Elapsed timer — rescue_two_min only, before 2-min mark */}
            {variant === 'rescue_two_min' && !timerDone && (
              <div style={{
                fontSize: 'var(--font-size-display)',
                fontWeight: 500,
                color: 'var(--color-text-tertiary)',
                textAlign: 'center',
                marginTop: 'var(--sp-4)',
              }}>
                {formatElapsed(elapsed)}
              </div>
            )}

            {rationale && <div style={RATIONALE_STYLE}>{rationale}</div>}
          </>
        )}
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        style={makeButton(true)}
        onClick={() => onAction?.(primaryCta.actionId)}
      >
        {showKeepGoing ? 'Yes, keep going' : primaryCta.label}
      </button>

      {/* Secondary CTA — "Done for today" only shown after 2-min transform */}
      {secondaryCta && showKeepGoing && (
        <button
          type="button"
          style={makeButton(false)}
          onClick={() => onAction?.(secondaryCta.actionId)}
        >
          {secondaryCta.label}
        </button>
      )}
    </div>
  );
}
