'use client';

import type { SduiPendingChecks } from '@/ei/sdui/types/components';

export function SduiPendingChecks({ node }: { node: SduiPendingChecks }) {
  const { count, label, celebratory } = node.props;
  const style: React.CSSProperties = celebratory
    ? { color: '#86efac', fontSize: 13, fontWeight: 600 }
    : { color: '#a1a1aa', fontSize: 13 };
  return (
    <div style={style}>
      {label.replace('{{count}}', String(count))}
    </div>
  );
}
