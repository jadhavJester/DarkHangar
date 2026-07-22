import React, { useState, useMemo } from 'react';

export default function MessageLog({ messages }) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!messages || !messages.length) return [];
    if (!filter) return messages;
    const q = filter.toLowerCase();
    return messages.filter(m => m.message && m.message.toLowerCase().includes(q));
  }, [messages, filter]);

  if (!messages || !messages.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="dh-lcd label">No messages</span>
      </div>
    );
  }

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full gap-1">
      <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
        placeholder="Filter messages..."
        style={{
          background: 'rgba(184,134,11,0.04)', border: '1px solid rgba(184,134,11,0.10)',
          borderRadius: 6, padding: '2px 8px', fontSize: '0.5rem',
          fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', outline: 'none',
          width: '100%',
        }} />
      <div className="flex-1 overflow-y-auto space-y-0.5" style={{ minHeight: 0 }}>
        {filtered.map((m, i) => (
          <div key={i} className="flex gap-2 items-start px-1 py-0.5 rounded"
            style={{
              background: m.level === 'error' ? 'rgba(179,48,48,0.06)' : 'transparent',
              borderBottom: '1px solid rgba(184,134,11,0.04)',
            }}>
            <span className="dh-lcd" style={{ fontSize: '0.45rem', color: 'var(--text-dim)', minWidth: '3em', flexShrink: 0 }}>
              {fmt(m.time_s)}</span>
            {m.level === 'error' && (
              <span className="dh-lcd label" style={{ fontSize: '0.4rem', color: 'var(--needle-red)' }}>ERR</span>
            )}
            <span className="dh-lcd" style={{ fontSize: '0.5rem', color: m.level === 'error' ? 'var(--needle-red)' : 'var(--text-primary)' }}>
              {m.message ?? ''}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <span className="dh-lcd label">No matches</span>
        )}
      </div>
    </div>
  );
}
