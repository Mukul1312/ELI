'use client';

import { useState, useEffect, useCallback } from 'react';
import { SduiView, resolvePayload } from '@/app/sdui/renderer';
import type { SduiResponse } from '@/app/sdui/types';

// ============================================================================
// Types
// ============================================================================

type Phase = 'checkin' | 'intent' | 'activation' | 'session' | 'verification' | 'done';

// ============================================================================
// Styles
// ============================================================================

const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '24px 16px', minHeight: '100vh' } as const,
  card: {
    background: '#1a1b23', borderRadius: 12, padding: '24px 20px', marginBottom: 16,
    border: '1px solid #2a2b35',
  } as const,
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 6 } as const,
  input: {
    width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2a2b35',
    borderRadius: 8, color: '#e4e4e7', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  } as const,
  field: { marginBottom: 16 } as const,
  muted: { color: '#71717a', fontSize: 13 } as const,
  error: { color: '#f87171', fontSize: 13, marginTop: 8 } as const,
  btn: (variant: 'primary' | 'secondary' = 'secondary') => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    ...(variant === 'primary' ? { background: '#4f46e5', color: '#fff', border: 'none' } :
        { background: '#27272a', color: '#a1a1aa', border: '1px solid #3f3f46' }),
  }),
};

// ============================================================================
// Main Page Component
// ============================================================================

export default function Home() {
  const [phase, setPhase] = useState<Phase>('checkin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState('');
  const [secret, setSecret] = useState('');
  const [isFirstOfDay, setIsFirstOfDay] = useState(true);
  const [currentSduiResponse, setCurrentSduiResponse] = useState<SduiResponse | Record<string, unknown> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | number>>({});

  useEffect(() => {
    const stored = {
      studentId: localStorage.getItem('ei_studentId') ?? '',
      secret: localStorage.getItem('ei_secret') ?? '',
      lastDate: localStorage.getItem('ei_lastCheckinDate'),
    };
    setStudentId(stored.studentId);
    setSecret(stored.secret);
    setIsFirstOfDay(stored.lastDate !== new Date().toISOString().slice(0, 10));
  }, []);

  const api = useCallback(async (path: string, body: unknown) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) headers['Authorization'] = `Bearer ${secret}`;
    const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text();
      let msg: string;
      try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { msg = text; }
      throw new Error(msg);
    }
    return res.json();
  }, [secret]);

  useEffect(() => {
    if (phase !== 'checkin' || currentSduiResponse !== null) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api('/api/ei/command', {
          commandType: 'AppOpen',
          payload: { initial: true, isFirstOfDay },
        });
        if (!cancelled) {
          setCurrentSduiResponse(res);
          setPhase((res as { phase?: Phase }).phase ?? 'checkin');
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [phase, isFirstOfDay, currentSduiResponse, api]);

  const handleSduiAction = useCallback(
    async (actionId: string) => {
      const resp = currentSduiResponse as { actions?: Record<string, { id: string; endpoint: { path: string }; payload: Record<string, unknown> }> } | null;
      if (!resp?.actions) return;
      const action = resp.actions[actionId];
      if (!action) return;
      const resolved = resolvePayload(action.payload, formValues);
      setError(null);
      setLoading(true);
      try {
        const result = await api(action.endpoint.path, resolved);
        setCurrentSduiResponse(result);
        const phaseFromServer = (result as { phase?: Phase }).phase;
        const resultTopic = (result as { topic?: string }).topic;
        if (phaseFromServer) setPhase(phaseFromServer);
        if (resultTopic) localStorage.setItem('ei_topic', resultTopic);
        if (phaseFromServer === 'checkin') setFormValues({});
        if (actionId === 'submit_checkin' && resultTopic) {
          localStorage.setItem('ei_studentId', studentId);
          localStorage.setItem('ei_secret', secret);
          localStorage.setItem('ei_lastCheckinDate', new Date().toISOString().slice(0, 10));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Request failed');
      } finally {
        setLoading(false);
      }
    },
    [currentSduiResponse, formValues, api, studentId, secret]
  );

  const handleFormChange = useCallback((id: string, value: string | number) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const hasView = currentSduiResponse && 'view' in currentSduiResponse && 'actions' in currentSduiResponse;

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
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Student ID</label>
            <input style={s.input} value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="your-id" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Pilot Secret (optional)</label>
            <input style={s.input} type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="secret" />
          </div>
        </div>

        {!hasView && loading && <p style={s.muted}>Loading…</p>}
        {hasView && (
          <>
            <SduiView
              view={(currentSduiResponse as SduiResponse).view}
              actions={(currentSduiResponse as SduiResponse).actions}
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
