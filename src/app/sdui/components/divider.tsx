'use client';

import type { SduiDivider } from '@/ei/sdui/types/components';

export function SduiDivider({ node: _node }: { node: SduiDivider }) {
  return <hr style={{ border: 'none', borderTop: '1px solid #2a2b35', margin: '16px 0' }} />;
}
