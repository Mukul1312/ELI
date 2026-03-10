import type { Metadata, Viewport } from 'next';
import { Inter, Lora } from 'next/font/google';
import { AuthProvider } from './auth-provider';
import { UserButton } from '@neondatabase/auth/react/ui';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-family' });
const lora = Lora({ subsets: ['latin'], display: 'swap', variable: '--font-family-greeting', weight: ['400', '500'] });

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
    <html lang="en" className={`${inter.variable} ${lora.variable}`} suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          fontFamily: 'var(--font-family)',
          background: 'var(--color-bg)',
          color: 'var(--color-text-primary)',
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
