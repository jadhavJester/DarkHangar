import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const GRID_COLOR = 'rgba(214, 201, 176, 0.12)';

const METRICS = [
  { key: 'efficiency_wh_per_km',  label: 'Efficiency (Wh/km)',   color: '#3a7d4a', unit: 'Wh/km' },
  { key: 'total_distance_km',     label: 'Distance (km)',          color: '#b8860b', unit: 'km' },
  { key: 'duration_min',          label: 'Duration (min)',          color: '#6b9ef0', unit: 'min' },
  { key: 'energy_wh',             label: 'Energy (Wh)',             color: '#b33030', unit: 'Wh' },
  { key: 'max_airspeed_ms',       label: 'Max Airspeed (m/s)',      color: '#8b5cf6', unit: 'm/s' },
];

/**
 * TrendChart — Multi-flight comparison for one metric.
 *
 * Props:
 *   flights — array of flight summary objects
 *   metricKey — which metric to plot
 */
export function TrendChart({ flights, metricKey }) {
  const metric = METRICS.find(m => m.key === metricKey) || METRICS[0];

  const data = flights
    .slice()
    .reverse() // oldest first
    .map((f, i) => ({
      name: `#${f.id}`,
      date: f.log_date || f.uploaded_at?.slice(0, 10),
      value: f[metricKey],
    }))
    .filter(d => d.value != null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-20">
        <span className="dh-lcd" style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
          Insufficient data
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="dh-lcd label mb-2">{metric.label}</div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} strokeOpacity={1} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(200,185,160,0.4)', fontSize: 9, fontFamily: '"JetBrains Mono"' }}
            stroke={GRID_COLOR}
          />
          <YAxis
            tick={{ fill: metric.color, fontSize: 9, fontFamily: '"JetBrains Mono"' }}
            stroke={GRID_COLOR}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(250, 246, 238, 0.92)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(184, 134, 11, 0.15)',
              borderRadius: 8,
              fontFamily: '"JetBrains Mono"',
              fontSize: '0.7rem',
              color: '#2c2416',
              boxShadow: '0 0 20px rgba(0,0,0,0.06)',
            }}
            formatter={(v) => [`${Number(v).toFixed(2)} ${metric.unit}`, metric.label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={metric.color}
            strokeWidth={2}
            dot={{ r: 3, fill: metric.color }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * TrendPanel — Shows all trend metrics for all flights.
 */
export default function TrendPanel({ flights }) {
  return (
    <div className="flex flex-col gap-4">
      {METRICS.map(m => (
        <TrendChart key={m.key} flights={flights} metricKey={m.key} />
      ))}
    </div>
  );
}
