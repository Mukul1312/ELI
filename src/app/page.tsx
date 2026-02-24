'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

type Phase = 'checkin' | 'intent' | 'activation' | 'session' | 'verification' | 'done';

interface IntentData {
  studentId: string;
  mode: string;
  playId: string;
  topic: string;
  taskType?: string;
  scope: { timeboxMin: number; questionCount: number; difficultyTier: string };
  verificationPlan: { minQuestions: number; preferVerifyNow: boolean };
  constraints?: { closeOpenLoopFirst?: boolean; noNewTopicUntil?: string };
  stateScore: number;
  rationale?: string;
  issuedAt: string;
}

interface ActivationData {
  studentId: string;
  mode: string;
  playId: string;
  firstAction: { type: string; timeboxMin?: number; timeboxSec?: number; description?: string };
  replanCap?: number;
  focusContract?: { noSwitchingUntil?: number };
  allowedFallback?: { enforceWatchOnlyVerification?: boolean };
  rationale?: string;
  issuedAt: string;
}

interface VerificationData {
  studentId: string;
  mode: string;
  playId: string;
  topic: string;
  verificationDecision: 'VerifyNow' | 'ScheduleVerify' | 'Skip';
  verificationSpec?: { minQuestions: number; timeboxSec?: number; difficultyTier?: string; format?: string };
  deadlineSpec?: { dueInHours: number; graceHours: number; minQuestions: number };
  reason?: string;
  rationale?: string;
  issuedAt: string;
}

// ============================================================================
// Scale Definitions (from EI_UX_Scales.md — labels-first, numbers-second)
// ============================================================================

const ENERGY_CHIPS = [
  { label: 'Exhausted', value: 1 },
  { label: 'Low', value: 2 },
  { label: 'Okay', value: 3 },
  { label: 'Good', value: 4 },
  { label: 'Sharp', value: 5 },
];

const PRESSURE_CHIPS = [
  { label: 'Calm', value: 1 },
  { label: 'Slightly tense', value: 2 },
  { label: 'Uneasy', value: 3 },
  { label: 'Very stressed', value: 4 },
  { label: 'Panicky', value: 5 },
];

const BACKLOG_CHIPS = [
  { label: 'On track', value: 1 },
  { label: 'Mostly on track', value: 2 },
  { label: 'Some pending', value: 3 },
  { label: 'Behind', value: 4 },
  { label: 'Drowning', value: 5 },
];

const SLEEP_CHIPS = [
  { label: 'Sleep-debt', value: '<6' },
  { label: 'Low sleep', value: '6-7' },
  { label: 'Okay sleep', value: '7-8' },
  { label: 'Fully slept', value: '>=8' },
];

const TASK_TYPE_CHIPS = [
  { label: 'Learn', value: 'Learn' },
  { label: 'Practice', value: 'Practice' },
  { label: 'Revise', value: 'Revise' },
];

const SKIP_REASONS = [
  { label: 'Skip (Fatigue)', value: 'fatigue' },
  { label: 'Skip (Time)', value: 'time' },
  { label: 'Skip (Confusion)', value: 'confusion' },
];

// ============================================================================
// Styles
// ============================================================================

