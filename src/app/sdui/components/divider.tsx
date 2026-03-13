'use client';

import type { SduiDivider } from '@/ei/study-session-orchestration/domain/types/components';

export function SduiDivider({ node: _node }: { node: SduiDivider }) {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />;
}
