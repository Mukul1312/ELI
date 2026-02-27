'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SduiView, SduiSlot, resolvePayload } from '@/app/sdui/renderer';
import type { SduiResponse, SduiComponent } from '@/app/sdui/types';
import { composeOnboardingTopicTaskView } from '@/ei/sdui/view-composer';

// ============================================================================
// Styles
// ============================================================================

type AuthState = 'initializing' | 'loading' | 'unauthenticated' | 'authenticated' | 'error';

function pageLayoutStyles(mode?: 'Rescue' | 'Neutral' | 'Boost') {
  const topPadding = mode === 'Rescue' ? 'var(--sp-12)' : 'var(--sp-10)'; // 48px Rescue, 40px Neutral/Boost
  const background = mode === 'Rescue' ? 'var(--color-bg-rescue)' : 'var(--color-bg)';
  return {
    maxWidth: 480,
    margin: '0 auto',
    padding: `${topPadding} var(--sp-4) var(--sp-10)`,
    minHeight: '100vh',
    background,
  } as const;
}

const s = {
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--sp-6) var(--sp-5)',
    marginBottom: 'var(--sp-4)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-card)',
  } as const,
  muted: { color: 'var(--color-text-tertiary)', fontSize: 13 } as const,
  error: { color: '#c0392b', fontSize: 13, marginTop: 8 } as const,
  btn: (variant: 'primary' | 'secondary' = 'secondary') => ({
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    ...(variant === 'primary'
      ? { background: 'var(--color-accent)', color: '#fff', border: 'none' }
      : {
          background: 'var(--color-surface-subtle)',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border-strong)',
        }),
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
  const [sessionFooter, setSessionFooter] = useState<SduiComponent[]>([]);
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
          const footerNodes = (res.view?.footer ?? []).filter(
            (c) => c.type === 'session-summary-footer',
          );
          if (footerNodes.length > 0) setSessionFooter(footerNodes);
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

  // Check if AppOpen checkin payload has required fields (topic, energy, sleepBucket)
  const hasRequiredCheckinFields = useCallback(() => {
    const topic = formValues['topic'];
    const energy = formValues['energy'];
    const sleepBucket = formValues['sleepBucket'];
    return typeof topic === 'string' && topic.trim() !== ''
      && typeof energy === 'number' && energy >= 1 && energy <= 5
      && typeof sleepBucket === 'string' && sleepBucket.length > 0;
  }, [formValues]);

  // Generic action handler: resolve payload, POST to endpoint, update view
  const handleSduiAction = useCallback(
    async (actionId: string) => {
      if (actionId === 'onboarding_next') {
        setCurrentSduiResponse(composeOnboardingTopicTaskView());
        setFormValues({});
        return;
      }

      const action = currentSduiResponse?.actions?.[actionId];
      if (!action) return;
      
      const isAppOpen = action.payload?.commandType === 'AppOpen';
      const isIntentSet = action.payload?.commandType === 'IntentSet';
      const isFirstTouch = isAppOpen && (action.payload.payload as any)?.initial === true;
      const isMicroStart = isAppOpen && (action.payload.payload as any)?.timeboxMin === 1;
      const isOnboardingSubmit = isAppOpen && (action.payload.payload as any)?.taskType !== undefined && (action.payload.payload as any)?.energy === undefined;
      
      // Phase 1 greeting/checkin CTAs require form filled before posting AppOpen
      if (isAppOpen && !isFirstTouch && !isOnboardingSubmit && !isMicroStart) {
        if (!hasRequiredCheckinFields()) {
          setErrorMessage('Please fill in topic, energy, and sleep to continue.');
          return;
        }
      }
      
      // Onboarding submit: only topic + taskType required (no energy/sleep)
      if (isOnboardingSubmit || isIntentSet) {
        const topic = formValues['topic'] || (action.payload.payload as any)?.topic;
        const taskType = formValues['taskType'] || (action.payload.payload as any)?.taskType;
        
        // Only validate if these fields are expected to be filled from the form
        const needsTopic = (action.payload.payload as any)?.topic === '{{topic}}';
        const needsTaskType = (action.payload.payload as any)?.taskType === '{{taskType}}';
        
        if ((needsTopic && (!topic || typeof topic !== 'string' || !topic.trim())) || 
            (needsTaskType && (!taskType || typeof taskType !== 'string' || !taskType))) {
          setErrorMessage('Please enter a topic and select a task type.');
          return;
        }
      }
      
      const resolved = resolvePayload(action.payload, formValues);
      setErrorMessage(null);
      setActionLoading(true);
      const idempotencyKey = crypto.randomUUID();
      try {
        const result = await api(action.endpoint.path, resolved, idempotencyKey);
        setCurrentSduiResponse(result);
        // Persist footer across phase transitions (Phase 2 has no footer)
        const footerNodes = (result.view?.footer ?? []).filter(
          (c) => c.type === 'session-summary-footer',
        );
        if (footerNodes.length > 0) setSessionFooter(footerNodes);
        setFormValues({});
      } catch (err: unknown) {
        setAuthState('error');
        setErrorMessage(err instanceof Error ? err.message : 'Request failed');
      } finally {
        setActionLoading(false);
      }
    },
    [currentSduiResponse, formValues, api, hasRequiredCheckinFields],
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
  // Checkin: domain.mode; P1/P2: mode at top level
  const pageMode = (currentSduiResponse?.domain as { mode?: 'Rescue' | 'Neutral' | 'Boost' } | null)?.mode
    ?? (currentSduiResponse as { mode?: 'Rescue' | 'Neutral' | 'Boost' })?.mode;
  const pageStyles = pageLayoutStyles(pageMode);

  return (
    <div style={pageStyles}>
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

      {/* Persisted session footer — shown across all phases, even Phase 2 (no footer in active session) */}
      {authState === 'authenticated' && sessionFooter.length > 0 && (
        <SduiSlot
          components={sessionFooter}
          formValues={formValues}
          onFormChange={handleFormChange}
          onAction={handleSduiAction}
        />
      )}
    </div>
  );
}
