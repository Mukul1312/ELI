'use client';

import { useState, useEffect } from 'react';
import type { SduiSessionTimer } from '@/ei/sdui/types/components';

export function SduiSessionTimer({
  node,
  onAction,
}: {
  node: SduiSessionTimer;
  onAction?: (actionId: string) => void;
}) {
  const { topic, endActionId, endLabel } = node.props;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <div style={{ fontSize: 32, fontFamily: 'monospace', marginBottom: 16 }}>{timeStr}</div>
      {endActionId && (
        <button
          type="button"
          onClick={() => onAction?.(endActionId)}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            background: '#991b1b',
            color: '#fecaca',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          {endLabel ?? 'End Session'}
        </button>
      )}
    </div>
  );
}
