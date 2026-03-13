'use client';

import type { SduiDurationHeader } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiDurationHeader({
  node,
}: {
  node: SduiDurationHeader;
  onAction?: (actionId: string) => void;
}) {
  const { topicLine, taskTypeLine } = node.props;

  return (
    <div style={{ marginBottom: 'var(--sp-4)' }}>
      <div style={{
        fontSize: 'var(--font-size-greeting)',
        fontWeight: 400,
        color: 'var(--color-text-primary)',
      }}>
        {topicLine}
      </div>
      <div style={{
        fontSize: 'var(--font-size-body)',
        fontWeight: 400,
        color: 'var(--color-text-secondary)',
        marginTop: 'var(--sp-2)',
      }}>
        {taskTypeLine}
      </div>
    </div>
  );
}
