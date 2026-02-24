'use client';

import { useState, useEffect, useCallback } from 'react';
import { SduiView, resolvePayload } from '@/app/sdui/renderer';
import type { SduiResponse } from '@/app/sdui/types';

// ============================================================================
// Styles
// ============================================================================

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

// ============================================================================
// Main Page Component — pure SDUI renderer
// ============================================================================

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSduiResponse, setCurrentSduiResponse] = useState<SduiResponse | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | number>>({});

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

  // On mount: POST AppOpen to get initial checkin view (fires once)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const idempotencyKey = crypto.randomUUID();
    api('/api/ei/command', { commandType: 'AppOpen', payload: { initial: true } }, idempotencyKey)
      .then(res => { if (!cancelled) setCurrentSduiResponse(res); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Generic action handler: resolve payload, POST to endpoint, update view
  const handleSduiAction = useCallback(
    async (actionId: string) => {
      const action = currentSduiResponse?.actions?.[actionId];
      if (!action) return;
      const resolved = resolvePayload(action.payload, formValues);
      setError(null);
      setLoading(true);
      const idempotencyKey = crypto.randomUUID();
      try {
        const result = await api(action.endpoint.path, resolved, idempotencyKey);
        setCurrentSduiResponse(result);
        setFormValues({});
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Request failed');
      } finally {
        setLoading(false);
      }
    },
    [currentSduiResponse, formValues, api],
  );

  const handleFormChange = useCallback((id: string, value: string | number) => {
    setFormValues(prev => ({ ...prev, [id]: value }));
  }, []);

  return (
    <div style={s.page}>
      <div style={{ textAlign: 'center', marginBottom: 20, opacity: 0.6 }}>
        <span style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' as const }}>ELI — Study Brother</span>
      </div>

      {error && (
        <div style={{ ...s.card, borderColor: '#7f1d1d' }}>
          <p style={{ ...s.error, margin: 0 }}>{error}</p>
          <button style={{ ...s.btn('secondary'), marginTop: 8, fontSize: 12 }} onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div style={s.card}>
        {!currentSduiResponse && loading && <p style={s.muted}>Loading…</p>}
        {currentSduiResponse && (
          <>
            <SduiView
              view={currentSduiResponse.view}
              actions={currentSduiResponse.actions}
              formValues={formValues}
              onFormChange={handleFormChange}
              onAction={handleSduiAction}
            />
            {loading && <p style={{ ...s.muted, marginTop: 8 }}>Processing…</p>}
          </>
        )}
      </div>
    </div>
  );
}
