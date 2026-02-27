'use client';

import type { SduiOnboardingWelcomeCard } from '@/ei/sdui/types/components';
import type { SduiComponentProps } from '../registry';

export function SduiOnboardingWelcomeCard({ node, onAction }: SduiComponentProps) {
  const n = node as SduiOnboardingWelcomeCard;
  const { title, tagline, bodyLines, momentsHighlight, ctaLabel, ctaActionId } = n.props;

  return (
    <div style={{ marginBottom: 'var(--sp-8)' }}>
      {/* Title: ELI — 28px display, weight 500 */}
      <h1
        style={{
          fontSize: 'var(--font-size-display)',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--sp-4)',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
      {/* Tagline: Your study companion — 22px greeting */}
      <p
        style={{
          fontSize: 'var(--font-size-greeting)',
          fontWeight: 400,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--sp-6)',
          lineHeight: 1.3,
        }}
      >
        {tagline}
      </p>
      {/* Body lines — 16px, secondary; moments in primary */}
      <div
        style={{
          fontSize: 'var(--font-size-body)',
          fontWeight: 400,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
          marginBottom: 'var(--sp-8)',
        }}
      >
        {bodyLines.map((line, i) => {
          const hasHighlight = momentsHighlight && line.includes(momentsHighlight);
          return (
            <p key={i} style={{ marginBottom: 'var(--sp-2)' }}>
              {hasHighlight ? (
                <>
                  {line.slice(0, line.indexOf(momentsHighlight))}
                  <span style={{ color: 'var(--color-text-primary)' }}>{momentsHighlight}</span>
                  {line.slice(line.indexOf(momentsHighlight) + momentsHighlight.length)}
                </>
              ) : (
                line
              )}
            </p>
          );
        })}
      </div>
      {/* Get started — 52px height, primary CTA */}
      <button
        type="button"
        onClick={() => onAction?.(ctaActionId)}
        style={{
          width: '100%',
          height: 52,
          padding: 0,
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-body)',
          fontWeight: 500,
          cursor: 'pointer',
          border: 'none',
          background: 'var(--color-accent)',
          color: '#fff',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
