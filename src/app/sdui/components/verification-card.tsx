'use client';

import { useState } from 'react';
import type { SduiVerificationCard } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiVerificationCard({
  node,
  onAction,
}: {
  node: SduiVerificationCard;
  onAction?: (actionId: string) => void;
}) {
  const {
    mode, askLine,
    solidActionId, notYetActionId, dontWantActionId,
    skipTimeActionId, skipFatigueActionId, skipConfusionActionId,
  } = node.props;

  const [skipExpanded, setSkipExpanded] = useState(false);
  const isShrunk = mode === 'shrunk';

  // ── Shrunk Mode ─────────────────────────────────────────────────────────
  // Side-by-side [Yes] / [Not yet], no "Don't want to answer", demoted skip.
  if (isShrunk) {
    return (
      <div>
        {/* Card */}
        <div style={{
          background: 'var(--color-surface, #fff)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: 'var(--sp-5)',
        }}>
          <div style={{
            fontSize: 'var(--font-size-body)',
            fontWeight: 400,
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--sp-4)',
          }}>
            {askLine}
          </div>

          {/* Side-by-side binary buttons */}
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button
              type="button"
              style={{
                flex: 1,
                height: 48,
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: 'var(--font-size-body)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onClick={() => onAction?.(solidActionId)}
            >
              Yes
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                height: 48,
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--color-border-strong)',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-body)',
                fontWeight: 400,
                cursor: 'pointer',
              }}
              onClick={() => onAction?.(notYetActionId)}
            >
              Not yet
            </button>
          </div>
        </div>

        {/* Demoted skip — no arrow, text link below card */}
        <div style={{ textAlign: 'center', marginTop: 'var(--sp-4)' }}>
          {!skipExpanded ? (
            <button
              type="button"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)',
                padding: 0,
              }}
              onClick={() => setSkipExpanded(true)}
            >
              Can&apos;t right now
            </button>
          ) : (
            <div>
              <div style={{
                fontSize: 'var(--font-size-label)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--sp-2)',
              }}>
                Why are you skipping?
              </div>
              <div className="skip-chips-enter" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-2)' }}>
                {[
                  { label: 'No time', id: skipTimeActionId },
                  { label: 'Fatigue', id: skipFatigueActionId },
                  { label: 'Confused', id: skipConfusionActionId },
                ].map(({ label, id }) => (
                  <button
                    key={id}
                    type="button"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--color-accent-border)',
                      background: 'var(--color-surface, #fff)',
                      fontSize: 'var(--font-size-label)',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                    onClick={() => onAction?.(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Standard Mode ───────────────────────────────────────────────────────
  // Full card: ask, [Yes, it's solid], [Not yet], "Don't want to answer now",
  // "Can't right now ↓" with skip expansion.

  return (
    <div>
      {/* Card */}
      <div style={{
        background: 'var(--color-surface, #fff)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--sp-5)',
      }}>
        <div style={{
          fontSize: 'var(--font-size-body)',
          fontWeight: 400,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--sp-4)',
        }}>
          {askLine}
        </div>

        {/* Primary: Yes, it's solid */}
        <button
          type="button"
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
            marginBottom: 'var(--sp-3)',
          }}
          onClick={() => onAction?.(solidActionId)}
        >
          Yes, it&apos;s solid
        </button>

        {/* Secondary: Not yet */}
        <button
          type="button"
          style={{
            display: 'block',
            width: '100%',
            height: 48,
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border-strong)',
            background: 'transparent',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-body)',
            fontWeight: 400,
            cursor: 'pointer',
          }}
          onClick={() => onAction?.(notYetActionId)}
        >
          Not yet
        </button>

        {/* Tertiary: Don't want to answer now */}
        {dontWantActionId && (
          <div style={{ textAlign: 'center', marginTop: 'var(--sp-3)' }}>
            <button
              type="button"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)',
                padding: 0,
              }}
              onClick={() => onAction?.(dontWantActionId)}
            >
              Don&apos;t want to answer now
            </button>
          </div>
        )}
      </div>

      {/* Outside card: "Can't right now ↓" */}
      <div style={{ textAlign: 'center', marginTop: 'var(--sp-4)' }}>
        {!skipExpanded ? (
          <button
            type="button"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)',
              padding: 0,
            }}
            onClick={() => setSkipExpanded(true)}
          >
            Can&apos;t right now ↓
          </button>
        ) : (
          <div>
            <div style={{
              fontSize: 'var(--font-size-label)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--sp-2)',
            }}>
              Why are you skipping?
            </div>
            <div className="skip-chips-enter" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-2)' }}>
              {[
                { label: 'No time', id: skipTimeActionId },
                { label: 'Fatigue', id: skipFatigueActionId },
                { label: 'Confused', id: skipConfusionActionId },
              ].map(({ label, id }) => (
                <button
                  key={id}
                  type="button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--color-accent-border)',
                    background: 'var(--color-surface, #fff)',
                    fontSize: 'var(--font-size-label)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                  onClick={() => onAction?.(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
