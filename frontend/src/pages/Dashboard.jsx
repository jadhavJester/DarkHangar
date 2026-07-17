import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Panel from '../components/Panel';
import ReadoutLCD from '../components/ReadoutLCD';
import AnalogGauge from '../components/AnalogGauge';
import TimelineSlider from '../components/TimelineSlider';
import PowerChart from '../components/PowerChart';
import TrackMap from '../components/TrackMap';
import { useFlight } from '../hooks/useFlight';
import { useTimeline } from '../hooks/useTimeline';

const IS_DEMO_MODE = !window.location.origin.includes('localhost') && 
                     !window.location.origin.includes('127.0.0.1') && 
                     !window.location.origin.includes('8765');

export default function Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { flight, timeseries, track, loading, error } = useFlight(id);

  const duration = useMemo(() => {
    if (!timeseries) return 0;
    const times = timeseries.bat?.time_s || timeseries.gps?.time_s || [];
    return times.length ? times[times.length - 1] - times[0] : 0;
  }, [timeseries]);

  const { currentTime, setCurrentTime, gaugeValues } = useTimeline(timeseries, duration);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onBack={() => navigate('/')} />;
  if (!flight) return null;

  const m = flight;

  return (
    <div className="flex flex-col h-screen overflow-hidden"
         style={{ background: 'var(--bg-primary)', padding: '8px', gap: '8px' }}>

      {/* ── Top bar: title + nav ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-2" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/history')}
            className="dh-lcd label hover:text-dh-accent transition-colors"
            style={{ cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.65rem' }}
          >
            ← History
          </button>
          <div>
            <div className="dh-subtitle" style={{ fontSize: '0.55rem' }}>
              Flight #{m.id} · {m.log_date || m.uploaded_at?.slice(0, 10)}
            </div>
            <h1 className="dh-title text-lg leading-tight">{m.filename}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (IS_DEMO_MODE) {
                alert("PDF report generation requires the local desktop application. Download it from the GitHub releases page to generate reports for your own flights!");
                return;
              }
              const api = window.location.origin.includes('5173') ? 'http://localhost:8000' : '';
              window.open(`${api}/flights/${m.id}/export/pdf`, '_blank');
            }}
            className="dh-panel px-3 py-1.5 dh-subtitle hover:shadow-bat-glow transition-all"
            style={{ fontSize: '0.6rem', cursor: 'pointer', color: 'var(--accent-yellow)', borderColor: 'var(--accent-yellow)' }}
          >
            Download PDF Report
          </button>

          <button
            onClick={() => {
              if (IS_DEMO_MODE) {
                alert("MATLAB export requires the local desktop application. Download it from the GitHub releases page to export your own flight telemetry!");
                return;
              }
              const api = window.location.origin.includes('5173') ? 'http://localhost:8000' : '';
              window.open(`${api}/flights/${m.id}/export/mat`, '_blank');
            }}
            className="dh-panel px-3 py-1.5 dh-subtitle hover:shadow-bat-glow transition-all"
            style={{ fontSize: '0.6rem', cursor: 'pointer', color: '#00f0ff', borderColor: '#00f0ff' }}
          >
            Export MATLAB (.mat)
          </button>

          <button
            onClick={() => navigate('/upload')}
            className="dh-panel px-4 py-1.5 dh-subtitle hover:shadow-bat-glow-strong transition-all"
            style={{ fontSize: '0.6rem', cursor: 'pointer' }}
          >
            + Upload New Log
          </button>
        </div>
      </div>

      {/* ── Gauge row ─────────────────────────────────────────────── */}
      <Panel title="Instrument Panel" className="px-4 py-3" style={{ flexShrink: 0 }}>
        <div className="flex items-center justify-around gap-2 flex-wrap">
          <AnalogGauge
            label="Airspeed"
            unit="m/s"
            value={gaugeValues.airspeed ?? 0}
            min={0} max={40}
            greenZoneEnd={15}
            size={155}
          />
          <AnalogGauge
            label="Altitude"
            unit="m"
            value={gaugeValues.altitude ?? 0}
            min={0} max={500}
            greenZoneEnd={50}
            size={155}
          />
          <AnalogGauge
            label="Voltage"
            unit="V"
            value={gaugeValues.voltage ?? 0}
            min={12} max={17}
            redZoneStart={14.8}
            greenZoneEnd={16.2}
            size={155}
          />
          <AnalogGauge
            label="Current"
            unit="A"
            value={gaugeValues.current ?? 0}
            min={0} max={60}
            redZoneStart={50}
            size={155}
          />
          <AnalogGauge
            label="Power"
            unit="W"
            value={gaugeValues.power ?? 0}
            min={0} max={1000}
            redZoneStart={800}
            size={155}
          />
        </div>
      </Panel>

      {/* ── LCD readouts + stats table ────────────────────────────── */}
      <div className="flex gap-2" style={{ minHeight: 0, flexShrink: 0 }}>
        <Panel title="Live Readouts" className="flex-1 px-4 py-3">
          <div className="grid grid-cols-3 gap-4">
            <ReadoutLCD
              label="Airspeed" unit="m/s" precision={1}
              value={gaugeValues.airspeed}
              state={gaugeValues.airspeed > 35 ? 'warn' : null}
            />
            <ReadoutLCD
              label="Altitude" unit="m" precision={0}
              value={gaugeValues.altitude}
            />
            <ReadoutLCD
              label="Voltage" unit="V" precision={2}
              value={gaugeValues.voltage}
              state={gaugeValues.voltage != null && gaugeValues.voltage < 14.8 ? 'warn' : gaugeValues.voltage > 16.0 ? 'good' : null}
            />
            <ReadoutLCD
              label="Current" unit="A" precision={1}
              value={gaugeValues.current}
              state={gaugeValues.current > 50 ? 'warn' : null}
            />
            <ReadoutLCD
              label="Power" unit="W" precision={0}
              value={gaugeValues.power}
            />
            <ReadoutLCD
              label="Throttle" unit="%" precision={0}
              value={gaugeValues.throttle != null ? gaugeValues.throttle * 100 : null}
            />
          </div>
        </Panel>

        <Panel title="Flight Summary" className="flex-1 px-4 py-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            <StatRow label="Total Distance"   value={m.total_distance_km != null  ? `${m.total_distance_km.toFixed(2)} km`    : '—'} />
            <StatRow label="Duration"         value={m.duration_min != null       ? `${m.duration_min.toFixed(1)} min`         : '—'} />
            <StatRow label="Energy Used"      value={m.energy_wh != null          ? `${m.energy_wh.toFixed(1)} Wh`             : '—'} />
            <StatRow label="Efficiency"       value={m.efficiency_wh_per_km != null ? `${m.efficiency_wh_per_km.toFixed(2)} Wh/km` : '—'} />
            <StatRow label="Avg Airspeed"     value={m.avg_airspeed_ms != null    ? `${m.avg_airspeed_ms.toFixed(1)} m/s`      : '—'} />
            <StatRow label="Max Airspeed"     value={m.max_airspeed_ms != null    ? `${m.max_airspeed_ms.toFixed(1)} m/s`      : '—'} />
            <StatRow label="Max Altitude"     value={m.max_altitude_m != null     ? `${m.max_altitude_m.toFixed(0)} m`         : '—'} />
            <StatRow label="Max Current"      value={m.max_current_a != null      ? `${m.max_current_a.toFixed(1)} A`          : '—'} />
            <StatRow label="Min Voltage"      value={m.min_voltage_v != null      ? `${m.min_voltage_v.toFixed(2)} V`          : '—'}
                     state={m.min_voltage_v != null && m.min_voltage_v < 14.8 ? 'warn' : null} />
            <StatRow label="Climb Rate Max"   value={m.climb_rate_max_ms != null  ? `${m.climb_rate_max_ms.toFixed(1)} m/s`   : '—'} />
            <StatRow label="Descent Rate Max" value={m.descent_rate_max_ms != null ? `${Math.abs(m.descent_rate_max_ms).toFixed(1)} m/s` : '—'} />
            <StatRow label="Glide Ratio"      value={m.glide_ratio != null        ? `${m.glide_ratio.toFixed(1)}:1`            : '—'} />
            <StatRow label="Vibe Health"      value={m.vibe_health || '—'}
                     state={m.vibe_health === 'bad' ? 'warn' : m.vibe_health === 'ok' ? 'good' : null} />
          </div>
        </Panel>
      </div>

      {/* ── Timeline scrub ───────────────────────────────────────── */}
      <Panel noRivets className="px-4 py-2" style={{ flexShrink: 0 }}>
        <TimelineSlider
          duration={duration}
          currentTime={currentTime}
          onChange={setCurrentTime}
          events={flight.events || []}
        />
      </Panel>

      {/* ── Charts + Map ─────────────────────────────────────────── */}
      <div className="flex gap-2 flex-1 min-h-0">
        <Panel title="Telemetry Charts" className="flex-1 px-3 py-2 overflow-hidden">
          <div style={{ height: 'calc(100% - 32px)' }}>
            <PowerChart timeseries={timeseries} currentTime={currentTime} />
          </div>
        </Panel>
        <Panel title="GPS Ground Track" className="flex-1 overflow-hidden" style={{ padding: 0 }}>
          <TrackMap
            track={track}
            currentTime={currentTime}
            onTimeChange={setCurrentTime}
          />
        </Panel>
      </div>
    </div>
  );
}

function StatRow({ label, value, state }) {
  const color = state === 'warn' ? 'var(--needle-red)' : state === 'good' ? 'var(--healthy-green)' : 'var(--text-primary)';
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ color }}>{value}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="dh-subtitle mb-3">Loading flight data</div>
        <div className="flex gap-2 justify-center">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="vu-bar" style={{
              height: 32, background: 'var(--accent-yellow)',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onBack }) {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="dh-panel p-8 max-w-md text-center" style={{ borderLeft: '3px solid var(--needle-red)' }}>
        <div className="dh-lcd label" style={{ color: 'var(--needle-red)', marginBottom: 8 }}>Error</div>
        <div className="dh-lcd" style={{ fontSize: '0.85rem', marginBottom: 16 }}>{error}</div>
        <button onClick={onBack} className="dh-subtitle" style={{ cursor: 'pointer' }}>← Back</button>
      </div>
    </div>
  );
}
