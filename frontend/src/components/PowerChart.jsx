import React from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const CHART_BG   = '#14181c';
const GRID_COLOR = '#2a2f36';

/**
 * PowerChart — Multi-series flight telemetry chart.
 *
 * Props:
 *   timeseries — full timeseries object
 *   currentTime — for crosshair sync
 */
export default function PowerChart({ timeseries, currentTime }) {
  const data = _buildChartData(timeseries);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: '#14181c',
        border: '1px solid #2a2f36',
        borderRadius: 6,
        padding: '8px 12px',
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '0.75rem',
      }}>
        <p style={{ color: '#6b7280', marginBottom: 4 }}>t = {Number(label).toFixed(1)}s</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
            {p.name}: {Number(p.value).toFixed(1)} {p.unit}
          </p>
        ))}
      </div>
    );
  };

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="dh-lcd" style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          No chart data available
        </span>
      </div>
    );
  }

  // Downsample for performance (max 800 points)
  const plotData = data.length > 800
    ? data.filter((_, i) => i % Math.ceil(data.length / 800) === 0)
    : data;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Power + Altitude chart */}
      <div style={{ flex: 2, minHeight: 0 }}>
        <div className="dh-lcd label mb-1">Power (W) & Altitude (m)</div>
        <ResponsiveContainer width="100%" height="90%">
          <ComposedChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} strokeOpacity={0.6} />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={v => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`}
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: '"Share Tech Mono"' }}
              stroke={GRID_COLOR}
            />
            <YAxis
              yAxisId="power"
              tick={{ fill: '#c81e1e', fontSize: 10, fontFamily: '"Share Tech Mono"' }}
              stroke={GRID_COLOR}
            />
            <YAxis
              yAxisId="alt"
              orientation="right"
              tick={{ fill: '#f2c30f', fontSize: 10, fontFamily: '"Share Tech Mono"' }}
              stroke={GRID_COLOR}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '0.65rem', fontFamily: '"Share Tech Mono"' }} />
            {currentTime > 0 && (
              <ReferenceLine
                x={currentTime}
                yAxisId="power"
                stroke="rgba(242,195,15,0.6)"
                strokeDasharray="4 2"
              />
            )}
            <Area
              yAxisId="power"
              type="monotone"
              dataKey="power"
              name="Power"
              unit=" W"
              stroke="#c81e1e"
              fill="rgba(200,30,30,0.1)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="alt"
              type="monotone"
              dataKey="alt"
              name="Altitude"
              unit=" m"
              stroke="#f2c30f"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Airspeed + Voltage chart */}
      <div style={{ flex: 1.5, minHeight: 0 }}>
        <div className="dh-lcd label mb-1">Airspeed (m/s) & Voltage (V)</div>
        <ResponsiveContainer width="100%" height="90%">
          <ComposedChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} strokeOpacity={0.6} />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={v => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`}
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: '"Share Tech Mono"' }}
              stroke={GRID_COLOR}
            />
            <YAxis
              yAxisId="spd"
              tick={{ fill: '#2f9e44', fontSize: 10, fontFamily: '"Share Tech Mono"' }}
              stroke={GRID_COLOR}
            />
            <YAxis
              yAxisId="volt"
              orientation="right"
              tick={{ fill: '#6b9ef0', fontSize: 10, fontFamily: '"Share Tech Mono"' }}
              stroke={GRID_COLOR}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '0.65rem', fontFamily: '"Share Tech Mono"' }} />
            {currentTime > 0 && (
              <ReferenceLine
                x={currentTime}
                yAxisId="spd"
                stroke="rgba(242,195,15,0.6)"
                strokeDasharray="4 2"
              />
            )}
            <Line
              yAxisId="spd"
              type="monotone"
              dataKey="airspeed"
              name="Airspeed"
              unit=" m/s"
              stroke="#2f9e44"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="volt"
              type="monotone"
              dataKey="volt"
              name="Voltage"
              unit=" V"
              stroke="#6b9ef0"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            {/* Low voltage cutoff — 4S LiPo: 3.7V/cell × 4 = 14.8V */}
            <ReferenceLine
              yAxisId="volt"
              y={14.8}
              stroke="rgba(200,30,30,0.7)"
              strokeDasharray="6 3"
              label={{ value: 'LVC 14.8V', fill: '#c81e1e', fontSize: 10 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Build unified chart data array from timeseries, merging by time.
 */
function _buildChartData(ts) {
  if (!ts) return [];

  // Use power time axis as primary
  const powerTimes = ts.power?.time_s || ts.bat?.time_s || [];
  if (powerTimes.length === 0) return [];

  const powers   = ts.power?.watts   || [];
  const volts    = ts.bat?.volt      || [];
  const batTimes = ts.bat?.time_s    || [];
  const barAlts  = ts.baro?.alt      || [];
  const barTimes = ts.baro?.time_s   || [];
  const arspSp   = ts.arsp?.airspeed || [];
  const arspT    = ts.arsp?.time_s   || [];

  return powerTimes.map((t, i) => ({
    t,
    power:    powers[i] ?? null,
    volt:     _interp(batTimes, volts, t),
    alt:      _interp(barTimes, barAlts, t),
    airspeed: _interp(arspT, arspSp, t),
  }));
}

function _interp(times, values, t) {
  if (!times || times.length === 0) return null;
  if (t <= times[0]) return values[0];
  if (t >= times[times.length - 1]) return values[values.length - 1];
  let lo = 0, hi = times.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (times[m] <= t) lo = m; else hi = m;
  }
  const frac = (t - times[lo]) / (times[hi] - times[lo]);
  return values[lo] + frac * (values[hi] - values[lo]);
}
