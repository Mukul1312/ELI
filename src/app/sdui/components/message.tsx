'use client';

import type { SduiMessage } from '@/ei/sdui/types/components';

const variantStyles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 4, color: 'var(--color-text-primary)' },
  subheading: { fontSize: 'var(--font-size-body)', fontWeight: 400, marginTop: 0, marginBottom: 12, color: 'var(--color-text-secondary)' },
  body: { fontSize: 'var(--font-size-body)', marginBottom: 8, color: 'var(--color-text-primary)' },
  muted: { fontSize: 'var(--font-size-label)', color: 'var(--color-text-tertiary)', marginBottom: 8 },
  emphasis: { fontSize: 'var(--font-size-body)', fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' },
};

export function SduiMessage({ node }: { node: SduiMessage }) {
  const { text, variant, align } = node.props;
  const style: React.CSSProperties = {
    ...variantStyles[variant],
    textAlign: align === 'center' ? 'center' : 'left',
  };
  return <div style={style}>{text}</div>;
}
