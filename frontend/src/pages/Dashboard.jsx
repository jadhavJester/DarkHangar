import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Panel from '../components/Panel';
import AnalogGauge from '../components/AnalogGauge';
import TimelineSlider from '../components/TimelineSlider';
import PowerChart from '../components/PowerChart';
import ChartSeriesSelector from '../components/ChartSeriesSelector';
import RCMonitor from '../components/RCMonitor';
import MessageLog from '../components/MessageLog';
import ParamsBrowser from '../components/ParamsBrowser';
import TrackMap from '../components/TrackMap';
import TrackMap3D from '../components/TrackMap3D';
import { useFlight } from '../hooks/useFlight';
import { useTimeline } from '../hooks/useTimeline';

const API = window.location.origin.includes('5173') ? 'http://localhost:8000' : '';

function useResizable(axis, initial, min, max) {
  const [pct, setPct] = useState(initial);
  const dragging = useRef(false);
  const containerRef = useRef(null);
  const onMouseDown = useCallback((e) => {
    e.preventDefault(); dragging.current = true;
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [axis]);
  const onMouseMove = useCallback((e) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const p = axis === 'x'
      ? ((e.clientX - rect.left) / rect.width) * 100
      : ((e.clientY - rect.top) / rect.height) * 100;
    setPct(Math.max(min, Math.min(max, p)));
  }, [axis, min, max]);
  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);
  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [onMouseMove, onMouseUp]);
  const divider = (
    <div className={`resize-handle ${dragging.current ? 'active' : ''}`} onMouseDown={onMouseDown}
      style={axis === 'x' ? { cursor: 'col-resize' } : { cursor: 'row-resize', width: '100%', height: 6, minHeight: 6 }} />
  );
  return { pct, containerRef, divider, setPct };
}

