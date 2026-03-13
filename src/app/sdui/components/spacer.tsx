'use client';

import type { SduiSpacer } from '@/ei/study-session-orchestration/domain/types/components';

const sizes: Record<string, number> = { sm: 8, md: 16, lg: 24 };

export function SduiSpacer({ node }: { node: SduiSpacer }) {
  const size = sizes[node.props.size] ?? 16;
  return <div style={{ height: size }} />;
}
