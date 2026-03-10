'use client';

import { useState, useEffect } from 'react';
import type { SduiLoopClosedCard } from '@/ei/sdui/types/components';

// Scenarios that close a loop (get closed-soft bg and --color-closed headline)
const LOOP_CLOSED_SCENARIOS = new Set(['verified', 'milestone', 'first_ever']);

function LoopClosedCounter({
  countBefore,
  countAfter,
  milestone,
  firstEver,
}: {
  countBefore: number;
  countAfter: number;
  milestone: boolean;
  firstEver: boolean;
}) {
  // Phase 1: animate number change (200ms delay start)
  // Phase 2: color transition accent → closed → text-primary
  // For milestone: after settle, number dissolves → "All clear." label
  // For first-ever: label swaps to "First loop closed" simultaneously with exit
  const [phase, setPhase] = useState<'before' | 'animating' | 'settled' | 'dissolved'>('before');
  const [counterColor, setCounterColor] = useState<string>('var(--color-text-primary)');

  useEffect(() => {
    // Start animation after 200ms
    const t1 = setTimeout(() => setPhase('animating'), 200);
    // New number settles at t=540ms
    const t2 = setTimeout(() => {
      setPhase('settled');
      setCounterColor('var(--color-accent)');
    }, 680);
    // Haptic "Success" double-tap at t=680ms
    const tHaptic = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    }, 680);
    // Color → closed at t=880ms
    const t3 = setTimeout(() => setCounterColor('var(--color-closed)'), 880);
    // Color → text-primary at t=1480ms
    const t4 = setTimeout(() => setCounterColor('var(--color-text-primary)'), 1480);
    // Milestone: dissolve number into "All clear." at t=1280ms
    const t5 = milestone
      ? setTimeout(() => setPhase('dissolved'), 1280)
      : undefined;

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(tHaptic); clearTimeout(t3); clearTimeout(t4); if (t5) clearTimeout(t5); };
  }, [milestone]);

  const labelText = firstEver ? 'First loop closed' : 'Pending checks';

  return (
    <div style={{
      background: 'var(--color-surface, #fff)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--sp-4)',
      marginBottom: 'var(--sp-4)',
      textAlign: 'center',
    }}>
      {/* Label — fades out (first-ever) or stays */}
      <div style={{
        fontSize: 'var(--font-size-label)',
        color: 'var(--color-text-secondary)',
        fontWeight: 400,
        marginBottom: 'var(--sp-2)',
        opacity: phase === 'animating' && firstEver ? 0 : 1,
        transition: firstEver ? 'opacity 120ms' : 'none',
      }}>
        {labelText}
      </div>

      {/* Counter number(s) */}
      {phase === 'dissolved' ? (
        // Milestone: "All clear." label replaces number
        <div style={{
          fontSize: 'var(--font-size-greeting)',
          fontWeight: 500,
          color: 'var(--color-closed)',
          animation: 'fadeSlideIn 250ms ease-out both',
        }}>
          All clear.
        </div>
      ) : (
        <div style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Old number exits */}
          {phase !== 'before' && (
            <span
              className="counter-old"
              style={{
                position: 'absolute',
                fontSize: 'var(--font-size-display)',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
              }}
            >
              {countBefore}
            </span>
          )}
          {/* New number enters */}
          <span
            className={phase === 'animating' || phase === 'settled' ? 'counter-new' : undefined}
            style={{
              fontSize: 'var(--font-size-display)',
              fontWeight: 500,
              color: phase === 'before' ? 'var(--color-text-primary)' : counterColor,
              opacity: phase === 'before' ? 1 : undefined,
            }}
          >
            {phase === 'before' ? countBefore : countAfter}
          </span>
        </div>
      )}
    </div>
  );
}

export function SduiLoopClosedCard({
  node,
  onAction,
}: {
  node: SduiLoopClosedCard;
  onAction?: (actionId: string) => void;
}) {
  const {
    scenario,
    title,
    subline,
    quote,
    countBefore,
    countAfter,
    seed,
    primaryCta,
    clearMoreCta,
    milestone,
    firstEver,
  } = node.props;

  const isLoopClosed = LOOP_CLOSED_SCENARIOS.has(scenario);
  const hasCounter = countBefore !== undefined && countAfter !== undefined;

  const cardBg = isLoopClosed
    ? 'var(--color-closed-soft)'
    : 'var(--color-surface, #fff)';

  const titleColor = isLoopClosed
    ? 'var(--color-closed)'
    : 'var(--color-text-primary)';

  return (
    <div>
      {/* Main card */}
      <div style={{
        background: cardBg,
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--sp-5)',
        marginBottom: 'var(--sp-4)',
      }}>
        {/* Headline */}
        <div style={{
          fontSize: 'var(--font-size-greeting)',
          fontWeight: 400,
          color: titleColor,
          marginBottom: subline ? 'var(--sp-2)' : 'var(--sp-4)',
          whiteSpace: 'pre-line',
        }}>
          {title}
        </div>

        {/* Subline */}
        {subline && (
          <div style={{
            fontSize: 'var(--font-size-body)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--sp-4)',
            whiteSpace: 'pre-line',
          }}>
            {subline}
          </div>
        )}

        {/* Counter animation */}
        {hasCounter && (
          <LoopClosedCounter
            countBefore={countBefore!}
            countAfter={countAfter!}
            milestone={milestone}
            firstEver={firstEver}
          />
        )}

        {/* Quote */}
        {quote && (
          <div style={{
            fontSize: 'var(--font-size-body)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--sp-4)',
          }}>
            {quote}
          </div>
        )}

        {/* Seed */}
        {seed && (
          <div style={{
            fontSize: 'var(--font-size-label)',
            color: 'var(--color-text-tertiary)',
          }}>
            {seed}
          </div>
        )}
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={() => onAction?.(primaryCta.actionId)}
        style={{
          display: 'block',
          width: '100%',
          height: 48,
          borderRadius: 'var(--radius-lg)',
          border: 'none',
          background: 'var(--color-accent)',
          color: '#fff',
          fontSize: 'var(--font-size-body)',
          fontWeight: 500,
          cursor: 'pointer',
          marginBottom: clearMoreCta ? 'var(--sp-3)' : 0,
        }}
      >
        {primaryCta.label}
      </button>

      {/* "Clear one more" secondary CTA */}
      {clearMoreCta && (
        <button
          type="button"
          onClick={() => onAction?.(clearMoreCta.actionId)}
          style={{
            display: 'block',
            width: '100%',
            height: 44,
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border-strong, var(--color-accent-border))',
            background: 'transparent',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-body)',
            fontWeight: 400,
            cursor: 'pointer',
          }}
        >
          {clearMoreCta.label}
        </button>
      )}
    </div>
  );
}
