import React, { useMemo } from 'react';

/**
 * TimelineSlider — scrub bar that syncs gauges and map to a point in time.
 *
 * Props:
 *   duration   — total flight duration in seconds
 *   currentTime — current scrub position in seconds
 *   onChange   — callback(seconds)
 *   events     — [{time_us, event_type, value}] for mode band annotations
 */
const ARDUPLANE_MODES = {
  0: 'MANUAL',
  1: 'CIRCLE',
  2: 'STABILIZE',
  3: 'TRAINING',
  4: 'ACRO',
  5: 'FBWA',
  6: 'FBWB',
  7: 'CRUISE',
  8: 'AUTOTUNE',
  10: 'AUTO',
  11: 'RTL',
  12: 'LOITER',
  13: 'TAKEOFF',
  15: 'GUIDED',
  16: 'INITIALISING',
  17: 'QSTABILIZE',
  18: 'QHOVER',
  19: 'QLOITER',
  20: 'QLAND',
  21: 'QRTL',
};

export default function TimelineSlider({ duration = 0, currentTime = 0, onChange, events = [] }) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const modeEvents = useMemo(() => {
    return events
      .filter(e => e.event_type === 'MODE')
      .map(e => {
        let rawMode = e.value?.mode;
        if (typeof rawMode === 'string' && /^\d+$/.test(rawMode)) {
          rawMode = parseInt(rawMode, 10);
        }
        
        let friendlyMode = e.value?.mode;
        if (ARDUPLANE_MODES[rawMode] !== undefined) {
          friendlyMode = ARDUPLANE_MODES[rawMode];
        } else if (e.value?.mode_num !== undefined && ARDUPLANE_MODES[e.value.mode_num] !== undefined) {
          friendlyMode = ARDUPLANE_MODES[e.value.mode_num];
        }
        
        if (typeof friendlyMode === 'string') {
          friendlyMode = friendlyMode.toUpperCase();
        } else {
          friendlyMode = 'UNKNOWN';
        }

        return {
          time_s: e.time_us / 1_000_000,
          label: friendlyMode,
        };
      });
  }, [events]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Mode band annotations */}
      {modeEvents.length > 0 && duration > 0 && (
        <div className="relative h-4" style={{ marginBottom: 2 }}>
          {modeEvents.map((ev, i) => {
            const pctStart = (ev.time_s / duration) * 100;
            const pctEnd = i + 1 < modeEvents.length
              ? (modeEvents[i + 1].time_s / duration) * 100
              : 100;
            return (
              <div
                key={i}
                className="absolute top-0 h-4 flex items-center justify-center overflow-hidden"
                style={{
                  left: `${pctStart}%`,
                  width: `${pctEnd - pctStart}%`,
                  background: MODE_COLORS[ev.label] || 'rgba(242,195,15,0.1)',
                  borderRight: '1px solid rgba(0,0,0,0.5)',
                }}
              >
                <span style={{
                  fontSize: '0.5rem',
                  letterSpacing: '0.05em',
                  fontFamily: 'Orbitron, sans-serif',
                  color: 'rgba(255,255,255,0.6)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}>
                  {ev.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Slider */}
      <input
        type="range"
        className="dh-slider"
        min={0}
        max={duration}
        step={0.5}
        value={currentTime}
        onChange={e => onChange && onChange(parseFloat(e.target.value))}
      />

      {/* Time display */}
      <div className="flex justify-between items-center px-1">
        <span className="dh-lcd" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          {formatTime(0)}
        </span>
        <span className="dh-lcd" style={{ fontSize: '0.8rem' }}>
          ▶ {formatTime(currentTime)}
        </span>
        <span className="dh-lcd" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

const MODE_COLORS = {
  MANUAL:     'rgba(100, 100, 180, 0.2)',
  FBWA:       'rgba(47, 158, 68, 0.2)',
  FBWB:       'rgba(47, 130, 68, 0.2)',
  AUTO:       'rgba(242, 195, 15, 0.15)',
  RTL:        'rgba(200, 30, 30, 0.2)',
  LOITER:     'rgba(80, 160, 220, 0.2)',
  STABILIZE:  'rgba(140, 100, 200, 0.2)',
  CRUISE:     'rgba(60, 200, 180, 0.2)',
};
