'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SduiView, resolvePayload } from '@/app/sdui/renderer';
import type { SduiResponse } from '@/app/sdui/types';

// ============================================================================
// Styles
// ============================================================================

type AuthState = 'initializing' | 'loading' | 'unauthenticated' | 'authenticated' | 'error';

const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '24px 16px', minHeight: '100vh' } as const,
  card: {
    background: '#1a1b23', borderRadius: 12, padding: '24px 20px', marginBottom: 16,
    border: '1px solid #2a2b35',
  } as const,
  muted: { color: '#71717a', fontSize: 13 } as const,
  error: { color: '#f87171', fontSize: 13, marginTop: 8 } as const,
  btn: (variant: 'primary' | 'secondary' = 'secondary') => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    ...(variant === 'primary' ? { background: '#4f46e5', color: '#fff', border: 'none' } :
        { background: '#27272a', color: '#a1a1aa', border: '1px solid #3f3f46' }),
  }),
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// Main Page Component — pure SDUI renderer
// ============================================================================

export default function Home() {
  const [authState, setAuthState] = useState<AuthState>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentSduiResponse, setCurrentSduiResponse] = useState<SduiResponse | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | number>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [bootstrapTrigger, setBootstrapTrigger] = useState(0);

  // POST helper — identity via Neon Auth session cookie (credentials: 'include')
  const api = useCallback(async (path: string, body: unknown, idempotencyKey?: string) => {
    const payload = typeof body === 'object' && body !== null && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>), ...(idempotencyKey ? { idempotencyKey } : {}) }
      : body;
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      let msg: string;
      try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { msg = text; }
      throw new Error(msg);
    }
    return res.json() as Promise<SduiResponse>;
  }, []);

  // On mount (and Retry): ensure session exists (with retry for OAuth callback race), then POST AppOpen
  useEffect(() => {
    let cancelled = false;
    setAuthState('loading');
    setErrorMessage(null);

    const run = async () => {
      const retryDelays = [0, 200, 400];
      let hasSession = false;
      let lastErr: Error | null = null;

      for (let attempt = 0; attempt <= 2 && !cancelled; attempt++) {
        if (attempt > 0) await delay(retryDelays[attempt]);

        try {
          const sessionRes = await fetch('/api/auth/get-session', { credentials: 'include' });
          const sessionData = sessionRes.ok ? await sessionRes.json() : null;
          hasSession = !!sessionData?.user?.id || !!sessionData?.session;
          if (hasSession) break;
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error('Connection failed');
        }
      }

      if (cancelled) return;

      if (!hasSession) {
        if (lastErr) {
          setAuthState('error');
          setErrorMessage('Connection failed. Please try again.');
        } else {
          setAuthState('unauthenticated');
        }
        return;
      }

      try {
        const idempotencyKey = crypto.randomUUID();
        const res = await api('/api/ei/command', { commandType: 'AppOpen', payload: { initial: true } }, idempotencyKey);
        if (!cancelled) {
          setCurrentSduiResponse(res);
          setAuthState('authenticated');
        }
      } catch (err) {
        if (!cancelled) {
          setAuthState('error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load');
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [bootstrapTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generic action handler: resolve payload, POST to endpoint, update view
  const handleSduiAction = useCallback(
    async (actionId: string) => {
      const action = currentSduiResponse?.actions?.[actionId];
      if (!action) return;
      const resolved = resolvePayload(action.payload, formValues);
      setErrorMessage(null);
      setActionLoading(true);
      const idempotencyKey = crypto.randomUUID();
      try {
        const result = await api(action.endpoint.path, resolved, idempotencyKey);
        setCurrentSduiResponse(result);
        setFormValues({});
      } catch (err: unknown) {
        setAuthState('error');
        setErrorMessage(err instanceof Error ? err.message : 'Request failed');
      } finally {
        setActionLoading(false);
      }
    },
    [currentSduiResponse, formValues, api],
  );

  const handleFormChange = useCallback((id: string, value: string | number) => {
    setFormValues(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleDismissError = useCallback(() => {
    setErrorMessage(null);
    setAuthState(currentSduiResponse ? 'authenticated' : 'unauthenticated');
  }, [currentSduiResponse]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setBootstrapTrigger(t => t + 1);
  }, []);

  const isInitialLoading = authState === 'initializing' || authState === 'loading';

  return (
    <div style={s.page}>
      <div style={{ textAlign: 'center', marginBottom: 20, opacity: 0.6 }}>
        <span style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' as const }}>ELI — Study Brother</span>
      </div>

      {authState === 'error' && errorMessage && (
        <div style={{ ...s.card, borderColor: '#7f1d1d' }}>
          <p style={{ ...s.error, margin: 0 }}>{errorMessage}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={{ ...s.btn('secondary'), fontSize: 12 }} onClick={handleDismissError}>Dismiss</button>
            {!currentSduiResponse && (
              <button style={{ ...s.btn('primary'), fontSize: 12 }} onClick={handleRetry}>Retry</button>
            )}
          </div>
        </div>
      )}

      <div style={s.card}>
        {isInitialLoading && <p style={s.muted}>Getting started…</p>}
        {authState === 'unauthenticated' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ ...s.muted, margin: 0 }}>Sign in with Google to start your study session.</p>
            <Link href="/auth/sign-in" style={{ ...s.btn('primary'), textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
              Sign in
            </Link>
          </div>
        )}
        {authState === 'authenticated' && currentSduiResponse && (
          <>
            <SduiView
              view={currentSduiResponse.view}
              actions={currentSduiResponse.actions}
              formValues={formValues}
              onFormChange={handleFormChange}
              onAction={handleSduiAction}
            />
            {actionLoading && <p style={{ ...s.muted, marginTop: 8 }}>Processing…</p>}
          </>
        )}
      </div>
    </div>
  );
}
