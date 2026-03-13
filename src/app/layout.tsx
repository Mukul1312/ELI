import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter, Lora } from 'next/font/google';
import { AuthProvider } from './auth-provider';
import { UserButton } from '@neondatabase/auth/react/ui';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-family' });
const lora = Lora({ subsets: ['latin'], display: 'swap', variable: '--font-family-greeting', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Eli - Focused Study Companion',
  description: 'Meet Eli. Not a Coach. Not a Tracker. Just a Companion for your focused study sessions.',
  manifest: 'https://progressier.app/npJ4ibkRsWFIMDC7IIyX/progressier.json',
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
        <Script
          src="https://progressier.app/npJ4ibkRsWFIMDC7IIyX/script.js"
          strategy="afterInteractive"
        />
        <AuthProvider>
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              gap: 16,
              minHeight: 64,
            }}
          >
            <div style={{ textAlign: 'left', }}>
              <span style={{ textTransform: 'uppercase' as const }}>ELI</span>
            </div>
            <UserButton size="icon" />
          </header>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
