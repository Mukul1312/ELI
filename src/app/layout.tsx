import type { Metadata, Viewport } from 'next';
import { AuthProvider } from './auth-provider';
import { UserButton } from '@neondatabase/auth/react/ui';
import './globals.css';

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
    <html lang="en" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#0f1117',
          color: '#e4e4e7',
          minHeight: '100vh',
        }}
      >
        <AuthProvider>
          <header
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: 16,
              gap: 16,
              minHeight: 64,
            }}
          >
            <UserButton size="icon" />
          </header>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
