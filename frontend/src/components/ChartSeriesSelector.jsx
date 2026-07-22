import React from 'react';

const AVAILABLE_SERIES = [
  { key: 'alt',        label: 'Altitude (AGL)',       color: '#b8860b', unit: 'm',   default: true  },
  { key: 'power',      label: 'Power',                 color: '#b33030', unit: 'W',   default: true  },
  { key: 'airspeed',   label: 'Airspeed',              color: '#3a7d4a', unit: 'm/s', default: true  },
  { key: 'volt',       label: 'Voltage',               color: '#6b9ef0', unit: 'V',   default: true  },
  { key: 'gps_spd',    label: 'GPS Speed',             color: '#8b5cf6', unit: 'm/s', default: false },
  { key: 'throttle',   label: 'Throttle',              color: '#e04040', unit: '%',   default: false },
  { key: 'climb_rate', label: 'Climb Rate',            color: '#0891b2', unit: 'm/s', default: false },
  { key: 'roll',       label: 'Roll',                  color: '#d97706', unit: 'deg', default: false },
  { key: 'pitch',      label: 'Pitch',                 color: '#65a30d', unit: 'deg', default: false },
  { key: 'current',    label: 'Current',               color: '#dc2626', unit: 'A',   default: false },
  { key: 'wind_spd',   label: 'Wind Speed',            color: '#a21caf', unit: 'm/s', default: false },
  { key: 'gps_alt',    label: 'GPS Alt (AGL)',         color: '#0d9488', unit: 'm',   default: false },
];

export default function ChartSeriesSelector({ enabled, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1 px-1 py-1">
      {AVAILABLE_SERIES.map(s => (
        <label key={s.key} className="flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer select-none"
          style={{
            background: enabled[s.key] ? `${s.color}18` : 'rgba(184,134,11,0.04)',
            border: `1px solid ${enabled[s.key] ? s.color + '30' : 'rgba(184,134,11,0.08)'}`,
            fontSize: '0.45rem', fontFamily: 'var(--font-ui)', fontWeight: 500,
            transition: 'all 0.15s',
          }}>
          <input type="checkbox" checked={!!enabled[s.key]}
            onChange={() => onToggle(s.key)}
            style={{ accentColor: s.color, width: 10, height: 10, margin: 0 }} />
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: s.color, flexShrink: 0,
          }} />
          {s.label}
        </label>
      ))}
    </div>
  );
}

export { AVAILABLE_SERIES };
