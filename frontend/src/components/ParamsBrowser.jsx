import React, { useState, useMemo } from 'react';

export default function ParamsBrowser({ params }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState(1);

  const entries = useMemo(() => {
    if (!params) return [];
    let e = Object.entries(params);
    if (search) {
      const q = search.toLowerCase();
      e = e.filter(([k]) => k.toLowerCase().includes(q));
    }
    e.sort((a, b) => {
      let cmp = sortBy === 'name' ? a[0].localeCompare(b[0]) : (a[1] || 0) - (b[1] || 0);
      return cmp * sortDir;
    });
    return e;
  }, [params, search, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => -d);
    else { setSortBy(field); setSortDir(1); }
  };

  if (!params || Object.keys(params).length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="dh-lcd label">No parameters in this log</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-1">
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search parameters..."
        style={{
          background: 'rgba(184,134,11,0.04)', border: '1px solid rgba(184,134,11,0.10)',
          borderRadius: 6, padding: '2px 8px', fontSize: '0.5rem',
          fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', outline: 'none',
          width: '100%',
        }} />
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.5rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(184,134,11,0.10)' }}>
              <th className="dh-lcd label" style={{ cursor: 'pointer', textAlign: 'left', padding: '2px 4px' }}
                onClick={() => toggleSort('name')}>
                Name {sortBy === 'name' ? (sortDir > 0 ? '▲' : '▼') : ''}
              </th>
              <th className="dh-lcd label" style={{ cursor: 'pointer', textAlign: 'right', padding: '2px 4px' }}
                onClick={() => toggleSort('value')}>
                Value {sortBy === 'value' ? (sortDir > 0 ? '▲' : '▼') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, value]) => (
              <tr key={name} style={{ borderBottom: '1px solid rgba(184,134,11,0.03)' }}>
                <td className="dh-lcd" style={{ fontSize: '0.5rem', padding: '1px 4px', fontFamily: 'var(--font-mono)' }}>
                  {name}
                </td>
                <td className="dh-lcd" style={{ fontSize: '0.5rem', padding: '1px 4px', textAlign: 'right', color: 'var(--accent)' }}>
                  {value != null ? value : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div className="dh-lcd label text-center py-4">No matches</div>
        )}
      </div>
      <div className="dh-lcd label" style={{ fontSize: '0.4rem', padding: '2px 0' }}>
        {entries.length} / {Object.keys(params).length} parameters
      </div>
    </div>
  );
}
