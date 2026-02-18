import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Study Brother',
  description: 'Execution Intelligence — student prototype',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
