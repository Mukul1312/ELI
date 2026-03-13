'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SduiTopicInput } from '@/ei/study-session-orchestration/domain/types/components';
import { TopicBrowseSheet } from './topic-browse-sheet';

type ComponentState = 'idle' | 'typing' | 'searching' | 'suggestions' | 'selected' | 'browse';

interface SearchResult {
  topicId: string;
  topicName: string;
  examName: string;
  matchType: string;
  isInstituteCurriculum: boolean;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const inputWrapStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  gap: 8,
  alignItems: 'center',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  paddingTop: 10,
  paddingBottom: 10,
  paddingLeft: 12,
  paddingRight: 12,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text-primary)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectedInputStyle: React.CSSProperties = {
  ...inputStyle,
  color: 'var(--color-accent)',
  paddingRight: 36,
};

const clearBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: 80,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  color: 'var(--color-text-tertiary)',
  padding: 4,
  lineHeight: 1,
};

const clearBtnNoBrowseStyle: React.CSSProperties = {
  ...clearBtnStyle,
  right: 12,
};

const browseBtnStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const suggestionsStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: 10,
  background: 'var(--color-surface)',
  borderRadius: 16,
  boxShadow: 'var(--shadow-card)',
  border: '1px solid var(--color-border)',
  overflow: 'hidden',
  marginTop: 4,
};

const suggestionItemStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 15,
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--color-border)',
};

const examBadgeStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-tertiary)',
};

const recentLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 400,
  color: 'var(--color-text-tertiary)',
  marginBottom: 6,
};

const chipStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 20,
  padding: '6px 14px',
  fontSize: 14,
  fontWeight: 400,
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  transition: 'background 150ms ease, border-color 150ms ease',
};

const spinnerStyle: React.CSSProperties = {
  position: 'absolute',
  right: 80,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 16,
  height: 16,
  border: '2px solid var(--color-border)',
  borderTopColor: 'var(--color-accent)',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
};

// ── Component ───────────────────────────────────────────────────────────────

export function SduiTopicInput({
  node,
  onChange,
}: {
  node: SduiTopicInput;
  value?: string | number;
  onChange?: (id: string, v: string | number) => void;
  onAction?: (actionId: string) => void;
  formValues?: Record<string, string | number>;
}) {
  const { inputId, label, placeholder, required, recentTopics, browseEnabled, instituteId } =
    node.props;

  const [state, setState] = useState<ComponentState>('idle');
  const [text, setText] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [browseOpen, setBrowseOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const preSearchText = useRef('');

  // Dismiss suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        if (state === 'suggestions') setState(text.length > 0 ? 'typing' : 'idle');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [state, text]);

  // Debounced search
  const doSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setState('searching');
      try {
        const res = await fetch(
          `/api/curriculum-catalog/search?q=${encodeURIComponent(q)}&limit=5`,
        );
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { results: SearchResult[] };
        setSuggestions(data.results);
        setState(data.results.length > 0 ? 'suggestions' : 'typing');
      } catch {
        // Silent failure — student can proceed with free text
        setSuggestions([]);
        setState('typing');
      }
    },
    [],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    onChange?.(inputId, val);
    // Clear catalog selection when student edits text
    onChange?.('topicId', '');
    onChange?.('topicName', '');

    if (val.length === 0) {
      setState('idle');
      setSuggestions([]);
      return;
    }
    setState('typing');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val), 200);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (topicId: string, topicName: string) => {
    setText(topicName);
    setSelectedName(topicName);
    onChange?.(inputId, topicName);
    onChange?.('topicId', topicId);
    onChange?.('topicName', topicName);
    setSuggestions([]);
    setState('selected');
  };

  const handleClear = () => {
    setText('');
    setSelectedName('');
    onChange?.(inputId, '');
    onChange?.('topicId', '');
    onChange?.('topicName', '');
    setSuggestions([]);
    setState('idle');
  };

  const handleChipTap = (id: string, name: string) => {
    handleSelect(id, name);
  };

  const handleBrowseOpen = () => {
    preSearchText.current = text;
    setBrowseOpen(true);
    setState('browse');
  };

  const handleBrowseClose = () => {
    setBrowseOpen(false);
    // Restore typed text if no selection was made
    if (state === 'browse') {
      if (preSearchText.current.length > 0) {
        setText(preSearchText.current);
        setState('typing');
        // Re-trigger search for restored text
        if (preSearchText.current.trim().length >= 2) {
          doSearch(preSearchText.current);
        }
      } else {
        setState('idle');
      }
    }
  };

  const handleBrowseSelect = (topicId: string, topicName: string) => {
    setBrowseOpen(false);
    handleSelect(topicId, topicName);
  };

  const isSelected = state === 'selected';
  const showSuggestions = state === 'suggestions' && suggestions.length > 0;
  const showRecent = (state === 'idle' || state === 'suggestions') && recentTopics.length > 0;
  const showSpinner = state === 'searching';

  return (
    <div style={{ marginBottom: 16 }} ref={wrapRef}>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          marginBottom: 6,
        }}
      >
        {label}
        {required && ' *'}
      </label>

      {/* Input row */}
      <div style={inputWrapStyle}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            style={isSelected ? selectedInputStyle : inputStyle}
            value={isSelected ? selectedName : text}
            onChange={handleInputChange}
            placeholder={placeholder}
            readOnly={isSelected}
            onClick={() => {
              if (isSelected) return; // no-op when selected
            }}
          />
          {showSpinner && (
            <div style={browseEnabled ? spinnerStyle : { ...spinnerStyle, right: 12 }} />
          )}
          {isSelected && (
            <button
              style={browseEnabled ? clearBtnStyle : clearBtnNoBrowseStyle}
              onClick={handleClear}
              type="button"
              aria-label="Clear topic"
            >
              x
            </button>
          )}
        </div>
        {browseEnabled && !isSelected && (
          <button
            style={browseBtnStyle}
            onClick={handleBrowseOpen}
            type="button"
            disabled={state === 'searching'}
          >
            Browse
          </button>
        )}
      </div>

      {/* Suggestions dropdown (floats over content) */}
      {showSuggestions && (
        <div style={{ position: 'relative' }}>
          <div style={suggestionsStyle}>
            {suggestions.map((s, i) => (
              <div
                key={s.topicId}
                style={{
                  ...suggestionItemStyle,
                  ...(i === suggestions.length - 1 ? { borderBottom: 'none' } : {}),
                }}
                onClick={() => handleSelect(s.topicId, s.topicName)}
                role="option"
              >
                <span>{s.topicName}</span>
                <span style={examBadgeStyle}>({s.examName})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent topic chips */}
      {showRecent && (
        <div style={{ marginTop: 10 }}>
          <div style={recentLabelStyle}>Recent:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 72, overflow: 'hidden' }}>
            {recentTopics.slice(0, 5).map((t) => (
              <button
                key={t.id}
                style={chipStyle}
                onClick={() => handleChipTap(t.id, t.name)}
                type="button"
              >
                {t.name.length > 20 ? t.name.slice(0, 18) + '\u2026' : t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Browse bottom sheet */}
      {browseEnabled && (
        <TopicBrowseSheet
          open={browseOpen}
          onClose={handleBrowseClose}
          onSelect={handleBrowseSelect}
          instituteId={instituteId}
        />
      )}

      {/* Spinner keyframe (injected once) */}
      {showSpinner && (
        <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
      )}
    </div>
  );
}
