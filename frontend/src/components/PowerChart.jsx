import React, { useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { AVAILABLE_SERIES } from './ChartSeriesSelector';

const GRID_COLOR = 'rgba(214, 201, 176, 0.12)';
const MODE_EVENT_COLORS = {
  MANUAL: '#8c8cdc', CIRCLE: '#8c8cdc', STABILIZE: '#b48cf0', TRAINING: '#b48cf0',
  ACRO: '#b48cf0', FBWA: '#4ae060', FBWB: '#4ae060', CRUISE: '#50c8b4',
  AUTOTUNE: '#50c8b4', AUTO: '#d4a017', RTL: '#e04040', LOITER: '#64b4f0',
  TAKEOFF: '#64b4f0', GUIDED: '#d4a017', INITIALISING: '#888',
};

export default function PowerChart({ timeseries, currentTime, enabledSeries, events }) {
  const data = useMemo(() => _buildChartData(timeseries, enabledSeries || {}), [timeseries, enabledSeries]);

  const modeEvents = useMemo(() => {
    if (!events) return [];
    return events
      .filter(e => e.event_type === 'MODE')
      .map(e => ({
        t: e.time_us / 1_000_000,
        mode: String(e.value?.mode || e.value?.mode_num || '?'),
      }));
  }, [events]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'rgba(250, 246, 238, 0.92)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(184, 134, 11, 0.15)', borderRadius: 8,
        padding: '8px 12px', fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.75rem', color: '#2c2416',
        boxShadow: '0 0 20px rgba(0,0,0,0.06), 0 0 12px rgba(184,134,11,0.08)',
      }}>
        <p style={{ color: '#8b7d6b', marginBottom: 4 }}>t = {Number(label).toFixed(1)}s</p>
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

  const plotData = data.length > 800
    ? data.filter((_, i) => i % Math.ceil(data.length / 800) === 0)
    : data;

  const hasAny = (key) => plotData.some(d => d[key] != null && d[key] !== 0);
  const series = AVAILABLE_SERIES.filter(s => enabledSeries[s.key] && hasAny(s.key));

  if (!series.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="dh-lcd label">Select series above to plot</span>
      </div>
    );
  }

  const yAxes = [];
  const seriesByAxis = {};
  series.forEach(s => {
    const axis = (s.key === 'alt' || s.key === 'gps_alt') ? 'alt' : 'main';
    if (!seriesByAxis[axis]) seriesByAxis[axis] = [];
    seriesByAxis[axis].push(s);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={plotData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />

            {/* Mode event markers */}
            {modeEvents.filter(ev => ev.t >= 0 && ev.t <= (plotData[plotData.length - 1]?.t || 0)).map((ev, i) => (
              <ReferenceLine key={i} x={ev.t} stroke={MODE_EVENT_COLORS[ev.mode] || 'rgba(184,134,11,0.3)'}
                strokeDasharray="4 2" strokeWidth={1}
                label={{ value: ev.mode, position: 'top', fill: MODE_EVENT_COLORS[ev.mode] || 'var(--accent)', fontSize: 8 }} />
            ))}

            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']}
              tickFormatter={v => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`}
              tick={{ fill: 'rgba(200,185,160,0.4)', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}
              stroke={GRID_COLOR} />

            {seriesByAxis.main?.length > 0 && (
              <YAxis yAxisId="main" tick={{ fill: 'rgba(200,185,160,0.4)', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}
                stroke={GRID_COLOR} />
            )}

            {seriesByAxis.alt?.length > 0 && (
              <YAxis yAxisId="alt" orientation="right"
                tick={{ fill: '#b8860b', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}
                stroke={GRID_COLOR} />
            )}

            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '0.55rem', fontFamily: '"JetBrains Mono", monospace' }} />

            {currentTime > 0 && (
              <ReferenceLine x={currentTime} stroke="rgba(184,134,11,0.4)" strokeDasharray="4 2" />
            )}

            {series.map(s => (
              s.key === 'power'
                ? <Area key={s.key} yAxisId={s.key === 'alt' || s.key === 'gps_alt' ? 'alt' : 'main'}
                    type="monotone" dataKey={s.key} name={s.label} unit={` ${s.unit}`}
                    stroke={s.color} fill={`${s.color}18`} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                : <Line key={s.key} yAxisId={s.key === 'alt' || s.key === 'gps_alt' ? 'alt' : 'main'}
                    type="monotone" dataKey={s.key} name={s.label} unit={` ${s.unit}`}
                    stroke={s.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function _buildChartData(ts, enabled) {
  if (!ts) return [];
  const hasBaro = ts.baro?.alt?.length > 0;
  const hasGps = ts.gps?.lat?.length > 0;
  const hasBat = ts.bat?.volt?.length > 0;
  const hasArsp = ts.arsp?.airspeed?.length > 0;
  const hasAtt = ts.att?.roll?.length > 0;
  const hasCtun = ts.ctun?.thr_out?.length > 0;
  const hasWind = ts.wind?.speed?.length > 0;

  const primaryTimes = ts.power?.time_s || ts.bat?.time_s || ts.gps?.time_s || ts.baro?.time_s || [];
  if (primaryTimes.length === 0) return [];

  // Normalize altitude to AGL
  const baroAlt0 = ts.baro?.alt?.[0];
  const gpsAlt0 = ts.gps?.alt?.[0];
  const groundAlt = baroAlt0 ?? gpsAlt0 ?? 0;
  const _agl = (v) => v != null ? Math.max(0, v - groundAlt) : null;

  // Compute climb rate from baro alt (smoothed)
  const baro = ts.baro;
  let climbRates = null;
  if (baro?.alt?.length > 5) {
    const times = baro.time_s;
    const alts = baro.alt;
    climbRates = [];
    for (let i = 2; i < times.length - 2; i++) {
      const dt = times[i + 2] - times[i - 2];
      if (dt > 0) climbRates.push((alts[i + 2] - alts[i - 2]) / dt);
      else climbRates.push(0);
    }
  }

  return primaryTimes.map((t, i) => {
    const r = { t };
    if (enabled.power && ts.power?.watts) r.power = ts.power.watts[i] ?? null;
    if (enabled.airspeed && hasArsp) {
      r.airspeed = _interp(ts.arsp.time_s, ts.arsp.airspeed, t);
    }
    if (enabled.alt) r.alt = _agl(_interp(ts.baro?.time_s, ts.baro?.alt, t) ?? _interp(ts.gps?.time_s, ts.gps?.alt, t));
    if (enabled.volt && hasBat) r.volt = _interp(ts.bat.time_s, ts.bat.volt, t);
    if (enabled.gps_spd && hasGps) r.gps_spd = _interp(ts.gps.time_s, ts.gps.spd, t);
    if (enabled.throttle && hasCtun) r.throttle = _interp(ts.ctun.time_s, ts.ctun.thr_out, t);
    if (enabled.roll && hasAtt) r.roll = _interp(ts.att.time_s, ts.att.roll, t);
    if (enabled.pitch && hasAtt) r.pitch = _interp(ts.att.time_s, ts.att.pitch, t);
    if (enabled.current && hasBat) r.current = _interp(ts.bat.time_s, ts.bat.curr, t);
    if (enabled.wind_spd && hasWind) r.wind_spd = _interp(ts.wind.time_s, ts.wind.speed, t);
    if (enabled.gps_alt && hasGps) r.gps_alt = _agl(_interp(ts.gps.time_s, ts.gps.alt, t));
    if (enabled.climb_rate && climbRates && i >= 2 && i < climbRates.length + 2) {
      r.climb_rate = climbRates[i - 2];
    }
    return r;
  });
}

function _interp(times, values, t) {
  if (!times || !times.length) return null;
  if (t <= times[0]) return values[0];
  if (t >= times[times.length - 1]) return values[values.length - 1];
  let lo = 0, hi = times.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (times[m] <= t) lo = m; else hi = m; }
  const frac = (t - times[lo]) / (times[hi] - times[lo]);
  return values[lo] + frac * (values[hi] - values[lo]);
}
