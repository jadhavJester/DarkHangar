import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const GRID_COLOR = '#2a2f36';

const METRICS = [
  { key: 'efficiency_wh_per_km',  label: 'Efficiency (Wh/km)',   color: '#2f9e44', unit: 'Wh/km' },
  { key: 'total_distance_km',     label: 'Distance (km)',          color: '#f2c30f', unit: 'km' },
  { key: 'duration_min',          label: 'Duration (min)',          color: '#6b9ef0', unit: 'min' },
  { key: 'energy_wh',             label: 'Energy (Wh)',             color: '#c81e1e', unit: 'Wh' },
  { key: 'max_airspeed_ms',       label: 'Max Airspeed (m/s)',      color: '#a78bfa', unit: 'm/s' },
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
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} strokeOpacity={0.6} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 9, fontFamily: '"Share Tech Mono"' }}
            stroke={GRID_COLOR}
          />
          <YAxis
            tick={{ fill: metric.color, fontSize: 9, fontFamily: '"Share Tech Mono"' }}
            stroke={GRID_COLOR}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: '#14181c', border: '1px solid #2a2f36',
              borderRadius: 4, fontFamily: '"Share Tech Mono"', fontSize: '0.7rem',
              color: '#e8ecf0',
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
