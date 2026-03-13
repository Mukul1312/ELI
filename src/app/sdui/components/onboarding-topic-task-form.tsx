'use client';

import * as React from 'react';
import type { SduiOnboardingTopicTaskForm } from '@/ei/study-session-orchestration/domain/types/components';
import type { SduiComponentProps } from '../registry';

function chipStyle(selected: boolean): React.CSSProperties {
  return {
    minWidth: 44,
    height: 40,
    padding: '0 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-label)',
    fontWeight: 500,
    cursor: 'pointer',
    border: selected ? '1.5px solid var(--color-accent-border)' : '1px solid var(--color-border)',
    background: selected ? 'var(--color-accent-soft)' : 'var(--color-surface)',
    color: selected ? 'var(--color-accent)' : 'var(--color-text-primary)',
    transition: 'background 120ms, border 120ms',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export function SduiOnboardingTopicTaskForm({
  node,
  formValues = {},
  onChange,
  onAction,
}: SduiComponentProps) {
  const {
    topicInputId,
    topicLabel,
    topicPlaceholder,
    subjectChips,
    taskTypeInputId,
    taskTypeLabel,
    taskTypeChips,
    submitCtaLabel,
    submitActionId,
  } = (node as SduiOnboardingTopicTaskForm).props;

  const topic = String(formValues[topicInputId] ?? '');
  const taskType = String(formValues[taskTypeInputId] ?? '');
  const subject = String(formValues['subject'] ?? '');
  const canSubmit = topic.trim().length > 0 && taskType.length > 0;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 52,
    padding: '0 var(--sp-4)',
    background: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-body)',
    fontWeight: 400,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--font-size-label)',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--sp-3)',
  };

  return (
    <div style={{ marginBottom: 'var(--sp-6)' }}>
      {/* Topic input */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <label style={labelStyle}>{topicLabel}</label>
        <input
          type="text"
          style={inputStyle}
          value={topic}
          onChange={(e) => onChange?.(topicInputId, e.target.value)}
          placeholder={topicPlaceholder}
          maxLength={60}
          autoFocus
        />
      </div>

      {/* Optional subject chips P/C/M/B */}
      {subjectChips && subjectChips.length > 0 && (
        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {subjectChips.map((c) => (
              <button
                key={c.value}
                type="button"
                style={chipStyle(subject === c.value)}
                onClick={() => onChange?.('subject', subject === c.value ? '' : c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task type chips — required */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <label style={labelStyle}>{taskTypeLabel}</label>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {taskTypeChips.map((c) => (
            <button
              key={c.value}
              type="button"
              style={chipStyle(taskType === c.value)}
              onClick={() => onChange?.(taskTypeInputId, c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Let's go button — disabled until topic + taskType */}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => canSubmit && onAction?.(submitActionId)}
        style={{
          width: '100%',
          height: 52,
          padding: 0,
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-body)',
          fontWeight: 500,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          border: 'none',
          background: canSubmit ? 'var(--color-accent)' : 'var(--color-surface-subtle)',
          color: canSubmit ? '#fff' : 'var(--color-text-tertiary)',
        }}
      >
        {submitCtaLabel}
      </button>
    </div>
  );
}
