'use client';

import type { SduiSessionContextBar } from '@/ei/sdui/types/components';

export function SduiSessionContextBar({ node }: { node: SduiSessionContextBar }) {
  const { topic, taskType, difficultyTier } = node.props;

  return (
    <div
      style={{
        fontSize: 12,
        color: '#52525b',
        padding: '4px 0',
        letterSpacing: '0.04em',
      }}
    >
      {topic} · {taskType} · {difficultyTier}
    </div>
  );
}
