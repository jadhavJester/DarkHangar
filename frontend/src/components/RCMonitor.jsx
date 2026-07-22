import React, { useMemo } from 'react';

const RC_LABELS = { c1: 'AIL', c2: 'ELE', c3: 'THR', c4: 'RUD' };

export default function RCMonitor({ rcin, rcout, currentTime }) {
  const inVals = useMemo(() => _interpAt(rcin, currentTime), [rcin, currentTime]);
  const outVals = useMemo(() => _interpAt(rcout, currentTime), [rcout, currentTime]);

  if (!inVals) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="dh-lcd label">No RC data</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-3">
        <span className="dh-lcd label" style={{ minWidth: 32, fontSize: '0.45rem' }}>RCIN</span>
        {['c1','c2','c3','c4'].map((ch, i) => (
          <div key={ch} className="flex flex-col items-center flex-1 min-w-0">
            <span className="dh-lcd label" style={{ fontSize: '0.4rem' }}>{RC_LABELS[ch]}</span>
            <div className="relative w-full" style={{ height: 28, background: 'rgba(184,134,11,0.04)', borderRadius: 4, border: '1px solid rgba(184,134,11,0.08)' }}>
              <div className="absolute bottom-0 w-full transition-all duration-200"
                style={{
                  height: `${((inVals[i] - 1000) / 1000) * 100}%`,
                  background: 'linear-gradient(to top, rgba(184,134,11,0.25), rgba(184,134,11,0.10))',
                  borderRadius: '0 0 3px 3px',
                }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="dh-lcd" style={{ fontSize: '0.5rem', color: 'var(--accent)' }}>{inVals[i]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="dh-lcd label" style={{ minWidth: 32, fontSize: '0.45rem' }}>RCOU</span>
        {['c1','c2','c3','c4'].map((ch, i) => (
          <div key={ch} className="flex flex-col items-center flex-1 min-w-0">
            <span className="dh-lcd label" style={{ fontSize: '0.4rem' }}>{RC_LABELS[ch]}</span>
            <div className="relative w-full" style={{ height: 28, background: 'rgba(184,134,11,0.04)', borderRadius: 4, border: '1px solid rgba(184,134,11,0.08)' }}>
              <div className="absolute bottom-0 w-full transition-all duration-200"
                style={{
                  height: `${((outVals[i] - 1000) / 1000) * 100}%`,
                  background: 'linear-gradient(to top, rgba(58,125,74,0.25), rgba(58,125,74,0.10))',
                  borderRadius: '0 0 3px 3px',
                }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="dh-lcd" style={{ fontSize: '0.5rem', color: 'var(--healthy-green)' }}>{outVals[i]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function _interpAt(series, t) {
  if (!series) return null;
  const times = series.time_s || [];
  if (times.length === 0) return null;
  const chs = ['c1','c2','c3','c4'];
  if (t <= times[0]) return chs.map(ch => series[ch]?.[0] ?? 1500);
  if (t >= times[times.length - 1]) return chs.map(ch => { const v = series[ch]; return v ? v[v.length - 1] : 1500; });
  let lo = 0, hi = times.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (times[m] <= t) lo = m; else hi = m; }
  const f = (t - times[lo]) / (times[hi] - times[lo]);
  return chs.map(ch => {
    const v = series[ch];
    if (!v || !v[lo] || !v[hi]) return 1500;
    return Math.round(v[lo] + f * (v[hi] - v[lo]));
  });
}
