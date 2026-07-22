import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';

const ARDUPLANE_MODES = {
  0: 'MANUAL', 1: 'CIRCLE', 2: 'STABILIZE', 3: 'TRAINING', 4: 'ACRO',
  5: 'FBWA', 6: 'FBWB', 7: 'CRUISE', 8: 'AUTOTUNE', 10: 'AUTO',
  11: 'RTL', 12: 'LOITER', 13: 'TAKEOFF', 15: 'GUIDED', 16: 'INITIALISING',
  17: 'QSTABILIZE', 18: 'QHOVER', 19: 'QLOITER', 20: 'QLAND', 21: 'QRTL',
};

export default function TimelineSlider({ duration = 0, currentTime = 0, onChange, events = [] }) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  const togglePlay = useCallback(() => {
    if (!duration) return;
    if (playing) {
      clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      if (currentTime >= duration) onChange?.(0);
      setPlaying(true);
    }
  }, [playing, duration, currentTime, onChange]);

  useEffect(() => {
    if (!playing || !duration) return;
    const playbackSec = 60;
    const advance = duration / (playbackSec * 60);
    intervalRef.current = setInterval(() => {
      onChange?.(prev => {
        const next = prev + advance;
        if (next >= duration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 1000 / 60);
    return () => clearInterval(intervalRef.current);
  }, [playing, duration, onChange]);

  useEffect(() => {
    if (currentTime >= duration && playing) {
      setPlaying(false);
    }
  }, [currentTime, duration, playing]);

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
        return { time_s: e.time_us / 1_000_000, label: friendlyMode };
      });
  }, [events]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {modeEvents.length > 0 && duration > 0 && (
        <div className="relative h-4" style={{ marginBottom: 2 }}>
          {modeEvents.map((ev, i) => {
            const pctStart = (ev.time_s / duration) * 100;
            const pctEnd = i + 1 < modeEvents.length
              ? (modeEvents[i + 1].time_s / duration) * 100 : 100;
            const color = MODE_COLORS[ev.label] || 'rgba(212,160,23,0.06)';
            return (
              <div key={i} className="absolute top-0 h-4 flex items-center justify-center overflow-hidden mode-chip"
                style={{
                  left: `${pctStart}%`, width: `${pctEnd - pctStart}%`,
                  background: color,
                  borderRight: '1px solid rgba(255,255,255,0.04)',
                }}>
                <span style={{
                  color: 'rgba(240,232,216,0.5)',
                }}>{ev.label}</span>
              </div>
            );
          })}
        </div>
      )}

      <input type="range" className="dh-slider" min={0} max={duration}
        step={0.5} value={currentTime}
        onChange={e => { if (playing) setPlaying(false); onChange?.(parseFloat(e.target.value)); }} />

      <div className="flex items-center gap-2 px-1">
        <button className={`btn-play ${playing ? 'playing' : ''}`} onClick={togglePlay}
          title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <span className="dh-lcd live-glow" style={{ fontSize: '0.8rem', minWidth: '3.2em', color: 'var(--accent)' }}>
          {formatTime(currentTime)}
        </span>
        <span className="dh-lcd label">/ {formatTime(duration)}</span>
      </div>
    </div>
  );
}

const MODE_COLORS = {
  MANUAL:    'rgba(140, 140, 220, 0.08)',
  FBWA:      'rgba(74, 224, 96, 0.08)',
  FBWB:      'rgba(74, 224, 96, 0.06)',
  AUTO:      'rgba(212, 160, 23, 0.08)',
  RTL:       'rgba(224, 64, 64, 0.08)',
  LOITER:    'rgba(100, 180, 240, 0.08)',
  STABILIZE: 'rgba(180, 140, 240, 0.08)',
  CRUISE:    'rgba(80, 200, 180, 0.08)',
};
