'use client';

import type { SduiMessage } from '@/ei/sdui/types/components';

const variantStyles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 4 },
  subheading: { fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 12, color: '#a1a1aa' },
  body: { fontSize: 14, marginBottom: 8, color: '#e4e4e7' },
  muted: { fontSize: 13, color: '#71717a', marginBottom: 8 },
  emphasis: { fontSize: 14, fontWeight: 600, marginBottom: 8 },
};

export function SduiMessage({ node }: { node: SduiMessage }) {
  const { text, variant, align } = node.props;
  const style: React.CSSProperties = {
    ...variantStyles[variant],
    textAlign: align === 'center' ? 'center' : 'left',
  };
  return <div style={style}>{text}</div>;
}
