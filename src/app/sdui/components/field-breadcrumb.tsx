'use client';

import type { SduiFieldBreadcrumb } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiFieldBreadcrumb({
  node,
  formValues,
  onAction,
}: {
  node: SduiFieldBreadcrumb;
  formValues?: Record<string, string | number>;
  onAction?: (actionId: string) => void;
}) {
  const { inputId, label, valueLabels, editActionId } = node.props;
  const raw = formValues?.[inputId];
  const key = raw !== undefined ? String(raw) : undefined;
  const display = key ? (valueLabels?.[key] ?? key) : '—';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        padding: '2px 0',
      }}
    >
      <span>
        {label}: {display}
      </span>
      {editActionId && (
        <button
          type="button"
          onClick={() => onAction?.(editActionId)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            padding: '2px 4px',
          }}
        >
          Edit
        </button>
      )}
    </div>
  );
}