export default function Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show3d, setShow3d] = useState(false);
  const { flight, timeseries, track, loading, error } = useFlight(id);
  const [enabledSeries, setEnabledSeries] = useState(() => {
    const init = {};
    ['alt','power','airspeed','volt'].forEach(k => init[k] = true);
    return init;
  });
  const [bottomTab, setBottomTab] = useState('rc');
  const [messages, setMessages] = useState(null);
  const [params, setParams] = useState(null);
  const [exporting, setExporting] = useState(null);

  const dur = useMemo(() => {
    if (!timeseries) return 0;
    const t = timeseries.bat?.time_s || timeseries.gps?.time_s || [];
    return t.length ? t[t.length - 1] - t[0] : 0;
  }, [timeseries]);

  const { currentTime, setCurrentTime, gaugeValues } = useTimeline(timeseries, dur);

  const h = useResizable('x', 65, 40, 80);
  const v = useResizable('y', 32, 18, 50);
  const cm = useResizable('x', 55, 30, 70);
  const btm = useResizable('y', 12, 8, 25);

  // Fetch messages and params once
  useEffect(() => {
    if (!id) return;
    fetch(`${API}/flights/${id}/messages`).then(r => r.json()).then(d => setMessages(d.messages || [])).catch(() => {});
    fetch(`${API}/flights/${id}/params`).then(r => r.json()).then(d => setParams(d.params || {})).catch(() => {});
  }, [id]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const url = `${API}/flights/${id}/export/${format}`;
      if (format === 'csv') {
        const r = await fetch(url);
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `flight_${id}.csv`;
        a.click();
      } else {
        window.open(url, '_blank');
      }
    } catch (e) { console.error(e); }
    setExporting(null);
  };

  const handleRecompute = async () => {
    try {
      const r = await fetch(`${API}/flights/${id}/recompute`, { method: 'POST' });
      const d = await r.json();
      if (d.recomputed) window.location.reload();
    } catch (e) { console.error(e); }
  };

  const toggleSeries = (key) => {
    setEnabledSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onBack={() => navigate('/history')} />;
  if (!flight) return null;

  const m = flight;

  return (
    <div className="flex flex-col h-screen overflow-hidden"
         style={{ background: 'var(--bg-primary)', padding: '6px', gap: '4px' }}>

      {/* ── Top bar ─────────────────────────────── */}
      <div className="flex items-center justify-between px-2"
           style={{ flexShrink: 0, minHeight: 32, maxHeight: 32 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/history')}
            className="dh-btn-flat px-2 py-1" style={{ fontSize: '0.5rem', lineHeight: 1 }}>← Back</button>
          <div>
            <div className="dh-subtitle" style={{ fontSize: '0.45rem', lineHeight: 1.1 }}>
              Flight #{m.id} · {m.log_date || m.uploaded_at?.slice(0, 10)}
            </div>
            <h1 className="dh-title" style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>{m.filename}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {m.vibe_health && m.vibe_health !== 'unknown' && (
            <span className="dh-lcd label" style={{ fontSize: '0.4rem' }}>
              {m.vibe_health === 'ok' ? 'VIBE OK' : m.vibe_health === 'warn' ? 'VIBE WARN' : 'VIBE BAD'}
            </span>
          )}
          {['csv','mat','pdf','kml'].map(fmt => (
            <button key={fmt} onClick={() => handleExport(fmt)}
              className="dh-btn-flat px-1.5 py-0.5"
              style={{ fontSize: '0.4rem', lineHeight: 1 }}>
              {exporting === fmt ? '…' : fmt.toUpperCase()}
            </button>
          ))}
          <button onClick={handleRecompute}
            className="dh-btn-flat px-1.5 py-0.5" style={{ fontSize: '0.4rem', lineHeight: 1, color: 'var(--accent)' }}>
            ↻
          </button>
          <button onClick={() => navigate('/upload')}
            className="dh-btn-flat px-2 py-1"
            style={{ color: 'var(--accent)', borderColor: 'var(--accent)', fontSize: '0.55rem', lineHeight: 1 }}>
            + Upload
          </button>
        </div>
      </div>

      {/* ── Vertical split: Top / Bottom ────────── */}
      <div ref={v.containerRef} className="flex flex-col flex-1 min-h-0" style={{ gap: 0 }}>
        {/* ══ Top half ══ */}
        <div style={{ height: `${v.pct}%`, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Gauges | Summary */}
          <div ref={h.containerRef} className="flex flex-1 min-h-0" style={{ gap: 0 }}>
            <div style={{ width: `${h.pct}%`, minWidth: 0, paddingRight: 2 }}>
              <Panel noRivets className="h-full px-3 py-2 flex items-center justify-around gap-1">
                <AnalogGauge label="Airspeed" unit="m/s" value={gaugeValues.airspeed ?? 0}
                  min={0} max={40} greenZoneEnd={15} size={100} />
                <AnalogGauge label="Altitude" unit="m" value={gaugeValues.altitude ?? 0}
                  min={0} max={500} greenZoneEnd={50} size={100} />
                <AnalogGauge label="Voltage" unit="V" value={gaugeValues.voltage ?? 0}
                  min={12} max={17} redZoneStart={14.8} greenZoneEnd={16.2} size={100} />
              </Panel>
            </div>
            {h.divider}
            <div className="flex-1 min-w-0" style={{ paddingLeft: 2 }}>
              <Panel className="h-full px-3 py-1.5 overflow-y-auto">
                <div className="dh-panel-header" style={{ padding: '0 0 3px 0', marginBottom: 3, fontSize: '0.55rem' }}>Summary</div>
                <div className="space-y-0.5" style={{ fontSize: '0.5rem' }}>
                  <MetricRow label="Distance" value={m.total_distance_km != null ? `${m.total_distance_km.toFixed(2)} km` : '—'} />
                  <MetricRow label="Duration" value={m.duration_min != null ? `${m.duration_min.toFixed(1)} min` : '—'} />
                  <MetricRow label="Energy" value={m.energy_wh != null ? `${m.energy_wh.toFixed(1)} Wh` : '—'} />
                  <MetricRow label="Efficiency" value={m.efficiency_wh_per_km != null ? `${m.efficiency_wh_per_km.toFixed(2)} Wh/km` : '—'} />
                  <MetricRow label="Max Speed" value={m.max_airspeed_ms != null ? `${m.max_airspeed_ms.toFixed(1)} m/s` : '—'} />
                  <MetricRow label="Avg Speed" value={m.avg_airspeed_ms != null ? `${m.avg_airspeed_ms.toFixed(1)} m/s` : '—'} />
                  <MetricRow label="Max Alt" value={m.max_altitude_m != null ? `${m.max_altitude_m.toFixed(0)} m AGL` : '—'} />
                  <MetricRow label="Max Current" value={m.max_current_a != null ? `${m.max_current_a.toFixed(1)} A` : '—'}
                    warn={m.max_current_a != null && m.max_current_a > 50} />
                  <MetricRow label="Min Voltage" value={m.min_voltage_v != null ? `${m.min_voltage_v.toFixed(3)} V` : '—'}
                    warn={m.min_voltage_v != null && m.min_voltage_v < 14.8} />
                  <MetricRow label="Glide Ratio" value={m.glide_ratio != null ? `${m.glide_ratio.toFixed(1)}:1` : '—'} />
                </div>
              </Panel>
            </div>
          </div>

          {/* Timeline */}
          <Panel noRivets className="px-3 py-1" style={{ flexShrink: 0 }}>
            <TimelineSlider duration={dur} currentTime={currentTime}
              onChange={setCurrentTime} events={flight.events || []} />
          </Panel>
        </div>

        {v.divider}

        {/* ══ Bottom half ══ */}
        <div className="flex flex-1 min-h-0" style={{ gap: 2 }}>
          <div ref={cm.containerRef} className="flex flex-1 min-w-0" style={{ gap: 0, flexDirection: 'column' }}>
            {/* Chart area */}
            <div className="relative flex-1 min-h-0" style={{ paddingBottom: 2 }}>
              <Panel className="h-full px-2 py-1 overflow-hidden">
                <ChartSeriesSelector enabled={enabledSeries} onToggle={toggleSeries} />
                <div style={{ position: 'absolute', top: 22, left: 0, right: 0, bottom: 0 }}>
                  <PowerChart timeseries={timeseries} currentTime={currentTime}
                    enabledSeries={enabledSeries} events={flight.events} />
                </div>
              </Panel>
            </div>
          </div>

          {cm.divider}

          {/* Map */}
          <div className="flex-1 relative overflow-hidden min-w-0 flex flex-col"
               style={{ borderRadius: 12, border: '1px solid var(--border-glass)', background: 'var(--bg-panel-solid)' }}>
            <div className="flex-1 relative">
              {show3d ? (
                <TrackMap3D track={track} currentTime={currentTime} />
              ) : (
                <TrackMap track={track} currentTime={currentTime} onTimeChange={setCurrentTime} />
              )}
            </div>
            <div className="absolute top-1 right-2 z-10 flex gap-1">
              <button onClick={() => setShow3d(false)}
                className={`dh-btn-flat px-2 py-0.5 ${!show3d ? 'active' : ''}`}
                style={{ fontSize: '0.45rem', lineHeight: 1 }}>2D</button>
              <button onClick={() => setShow3d(true)}
                className={`dh-btn-flat px-2 py-0.5 ${show3d ? 'active' : ''}`}
                style={{ fontSize: '0.45rem', lineHeight: 1 }}>3D</button>
            </div>
          </div>
        </div>
      </div>

      {btm.divider}
      {/* ── Bottom panel: RC | Messages | Params ── */}
      <div ref={btm.containerRef} className="flex flex-col" style={{ flexShrink: 0, height: `${btm.pct}%`, minHeight: 50 }}>
        <div className="flex gap-2 px-1 py-0.5" style={{ flexShrink: 0 }}>
          {[
            { key: 'rc', label: 'RC' },
            { key: 'msgs', label: `Messages${messages?.length ? ` (${messages.length})` : ''}` },
            { key: 'params', label: `Params${params ? ` (${Object.keys(params).length})` : ''}` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setBottomTab(tab.key)}
              className={`dh-btn-flat px-2 py-0.5 ${bottomTab === tab.key ? 'active' : ''}`}
              style={{ fontSize: '0.45rem', lineHeight: 1 }}>
              {tab.label}
            </button>
          ))}
        </div>
        <Panel noRivets className="flex-1 px-3 py-1 overflow-hidden" style={{ minHeight: 0 }}>
          {bottomTab === 'rc' && (
            <RCMonitor rcin={timeseries?.rcin} rcout={timeseries?.rcou} currentTime={currentTime} />
          )}
          {bottomTab === 'msgs' && (
            <MessageLog messages={messages} />
          )}
          {bottomTab === 'params' && (
            <ParamsBrowser params={params} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function MetricRow({ label, value, warn }) {
  return (
    <div className="stat-row" style={{ padding: '1.5px 0' }}>
      <span className="stat-label" style={{ fontSize: '0.5rem' }}>{label}</span>
      <span className="stat-value" style={{ fontSize: '0.5rem', color: warn ? 'var(--needle-red)' : undefined }}>{value}</span>
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
            <div key={i} className="vu-bar" style={{ height: 32, background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
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
