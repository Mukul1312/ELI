'use client';

import { useState, useEffect, useCallback } from 'react';

interface TreeNode {
  id: string;
  name: string;
  type: 'exam' | 'subject' | 'unit' | 'chapter' | 'topic';
  childCount: number;
}

interface DrillLevel {
  id: string;
  name: string;
  type: string;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.3)',
  zIndex: 100,
};

const sheetStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  maxHeight: '70vh',
  background: 'var(--color-bg)',
  borderRadius: '16px 16px 0 0',
  boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
  zIndex: 101,
  display: 'flex',
  flexDirection: 'column',
  animation: 'sheetSlideUp 200ms ease-out',
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const backBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-accent)',
  fontSize: 14,
  fontWeight: 500,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 500,
  color: 'var(--color-text-primary)',
};

const filterInputStyle: React.CSSProperties = {
  margin: '8px 16px',
  padding: '8px 12px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--color-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
  width: 'calc(100% - 32px)',
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 0,
  margin: 0,
  listStyle: 'none',
};

const itemStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 15,
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--color-border)',
};

const chevronStyle: React.CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: 14,
};

const leafBulletStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--color-accent)',
  marginRight: 10,
  flexShrink: 0,
};

const errorStyle: React.CSSProperties = {
  padding: '24px 16px',
  textAlign: 'center',
  fontSize: 14,
  color: 'var(--color-text-tertiary)',
};

// ── Component ───────────────────────────────────────────────────────────────

export function TopicBrowseSheet({
  open,
  onClose,
  onSelect,
  instituteId,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (topicId: string, topicName: string) => void;
  instituteId: string | null;
}) {
  const [path, setPath] = useState<DrillLevel[]>([]);
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchLevel = useCallback(
    async (drillPath: DrillLevel[]) => {
      setLoading(true);
      setError(false);
      setFilter('');
      try {
        const params = new URLSearchParams();
        if (instituteId) params.set('instituteId', instituteId);
        for (const level of drillPath) {
          if (level.type === 'exam') params.set('examId', level.id);
          else if (level.type === 'subject') params.set('subjectId', level.id);
          else if (level.type === 'unit') params.set('unitId', level.id);
          else if (level.type === 'chapter') params.set('chapterId', level.id);
        }
        const res = await fetch(`/api/curriculum-catalog/browse?${params.toString()}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { nodes: TreeNode[] };
        setNodes(data.nodes);
      } catch {
        setError(true);
        setNodes([]);
      } finally {
        setLoading(false);
      }
    },
    [instituteId],
  );

  // Fetch on open and on path change
  useEffect(() => {
    if (open) {
      fetchLevel(path);
    }
  }, [open, path, fetchLevel]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPath([]);
      setNodes([]);
      setFilter('');
      setError(false);
    }
  }, [open]);

  const handleDrill = (node: TreeNode) => {
    if (node.type === 'topic') {
      onSelect(node.id, node.name);
      return;
    }
    setPath((prev) => [...prev, { id: node.id, name: node.name, type: node.type }]);
  };

  const handleBack = () => {
    setPath((prev) => prev.slice(0, -1));
  };

  if (!open) return null;

  const currentTitle = path.length > 0 ? path[path.length - 1].name : 'Pick your topic';
  const filterPlaceholder =
    path.length > 0 ? `Search in ${path[path.length - 1].name}` : 'Search...';

  const filtered = filter.trim()
    ? nodes.filter((n) => n.name.toLowerCase().includes(filter.toLowerCase()))
    : nodes;

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={sheetStyle}>
        {/* Header */}
        <div style={headerStyle}>
          {path.length > 0 && (
            <button style={backBtnStyle} onClick={handleBack} type="button">
              {'<'} {path[path.length - 1].name}
            </button>
          )}
          {path.length === 0 && <span style={titleStyle}>{currentTitle}</span>}
        </div>

        {/* Filter */}
        <input
          style={filterInputStyle}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={filterPlaceholder}
        />

        {/* Content */}
        {loading && <div style={errorStyle}>Loading...</div>}
        {error && !loading && (
          <div style={errorStyle}>Couldn't load topics. Try searching instead.</div>
        )}
        {!loading && !error && (
          <ul style={listStyle}>
            {filtered.map((node) => (
              <li
                key={node.id}
                style={itemStyle}
                onClick={() => handleDrill(node)}
                role="option"
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {node.type === 'topic' && <span style={leafBulletStyle} />}
                  {node.name}
                </span>
                {node.type !== 'topic' && <span style={chevronStyle}>{'>'}</span>}
              </li>
            ))}
            {filtered.length === 0 && !loading && (
              <li style={{ ...itemStyle, justifyContent: 'center', color: 'var(--color-text-tertiary)', cursor: 'default' }}>
                No items found
              </li>
            )}
          </ul>
        )}
      </div>
      <style>{`@keyframes sheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  );
}
