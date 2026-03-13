'use client';

import { useState, useEffect } from 'react';
import type { SduiSessionContextBar } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiSessionContextBar({ node }: { node: SduiSessionContextBar }) {
  const { topic, taskType, scopeLabel, sessionStartedAt } = node.props;

  // Elapsed minutes — computed from sessionStartedAt, updates every 60s
  const [elapsedMin, setElapsedMin] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionStartedAt) return;
    const startMs = new Date(sessionStartedAt).getTime();
    const compute = () => Math.floor((Date.now() - startMs) / 60_000);
    setElapsedMin(compute());
    const id = setInterval(() => setElapsedMin(compute()), 60_000);
    return () => clearInterval(id);
  }, [sessionStartedAt]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--color-surface-subtle, var(--color-accent-soft))',
        borderBottom: '1px solid var(--color-border, var(--color-accent-border))',
        padding: '10px var(--sp-4)',
      }}
    >
      <span style={{
        fontSize: 'var(--font-size-label)',
        fontWeight: 400,
        color: 'var(--color-text-secondary)',
      }}>
        {topic} · {taskType} · {scopeLabel}
      </span>
      {elapsedMin !== null && elapsedMin > 0 && (
        <span style={{
          fontSize: 'var(--font-size-caption)',
          fontWeight: 400,
          color: 'var(--color-text-tertiary)',
        }}>
          {elapsedMin} min
        </span>
      )}
    </div>
  );
}
