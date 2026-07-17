import React from 'react';

/**
 * FlightCard — Sidebar entry for one flight in the history view.
 */
export default function FlightCard({ flight, active, onClick }) {
  const {
    id, filename, log_date, uploaded_at,
    duration_min, total_distance_km, energy_wh,
    efficiency_wh_per_km, vibe_health, has_gps, has_battery,
  } = flight;

  const date = log_date || uploaded_at?.slice(0, 10) || '—';

  return (
    <div
      className={`flight-card dh-panel p-3 mb-2 ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="dh-subtitle" style={{ fontSize: '0.55rem' }}>#{id} — {date}</div>
          <div className="dh-lcd label mt-0.5"
               style={{ color: 'var(--text-primary)', fontSize: '0.7rem' }}>
            {filename}
          </div>
        </div>
        <span className={`dh-badge ${vibe_health || 'unknown'}`}>
          {vibe_health === 'ok' ? '✓ VIBE' : vibe_health === 'warn' ? '⚠ VIBE' : vibe_health === 'bad' ? '✗ VIBE' : '? VIBE'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 mt-2">
        <StatMini label="Dist" value={total_distance_km != null ? `${total_distance_km.toFixed(1)} km` : '—'} />
        <StatMini label="Time" value={duration_min != null ? `${duration_min.toFixed(1)} min` : '—'} />
        <StatMini label="Energy" value={energy_wh != null ? `${energy_wh.toFixed(0)} Wh` : '—'} />
      </div>

      {efficiency_wh_per_km != null && (
        <div className="mt-1.5 text-right">
          <span className="dh-lcd" style={{ fontSize: '0.65rem', color: 'var(--healthy-green)' }}>
            {efficiency_wh_per_km.toFixed(1)} Wh/km
          </span>
        </div>
      )}

      {(!has_gps || !has_battery) && (
        <div className="mt-1 flex gap-1 flex-wrap">
          {!has_gps && <span className="dh-badge warn">No GPS</span>}
          {!has_battery && <span className="dh-badge warn">No BAT</span>}
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value }) {
  return (
    <div className="flex flex-col items-center">
      <span className="dh-lcd label">{label}</span>
      <span className="dh-lcd" style={{ fontSize: '0.7rem' }}>{value}</span>
    </div>
  );
}
