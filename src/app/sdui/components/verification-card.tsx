'use client';

import { useState } from 'react';
import type { SduiVerificationCard } from '@/ei/sdui/types/components';

const CHIP_BASE: React.CSSProperties = {
  flex: 1,
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-accent-border)',
  background: 'var(--color-surface, #fff)',
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  color: 'var(--color-text-primary)',
  transition: 'background 120ms, border-color 120ms, color 120ms',
};

const SKIP_CHIP: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 16px',
  borderRadius: 'var(--radius-full)',
  border: '1px solid var(--color-accent-border)',
  background: 'var(--color-surface, #fff)',
  fontSize: 'var(--font-size-label)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  marginRight: 'var(--sp-2)',
  marginTop: 'var(--sp-2)',
};

export function SduiVerificationCard({
  node,
  onAction,
}: {
  node: SduiVerificationCard;
  onAction?: (actionId: string) => void;
}) {
  const {
    topic, mode, openingLine, topicPrompt, canDefer,
    gotItActionId, shakyActionId, needsReviewActionId,
    deferActionId, skipTimeActionId, skipFatigueActionId, skipConfusionActionId,
  } = node.props;

  const [skipExpanded, setSkipExpanded] = useState(false);
  const isRescue = mode === 'rescue';

  const resultChips = (
    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
      {[
        { label: 'Got it', id: gotItActionId },
        { label: 'Shaky', id: shakyActionId },
        { label: 'Need more practice', id: needsReviewActionId },
      ].map(({ label, id }) => (
        <button
          key={id}
          type="button"
          style={CHIP_BASE}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent-soft)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '';
          }}
          onClick={() => onAction?.(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const deferButton = canDefer && (
    <button
      type="button"
      style={{
        display: 'block',
        width: '100%',
        height: 48,
        marginTop: 'var(--sp-3)',
        borderRadius: 'var(--radius-lg)',
        border: '1.5px solid var(--color-accent-border)',
        background: 'transparent',
        fontSize: 'var(--font-size-body)',
        fontWeight: 400,
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
      }}
      onClick={() => onAction?.(deferActionId)}
    >
      Remind me tomorrow
    </button>
  );

  const skipTrigger = !skipExpanded && (
    <button
      type="button"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 'var(--font-size-caption)',
        color: 'var(--color-text-tertiary)',
        padding: 'var(--sp-2) 0 0',
        display: 'block',
      }}
      onClick={() => setSkipExpanded(true)}
    >
      Can&apos;t right now ↓
    </button>
  );

  const skipChips = skipExpanded && (
    <div style={{ marginTop: 'var(--sp-3)' }}>
      <div style={{
        fontSize: 'var(--font-size-label)',
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--sp-2)',
      }}>
        Why are you skipping?
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        {[
          { label: 'No time', id: skipTimeActionId },
          { label: 'Fatigue', id: skipFatigueActionId },
          { label: 'Confused', id: skipConfusionActionId },
        ].map(({ label, id }) => (
          <button key={id} type="button" style={SKIP_CHIP} onClick={() => onAction?.(id)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  // Topic card
  const topicCard = (
    <div style={{
      background: 'var(--color-surface, #fff)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-accent-border)',
      padding: 'var(--sp-4)',
      marginBottom: 'var(--sp-4)',
    }}>
      <div style={{ fontSize: 'var(--font-size-greeting)', fontWeight: 400, color: 'var(--color-text-primary)' }}>
        {topic}
      </div>
      <div style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', marginTop: 'var(--sp-2)' }}>
        {topicPrompt}
      </div>
    </div>
  );

  return (
    <div>
      {/* Opening line */}
      <p style={{
        fontSize: 'var(--font-size-body)',
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--sp-4)',
      }}>
        {openingLine}
      </p>

      {topicCard}

      {/* Rescue mode: deferral is primary — shown ABOVE result chips */}
      {isRescue && deferButton}

      {/* Result chips */}
      <div style={{
        fontSize: 'var(--font-size-label)',
        color: 'var(--color-text-tertiary)',
        marginBottom: 'var(--sp-2)',
      }}>
        How did it go?
      </div>
      {resultChips}

      {/* Standard mode: deferral is secondary — shown BELOW result chips */}
      {!isRescue && deferButton}

      {skipTrigger}
      {skipChips}
    </div>
  );
}
