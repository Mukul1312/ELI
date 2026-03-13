'use client';

import { useState, useEffect } from 'react';
import type { SduiLoopClosedCard } from '@/ei/study-session-orchestration/domain/types/components';

// Scenarios that close a loop (get closed-soft bg and --color-closed headline)
const LOOP_CLOSED_SCENARIOS = new Set(['verified', 'milestone', 'first_ever']);

function LoopClosedCounter({
  countBefore,
  countAfter,
  counterDirection,
  milestone,
  firstEver,
  onSettled,
}: {
  countBefore: number;
  countAfter: number;
  counterDirection: 'down' | 'up' | 'static';
  milestone: boolean;
  firstEver: boolean;
  onSettled?: () => void;
}) {
  const [phase, setPhase] = useState<'before' | 'animating' | 'settled' | 'dissolved'>('before');
  const [counterColor, setCounterColor] = useState<string>('var(--color-text-primary)');

  const isUp = counterDirection === 'up';
  const isStatic = counterDirection === 'static';

  useEffect(() => {
    if (isStatic) {
      // Static: no animation, just show current value and settle immediately
      setPhase('settled');
      onSettled?.();
      return;
    }

    if (isUp) {
      // Counter UP animation — shorter (~540ms total)
      const t1 = setTimeout(() => setPhase('animating'), 100);
      const t2 = setTimeout(() => {
        setPhase('settled');
        setCounterColor('var(--color-accent)');
      }, 360);
      const t3 = setTimeout(() => setCounterColor('var(--color-text-primary)'), 540);
      const t4 = setTimeout(() => onSettled?.(), 640);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }

    // Counter DOWN animation — standard (~1900ms total)
    const t1 = setTimeout(() => setPhase('animating'), 200);
    const t2 = setTimeout(() => {
      setPhase('settled');
      setCounterColor('var(--color-accent)');
    }, 680);
    const tHaptic = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    }, 680);
    const t3 = setTimeout(() => setCounterColor('var(--color-closed)'), 880);
    const t4 = setTimeout(() => setCounterColor('var(--color-text-primary)'), 1480);
    const t5 = milestone
      ? setTimeout(() => setPhase('dissolved'), 1280)
      : undefined;
    const t6 = setTimeout(() => onSettled?.(), milestone ? 1530 : 1480);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(tHaptic);
      clearTimeout(t3); clearTimeout(t4); if (t5) clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [milestone, isUp, isStatic]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Label */}
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
        <div style={{
          fontSize: 'var(--font-size-greeting)',
          fontWeight: 500,
          color: 'var(--color-closed)',
          animation: 'fadeSlideIn 250ms ease-out both',
        }}>
          All clear.
        </div>
      ) : isStatic ? (
        <div style={{
          fontSize: 'var(--font-size-display)',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
        }}>
          {countBefore}
        </div>
      ) : (
        <div style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Old number exits */}
          {phase !== 'before' && (
            <span
              className={isUp ? 'counter-up-old' : 'counter-old'}
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
            className={
              (phase === 'animating' || phase === 'settled')
                ? (isUp ? 'counter-up-new' : 'counter-new')
                : undefined
            }
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
    counterDirection,
    seed,
    primaryCta,
    clearMoreCta,
    milestone,
    firstEver,
  } = node.props;

  const isLoopClosed = LOOP_CLOSED_SCENARIOS.has(scenario);
  const hasCounter = countBefore !== undefined && countAfter !== undefined && counterDirection !== undefined;

  // Staged reveal: seed + CTAs fade in after counter settles
  const [counterSettled, setCounterSettled] = useState(!hasCounter);

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
            counterDirection={counterDirection!}
            milestone={milestone}
            firstEver={firstEver}
            onSettled={() => setCounterSettled(true)}
          />
        )}

        {/* Quote — staged reveal */}
        {quote && (
          <div style={{
            fontSize: 'var(--font-size-body)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--sp-4)',
          }}>
            {quote}
          </div>
        )}

        {/* Seed — staged reveal after counter settles */}
        {seed && (
          <div
            className={counterSettled ? 'seed-reveal' : undefined}
            style={{
              fontSize: 'var(--font-size-label)',
              color: 'var(--color-text-tertiary)',
              opacity: counterSettled ? undefined : 0,
            }}
          >
            {seed}
          </div>
        )}
      </div>

      {/* CTAs — staged reveal after counter settles */}
      <div
        className={counterSettled ? 'cta-reveal' : undefined}
        style={{ opacity: counterSettled ? undefined : 0 }}
      >
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
    </div>
  );
}
