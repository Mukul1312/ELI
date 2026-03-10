'use client';

import * as React from 'react';
import type { SduiResumeContextCard } from '@/ei/sdui/types/components';

const RESCUE_VARIANTS = ['SILENCE_RE_ENTRY', 'LOW_ENERGY', 'HIGH_PRESSURE'] as const;
const BOOST_VARIANTS = ['CHALLENGE', 'CLEAR_THEN_CHALLENGE'] as const;

function variantToMode(variant: string): 'Rescue' | 'Neutral' | 'Boost' {
  if (RESCUE_VARIANTS.includes(variant as any)) return 'Rescue';
  if (BOOST_VARIANTS.includes(variant as any)) return 'Boost';
  return 'Neutral';
}

export function SduiResumeContextCard({
  node,
  onAction,
  formValues = {},
}: {
  node: SduiResumeContextCard;
  onAction?: (actionId: string) => void;
  formValues?: Record<string, string | number>;
}) {
  const {
    variant,
    greeting,
    subGreeting,
    primaryCta,
    secondaryCta,
    tertiaryCta,
    showGreetingAfterEnergySelected,
    makeItSmallerContent,
  } = node.props;

  const [makeItSmallerTapped, setMakeItSmallerTapped] = React.useState(false);
  const mode = variantToMode(variant);
  const energySelected = formValues['energy'] !== undefined && formValues['energy'] !== '';
  const showGreeting = !showGreetingAfterEnergySelected || energySelected;

  const content = makeItSmallerTapped && makeItSmallerContent
    ? {
        greeting: makeItSmallerContent.greeting,
        subGreeting: makeItSmallerContent.subGreeting,
        primaryCta: makeItSmallerContent.primaryCta,
        secondaryCta: undefined as typeof secondaryCta,
        tertiaryCta: undefined as typeof tertiaryCta,
      }
    : {
        greeting,
        subGreeting,
        primaryCta,
        secondaryCta,
        tertiaryCta,
      };

  const greetingMarginBottom = mode === 'Rescue' ? 'var(--sp-8)' : mode === 'Boost' ? 'var(--sp-5)' : 'var(--sp-6)';
  const buttonHeight = mode === 'Rescue' ? 52 : mode === 'Boost' ? 44 : 48;
  const buttonGap = mode === 'Rescue' ? 'var(--sp-3)' : mode === 'Boost' ? 'var(--sp-2)' : '10px';

  const primaryBtnStyle: React.CSSProperties = {
    padding: '14px 20px',
    minHeight: buttonHeight,
    borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--font-size-body)',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    background: 'var(--color-accent)',
    color: '#fff',
    transition: 'background 0.15s',
  };

  const secondaryBtnStyle: React.CSSProperties = {
    padding: '10px 20px',
    minHeight: buttonHeight - 4,
    borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--font-size-body)',
    fontWeight: 400,
    cursor: 'pointer',
    border: '1.5px solid var(--color-border-strong)',
    background: 'transparent',
    color: 'var(--color-text-primary)',
  };

  const tertiaryBtnStyle: React.CSSProperties = {
    padding: '8px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 'var(--font-size-label)',
    fontWeight: 400,
    color: 'var(--color-text-secondary)',
    textDecoration: 'underline',
  };

  const handleSecondaryClick = (actionId: string) => {
    if (actionId === 'make_it_smaller') {
      setMakeItSmallerTapped(true);
    } else {
      onAction?.(actionId);
    }
  };

  return (
    <div style={{ marginBottom: 'var(--sp-5)' }}>
      {showGreeting && (
        <>
          <div
            style={{
              fontFamily: 'var(--font-family-greeting)',
              fontSize: 'var(--font-size-greeting)',
              fontWeight: 400,
              color: 'var(--color-text-primary)',
              marginBottom: content.subGreeting ? 'var(--sp-2)' : greetingMarginBottom,
              lineHeight: 1.25,
              whiteSpace: 'pre-line',
            }}
          >
            {content.greeting}
          </div>
          {content.subGreeting && (
            <div
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-body)',
                marginBottom: greetingMarginBottom,
                lineHeight: 1.5,
              }}
            >
              {content.subGreeting}
            </div>
          )}
        </>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: buttonGap, marginTop: showGreeting ? undefined : 'var(--sp-2)' }}>
        {content.primaryCta && (
          <button
            type="button"
            onClick={() => onAction?.(content.primaryCta!.actionId)}
            style={primaryBtnStyle}
          >
            {content.primaryCta.label}
          </button>
        )}
        {content.secondaryCta && (
          <button
            type="button"
            onClick={() => handleSecondaryClick(content.secondaryCta!.actionId)}
            style={secondaryBtnStyle}
          >
            {content.secondaryCta!.label}
          </button>
        )}
        {content.tertiaryCta && (
          <button
            type="button"
            onClick={() => onAction?.(content.tertiaryCta!.actionId)}
            style={tertiaryBtnStyle}
          >
            {content.tertiaryCta!.label}
          </button>
        )}
      </div>
    </div>
  );
}