const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '24px 16px', minHeight: '100vh' } as const,
  card: {
    background: '#1a1b23', borderRadius: 12, padding: '24px 20px', marginBottom: 16,
    border: '1px solid #2a2b35',
  } as const,
  h1: { fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 4 } as const,
  h2: { fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 12, color: '#a1a1aa' } as const,
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 6 } as const,
  input: {
    width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2a2b35',
    borderRadius: 8, color: '#e4e4e7', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  } as const,
  chipRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 16 } as const,
  chip: (selected: boolean) => ({
    padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
    border: selected ? '2px solid #818cf8' : '1px solid #3f3f46', background: selected ? '#312e81' : '#1a1b23',
    color: selected ? '#c7d2fe' : '#a1a1aa', transition: 'all 0.15s',
  }),
  btn: (variant: 'primary' | 'secondary' | 'danger' = 'primary') => ({
    padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    border: 'none', transition: 'opacity 0.15s',
    ...(variant === 'primary' ? { background: '#4f46e5', color: '#fff' } :
        variant === 'danger' ? { background: '#991b1b', color: '#fecaca' } :
        { background: '#27272a', color: '#a1a1aa', border: '1px solid #3f3f46' }),
  }),
  badge: (mode: string) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
    ...(mode === 'Rescue' ? { background: '#7f1d1d', color: '#fca5a5' } :
        mode === 'Boost' ? { background: '#14532d', color: '#86efac' } :
        { background: '#1e3a5f', color: '#93c5fd' }),
  }),
  row: { display: 'flex', gap: 8, marginTop: 12 } as const,
  muted: { color: '#71717a', fontSize: 13 } as const,
  error: { color: '#f87171', fontSize: 13, marginTop: 8 } as const,
  field: { marginBottom: 16 } as const,
  timer: { fontSize: 48, fontWeight: 700, textAlign: 'center' as const, fontVariantNumeric: 'tabular-nums', margin: '24px 0' } as const,
};

// ============================================================================
// Reusable Components
// ============================================================================

