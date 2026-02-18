import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'AI Study Brother — ELI',
  description: 'Execution Intelligence coaching prototype',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#0f1117',
        color: '#e4e4e7',
        minHeight: '100vh',
      }}>
        {children}
      </body>
    </html>
  );
}
