import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Panel from '../components/Panel';
import FlightCard from '../components/FlightCard';
import TrendPanel from '../components/TrendChart';
import { useFlightList } from '../hooks/useFlight';

export default function History() {
  const navigate = useNavigate();
  const { flights, loading, error, refetch } = useFlightList();

  return (
    <div className="flex h-screen overflow-hidden"
         style={{ background: 'var(--bg-primary)', padding: 8, gap: 8 }}>

      {/* ── Sidebar: flight ledger ────────────────────────────────── */}
      <div className="flex flex-col" style={{ width: 280, minWidth: 260 }}>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <div className="dh-subtitle" style={{ fontSize: '0.55rem' }}>Mission Archive</div>
            <h2 className="dh-title text-xl">Flight Log</h2>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="dh-panel px-3 py-1.5 dh-subtitle"
            style={{ fontSize: '0.55rem', cursor: 'pointer' }}
          >
            + Upload
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {loading && (
            <div className="dh-lcd label text-center py-8">Loading flights…</div>
          )}
          {error && (
            <div className="dh-lcd label text-center py-8" style={{ color: 'var(--needle-red)' }}>
              {error}
            </div>
          )}
          {!loading && !error && flights.length === 0 && (
            <div className="text-center py-12">
              <div className="dh-lcd label mb-3">No flights yet</div>
              <button onClick={() => navigate('/upload')} className="dh-subtitle" style={{ cursor: 'pointer', fontSize: '0.65rem' }}>
                Upload your first .BIN log →
              </button>
            </div>
          )}
          {flights.map(f => (
            <FlightCard
              key={f.id}
              flight={f}
              onClick={() => navigate(`/flights/${f.id}`)}
            />
          ))}
        </div>

        {/* Ledger footer */}
        <Panel noRivets className="p-3 mt-2">
          <div className="flex justify-between">
            <div className="flex flex-col items-center">
              <span className="dh-lcd label">Total Flights</span>
              <span className="dh-lcd" style={{ fontSize: '1.2rem' }}>{flights.length}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="dh-lcd label">Total Dist</span>
              <span className="dh-lcd" style={{ fontSize: '1.2rem' }}>
                {flights.reduce((s, f) => s + (f.total_distance_km || 0), 0).toFixed(1)} km
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="dh-lcd label">Total Energy</span>
              <span className="dh-lcd" style={{ fontSize: '1.2rem' }}>
                {flights.reduce((s, f) => s + (f.energy_wh || 0), 0).toFixed(0)} Wh
              </span>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Right: trend charts ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 gap-2">
        <Panel title="Efficiency & Performance Trends" className="flex-1 overflow-y-auto px-4 py-3">
          {flights.length < 2 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="dh-lcd label mb-2">Upload more flights to see trends</div>
                <div className="dh-subtitle" style={{ fontSize: '0.6rem' }}>
                  Min. 2 flights required for trend charts
                </div>
              </div>
            </div>
          ) : (
            <TrendPanel flights={flights} />
          )}
        </Panel>

        {/* Quick actions */}
        <Panel noRivets className="p-3 flex gap-4 items-center">
          <span className="dh-lcd label flex-1">
            {flights.length} flights archived · Last: {flights[0]?.log_date || flights[0]?.uploaded_at?.slice(0, 10) || '—'}
          </span>
          <button
            onClick={refetch}
            className="dh-subtitle"
            style={{ cursor: 'pointer', fontSize: '0.55rem' }}
          >
            ↺ Refresh
          </button>
          <button
            onClick={() => navigate('/styleguide')}
            className="dh-subtitle"
            style={{ cursor: 'pointer', fontSize: '0.55rem', opacity: 0.5 }}
          >
            Styleguide
          </button>
        </Panel>
      </div>
    </div>
  );
}