function ChipSelect<T extends string | number>({
  chips, value, onChange, disabled,
}: {
  chips: { label: string; value: T }[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div style={s.chipRow}>
      {chips.map((c) => (
        <button
          key={String(c.value)}
          type="button"
          style={s.chip(value === c.value)}
          onClick={() => !disabled && onChange(c.value)}
          disabled={disabled}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  return <span style={s.badge(mode)}>{mode}</span>;
}

function Spinner() {
  return <span style={{ ...s.muted, display: 'inline-block' }}>Processing…</span>;
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function Home() {
  // ── Session state ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('checkin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check-in state
  const [studentId, setStudentId] = useState('');
  const [secret, setSecret] = useState('');
  const [topic, setTopic] = useState('');
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleepBucket, setSleepBucket] = useState<string | null>(null);
  const [pressure, setPressure] = useState<number | null>(null);
  const [backlogPressure, setBacklogPressure] = useState<number | null>(null);
  const [showMoreContext, setShowMoreContext] = useState(false);
  const [isFirstOfDay, setIsFirstOfDay] = useState(true);

  // Protocol output state
  const [intentData, setIntentData] = useState<IntentData | null>(null);
  const [activationData, setActivationData] = useState<ActivationData | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);

  // Intent edit state
  const [editMode, setEditMode] = useState(false);
  const [editTopic, setEditTopic] = useState('');
  const [editTaskType, setEditTaskType] = useState<string>('Learn');

  // Activation state
  const [replanCount, setReplanCount] = useState(0);

  // Session timer state
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Verification form state
  const [questionsAttempted, setQuestionsAttempted] = useState(1);
  const [correct, setCorrect] = useState(0);

  // Done state
  const [pendingChecks, setPendingChecks] = useState(0);

  // ── localStorage hydration ───────────────────────────────────────────────
  useEffect(() => {
    const stored = {
      studentId: localStorage.getItem('ei_studentId') ?? '',
      secret: localStorage.getItem('ei_secret') ?? '',
      topic: localStorage.getItem('ei_topic') ?? '',
      lastDate: localStorage.getItem('ei_lastCheckinDate'),
    };
    setStudentId(stored.studentId);
    setSecret(stored.secret);
    setTopic(stored.topic);

    const today = new Date().toISOString().slice(0, 10);
    setIsFirstOfDay(stored.lastDate !== today);
  }, []);

  // ── Session timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'session' || !sessionStart) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [phase, sessionStart]);

  // ── API helper ───────────────────────────────────────────────────────────
  const api = useCallback(async (path: string, body: any) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) headers['Authorization'] = `Bearer ${secret}`;
    const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text();
      let msg: string;
      try { msg = JSON.parse(text).error ?? text; } catch { msg = text; }
      throw new Error(msg);
    }
    return res.json();
  }, [secret]);

  // ── Phase handlers ───────────────────────────────────────────────────────

  async function handleCheckin() {
    if (!studentId || !topic || energy == null) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    setLoading(true);

    // Persist to localStorage
    localStorage.setItem('ei_studentId', studentId);
    localStorage.setItem('ei_secret', secret);
    localStorage.setItem('ei_topic', topic);
    localStorage.setItem('ei_lastCheckinDate', new Date().toISOString().slice(0, 10));

    try {
      const result = await api('/api/ei/command', {
        commandType: 'AppOpen',
        payload: {
          topic,
          energy,
          sleepBucket: sleepBucket ?? undefined,
          pressure: pressure ?? undefined,
          backlogPressure: backlogPressure ?? undefined,
        },
      });
      // Server may return P1 (NegotiatedIntent) or P2 (ActivationPlan) per S2 Day 2-21
      if ('firstAction' in result) {
        setActivationData(result as ActivationData);
        setTopic(topic);
        setReplanCount(0);
        setPhase('activation');
      } else {
        setIntentData(result as IntentData);
        setEditTopic(result.topic);
        setEditTaskType(result.taskType ?? 'Learn');
        setPhase('intent');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleIntentResponse(decision: 'accepted' | 'edited' | 'rejected') {
    if (!intentData) return;
    setError(null);
    setLoading(true);

    try {
      // Emit IntentResponse event
      await api('/api/ei/event', {
        studentId,
        eventType: 'IntentResponse',
        payload: { decision, respondedAt: new Date().toISOString() },
      });

      if (decision === 'rejected') {
        setPhase('checkin');
        setIntentData(null);
        setLoading(false);
        return;
      }

      const finalTopic = decision === 'edited' ? editTopic : intentData.topic;
      const finalTaskType = decision === 'edited' ? editTaskType : (intentData.taskType ?? 'Learn');

      // Emit IntentSet event
      const setAt = new Date().toISOString();
      await api('/api/ei/event', {
        studentId,
        eventType: 'IntentSet',
        topicId: finalTopic,
        payload: { topic: finalTopic, taskType: finalTaskType, setAt },
      });

      // Call command endpoint (server decides P1 vs P2)
      const result: ActivationData = await api('/api/ei/command', {
        commandType: 'IntentSet',
        payload: { topic: finalTopic, taskType: finalTaskType, setAt },
      });
      setActivationData(result);
      setTopic(finalTopic);
      setReplanCount(0);
      setPhase('activation');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setError(null);
    try {
      await api('/api/ei/event', {
        studentId,
        eventType: 'FirstActionStarted',
        topicId: topic,
        payload: { startedAt: new Date().toISOString() },
      });
      setSessionStart(Date.now());
      setElapsed(0);
      setPhase('session');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleReplan() {
    setError(null);
    try {
      await api('/api/ei/event', {
        studentId,
        eventType: 'Replan',
        topicId: topic,
        payload: { reason: 'student-initiated', replannedAt: new Date().toISOString() },
      });
      setReplanCount((c) => c + 1);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleEndSession() {
    setError(null);
    setLoading(true);
    const endedAt = new Date().toISOString();

    try {
      await api('/api/ei/event', {
        studentId,
        eventType: 'SessionEnd',
        topicId: topic,
        payload: { endedAt },
      });

      const result: VerificationData = await api('/api/ei/command', {
        commandType: 'SessionEnd',
        payload: { topic, endedAt },
      });
      setVerificationData(result);
      setPhase('verification');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyNow() {
    if (!verificationData) return;
    setError(null);
    setLoading(true);

    try {
      await api('/api/ei/event', {
        studentId,
        eventType: 'VerificationCompleted',
        topicId: topic,
        payload: {
          completedAt: new Date().toISOString(),
          result: { questionsAttempted, score: questionsAttempted > 0 ? correct / questionsAttempted : 0 },
        },
      });
      finishSession();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleScheduleVerify() {
    if (!verificationData?.deadlineSpec) return;
    setError(null);
    setLoading(true);

    try {
      const dueAt = new Date(Date.now() + verificationData.deadlineSpec.dueInHours * 60 * 60 * 1000).toISOString();
      await api('/api/ei/event', {
        studentId,
        eventType: 'RetrievalScheduled',
        topicId: topic,
        payload: { dueAt, questionsPlanned: verificationData.deadlineSpec.minQuestions, scheduledAt: new Date().toISOString() },
      });
      finishSession();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip(reason: string) {
    setError(null);
    setLoading(true);

    try {
      await api('/api/ei/event', {
        studentId,
        eventType: 'RetrievalSkipped',
        topicId: topic,
        payload: { reason, skippedAt: new Date().toISOString() },
      });
      finishSession();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function finishSession() {
    setPendingChecks((intentData?.constraints?.closeOpenLoopFirst ? 1 : 0));
    setPhase('done');
  }

  function handleNewSession() {
    setPhase('checkin');
    setIntentData(null);
    setActivationData(null);
    setVerificationData(null);
    setEditMode(false);
    setReplanCount(0);
    setSessionStart(null);
    setElapsed(0);
    setError(null);
    setEnergy(null);
    setSleepBucket(null);
    setPressure(null);
    setBacklogPressure(null);
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ============================================================================
  // Render
  // ============================================================================

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

      {/* ── CHECK-IN ────────────────────────────────────────────────────── */}
      {phase === 'checkin' && (
        <div style={s.card}>
          <h1 style={s.h1}>Check in</h1>
          <p style={s.h2}>Let&apos;s set up your study session</p>

          <div style={s.field}>
            <label style={s.label}>Student ID</label>
            <input style={s.input} value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="your-id" />
          </div>

          <div style={s.field}>
            <label style={s.label}>Pilot Secret (optional for dev)</label>
            <input style={s.input} type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="secret" />
          </div>

          <div style={s.field}>
            <label style={s.label}>What are you studying?</label>
            <input style={s.input} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Physics Ch3 Mechanics" />
          </div>

          <div style={s.field}>
            <label style={s.label}>How&apos;s your energy right now?</label>
            <ChipSelect chips={ENERGY_CHIPS} value={energy} onChange={setEnergy} />
          </div>

          {isFirstOfDay && (
            <>
              <div style={s.field}>
                <label style={s.label}>How did you sleep?</label>
                <ChipSelect chips={SLEEP_CHIPS} value={sleepBucket} onChange={setSleepBucket} />
              </div>
              <div style={s.field}>
                <label style={s.label}>How&apos;s your study backlog?</label>
                <ChipSelect chips={BACKLOG_CHIPS} value={backlogPressure} onChange={setBacklogPressure} />
              </div>
            </>
          )}

          <button
            type="button"
            style={{ ...s.muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, textDecoration: 'underline' }}
            onClick={() => setShowMoreContext(!showMoreContext)}
          >
            {showMoreContext ? 'Hide context' : '+ More context'}
          </button>

          {showMoreContext && (
            <div style={s.field}>
              <label style={s.label}>How stressed are you feeling?</label>
              <ChipSelect chips={PRESSURE_CHIPS} value={pressure} onChange={setPressure} />
            </div>
          )}

          <button
            style={{ ...s.btn('primary'), width: '100%', marginTop: 8 }}
            onClick={handleCheckin}
            disabled={loading}
          >
            {loading ? 'Processing…' : 'Start Session'}
          </button>
        </div>
      )}

      {/* ── INTENT CARD ─────────────────────────────────────────────────── */}
      {phase === 'intent' && intentData && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ ...s.h1, marginBottom: 0 }}>Your Plan</h1>
            <ModeBadge mode={intentData.mode} />
          </div>

          <div style={{ ...s.field, background: '#0f1117', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{intentData.topic}</div>
            <div style={s.muted}>
              {intentData.scope.timeboxMin} min · {intentData.scope.questionCount} questions · {intentData.scope.difficultyTier}
            </div>
            <div style={{ ...s.muted, marginTop: 4 }}>
              Verification: {intentData.verificationPlan.minQuestions} questions min
              {intentData.verificationPlan.preferVerifyNow ? ' (verify now preferred)' : ''}
            </div>
          </div>

          {intentData.constraints?.closeOpenLoopFirst && (
            <div style={{ background: '#422006', border: '1px solid #92400e', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              Deal: clear 1 pending check first, then go big
            </div>
          )}

          {!editMode ? (
            <>
              <div style={s.field}>
                <label style={s.label}>Task Type</label>
                <ChipSelect
                  chips={TASK_TYPE_CHIPS}
                  value={editTaskType}
                  onChange={setEditTaskType}
                />
              </div>
              <div style={s.row}>
                <button style={s.btn('primary')} onClick={() => handleIntentResponse('accepted')} disabled={loading}>
                  {loading ? 'Processing…' : 'Accept'}
                </button>
                <button style={s.btn('secondary')} onClick={() => setEditMode(true)} disabled={loading}>
                  Edit
                </button>
                <button style={s.btn('danger')} onClick={() => handleIntentResponse('rejected')} disabled={loading}>
                  Reject
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={s.field}>
                <label style={s.label}>Edit Topic</label>
                <input style={s.input} value={editTopic} onChange={(e) => setEditTopic(e.target.value)} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Task Type</label>
                <ChipSelect chips={TASK_TYPE_CHIPS} value={editTaskType} onChange={setEditTaskType} />
              </div>
              <div style={s.row}>
                <button style={s.btn('primary')} onClick={() => { setEditMode(false); handleIntentResponse('edited'); }} disabled={loading}>
                  {loading ? 'Processing…' : 'Confirm Edit'}
                </button>
                <button style={s.btn('secondary')} onClick={() => setEditMode(false)} disabled={loading}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ACTIVATION CARD ─────────────────────────────────────────────── */}
      {phase === 'activation' && activationData && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ ...s.h1, marginBottom: 0 }}>Get Started</h1>
            <ModeBadge mode={activationData.mode} />
          </div>

          <div style={{ ...s.field, background: '#0f1117', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {activationData.firstAction.description ?? `${activationData.firstAction.type} action`}
            </div>
            {activationData.firstAction.timeboxMin && (
              <div style={s.muted}>Timebox: {activationData.firstAction.timeboxMin} min</div>
            )}
            {activationData.firstAction.timeboxSec && (
              <div style={s.muted}>Timebox: {activationData.firstAction.timeboxSec} sec</div>
            )}
          </div>

          {activationData.focusContract?.noSwitchingUntil && (
            <div style={{ ...s.muted, marginBottom: 12 }}>
              Stay on topic for the first {activationData.focusContract.noSwitchingUntil} min
            </div>
          )}

          <div style={s.row}>
            <button style={s.btn('primary')} onClick={handleStart} disabled={loading}>
              Start
            </button>
            <button
              style={s.btn('secondary')}
              onClick={handleReplan}
              disabled={loading || (activationData.replanCap != null && replanCount >= activationData.replanCap)}
            >
              Replan ({replanCount}{activationData.replanCap != null ? `/${activationData.replanCap}` : ''})
            </button>
          </div>
        </div>
      )}

      {/* ── SESSION TIMER ───────────────────────────────────────────────── */}
      {phase === 'session' && (
        <div style={s.card}>
          <h1 style={{ ...s.h1, textAlign: 'center' }}>Studying: {topic}</h1>
          <div style={s.timer}>{formatTime(elapsed)}</div>
          <button
            style={{ ...s.btn('danger'), width: '100%' }}
            onClick={handleEndSession}
            disabled={loading}
          >
            {loading ? 'Processing…' : 'End Session'}
          </button>
        </div>
      )}

      {/* ── VERIFICATION CARD ───────────────────────────────────────────── */}
      {phase === 'verification' && verificationData && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ ...s.h1, marginBottom: 0 }}>Quick Check</h1>
            <ModeBadge mode={verificationData.mode} />
          </div>

          {verificationData.verificationDecision === 'VerifyNow' && (
            <>
              <p style={s.muted}>
                Answer {verificationData.verificationSpec?.minQuestions ?? 1} question{(verificationData.verificationSpec?.minQuestions ?? 1) > 1 ? 's' : ''} to lock in this session.
              </p>
              <div style={s.field}>
                <label style={s.label}>Questions attempted</label>
                <input
                  style={s.input} type="number" min={0}
                  value={questionsAttempted}
                  onChange={(e) => setQuestionsAttempted(Number(e.target.value))}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Correct</label>
                <input
                  style={s.input} type="number" min={0}
                  value={correct}
                  onChange={(e) => setCorrect(Number(e.target.value))}
                />
              </div>
              <button style={{ ...s.btn('primary'), width: '100%' }} onClick={handleVerifyNow} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Verification'}
              </button>
            </>
          )}

          {verificationData.verificationDecision === 'ScheduleVerify' && verificationData.deadlineSpec && (
            <>
              <p style={s.muted}>
                Schedule your verification for later — {verificationData.deadlineSpec.dueInHours}h from now
                ({verificationData.deadlineSpec.minQuestions} questions min).
              </p>
              <button style={{ ...s.btn('primary'), width: '100%' }} onClick={handleScheduleVerify} disabled={loading}>
                {loading ? 'Scheduling…' : `Schedule (${verificationData.deadlineSpec.dueInHours}h)`}
              </button>
            </>
          )}

          {verificationData.verificationDecision === 'Skip' && (
            <>
              <p style={s.muted}>You can skip verification this time. Pick a reason:</p>
              <div style={{ ...s.chipRow, flexDirection: 'column' }}>
                {SKIP_REASONS.map((r) => (
                  <button
                    key={r.value}
                    style={{ ...s.btn('secondary'), width: '100%', textAlign: 'center' as const }}
                    onClick={() => handleSkip(r.value)}
                    disabled={loading}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Fallback VerifyNow form for ScheduleVerify/Skip decisions */}
          {verificationData.verificationDecision !== 'VerifyNow' && (
            <div style={{ marginTop: 16, borderTop: '1px solid #2a2b35', paddingTop: 12 }}>
              <p style={{ ...s.muted, fontSize: 12 }}>Or verify now instead:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...s.input, flex: 1 }} type="number" min={0} placeholder="Questions" value={questionsAttempted} onChange={(e) => setQuestionsAttempted(Number(e.target.value))} />
                <input style={{ ...s.input, flex: 1 }} type="number" min={0} placeholder="Correct" value={correct} onChange={(e) => setCorrect(Number(e.target.value))} />
              </div>
              <button style={{ ...s.btn('secondary'), width: '100%', marginTop: 8 }} onClick={handleVerifyNow} disabled={loading}>
                Verify Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DONE ────────────────────────────────────────────────────────── */}
      {phase === 'done' && (
        <div style={s.card}>
          <h1 style={{ ...s.h1, textAlign: 'center' }}>Session Complete</h1>
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>&#10003;</div>
            <p style={s.muted}>Mode today: <ModeBadge mode={intentData?.mode ?? 'Neutral'} /></p>
            <p style={s.muted}>Topic: {topic}</p>
            {elapsed > 0 && <p style={s.muted}>Duration: {formatTime(elapsed)}</p>}
          </div>
          <button style={{ ...s.btn('primary'), width: '100%' }} onClick={handleNewSession}>
            Start New Session
          </button>
        </div>
      )}

      {/* ── Loading overlay ─────────────────────────────────────────────── */}
      {loading && phase !== 'checkin' && phase !== 'verification' && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spinner />
        </div>
      )}
    </div>
  );
}
