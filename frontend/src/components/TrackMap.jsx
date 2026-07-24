import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

/**
 * TrackMap — Leaflet map with dark CartoDB tiles.
 * Shows GPS track colored by altitude, with a moving marker.
 *
 * Props:
 *   track     — [{lat, lng, alt, spd, t}]
 *   currentTime — seconds (from timeline slider)
 *   onTimeChange — callback when user clicks a point on track
 */
export default function TrackMap({ track = [], currentTime = 0, onTimeChange }) {
  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const markerRef   = useRef(null);
  const polylineRef = useRef(null);

  // Initialize map once
  useEffect(() => {
    if (leafletRef.current || !mapRef.current) return;

    import('leaflet').then((L) => {
      // Fix default icon paths
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        center: [0, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        }
      ).addTo(map);

      leafletRef.current = { map, L };

      // Draw track if already available
      if (track.length > 0) {
        _drawTrack(L, map, track, markerRef, polylineRef, onTimeChange);
        _fitBounds(L, map, track);
      }
    });

    return () => {
      leafletRef.current?.map?.remove();
      leafletRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-draw track when track data changes
  useEffect(() => {
    if (!leafletRef.current || track.length === 0) return;
    const { map, L } = leafletRef.current;
    _drawTrack(L, map, track, markerRef, polylineRef, onTimeChange);
    _fitBounds(L, map, track);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  // Move marker with timeline
  useEffect(() => {
    if (!leafletRef.current || !markerRef.current || track.length === 0) return;
    const { L } = leafletRef.current;
    const pt = _interpolateTrack(track, currentTime);
    if (pt) {
      markerRef.current.setLatLng([pt.lat, pt.lng]);
    }
  }, [currentTime, track]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', borderRadius: '0 0 12px 12px', zIndex: 2 }}
      />
      {track.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="dh-lcd" style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            No GPS track available
          </span>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _altColor(alt, minAlt, maxAlt) {
  if (maxAlt === minAlt) return '#b8860b';
  const t = Math.max(0, Math.min(1, (alt - minAlt) / (maxAlt - minAlt)));
  // Blue (low) → Gold (high)
  const r = Math.round(60  + t * (184 - 60));
  const g = Math.round(130 + t * (134 - 130));
  const b = Math.round(200 + t * (11  - 200));
  return `rgb(${r},${g},${b})`;
}

function _drawTrack(L, map, track, markerRef, polylineRef, onTimeChange) {
  // Remove old layers
  polylineRef.current?.forEach?.(p => map.removeLayer(p));
  if (markerRef.current) map.removeLayer(markerRef.current);

  const alts = track.map(p => p.alt ?? 0);
  const minAlt = Math.min(...alts);
  const maxAlt = Math.max(...alts);

  // Draw segments colored by altitude
  const segments = [];
  for (let i = 0; i < track.length - 1; i++) {
    const color = _altColor((alts[i] + alts[i + 1]) / 2, minAlt, maxAlt);
    const seg = L.polyline(
      [[track[i].lat, track[i].lng], [track[i + 1].lat, track[i + 1].lng]],
      { color, weight: 3, opacity: 0.85 }
    );
    if (onTimeChange && track[i].t != null) {
      seg.on('click', () => onTimeChange(track[i].t));
    }
    seg.addTo(map);
    segments.push(seg);
  }
  polylineRef.current = segments;

  // Start marker (green)
  const startIcon = L.divIcon({
    html: '<div style="width:10px;height:10px;border-radius:50%;background:#3a7d4a;border:2px solid #f5efe3;box-shadow:0 0 8px rgba(58,125,74,0.6)"></div>',
    className: '', iconAnchor: [5, 5],
  });
  L.marker([track[0].lat, track[0].lng], { icon: startIcon }).addTo(map)
    .bindTooltip('Start', { className: 'leaflet-tooltip-dark' });

  // Moving marker (gold)
  const markerIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#b8860b;border:2px solid #f5efe3;box-shadow:0 0 12px rgba(184,134,11,0.8)"></div>',
    className: '', iconAnchor: [7, 7],
  });
  const marker = L.marker([track[0].lat, track[0].lng], { icon: markerIcon }).addTo(map);
  markerRef.current = marker;
}

function _fitBounds(L, map, track) {
  if (track.length === 0) return;
  const bounds = L.latLngBounds(track.map(p => [p.lat, p.lng]));
  map.fitBounds(bounds, { padding: [20, 20] });
}

function _interpolateTrack(track, t) {
  if (!track || track.length === 0) return null;
  if (t == null) return track[0];
  const last = track[track.length - 1];
  if (t >= (last.t ?? Infinity)) return last;

  for (let i = 0; i < track.length - 1; i++) {
    const t0 = track[i].t ?? 0;
    const t1 = track[i + 1].t ?? 0;
    if (t >= t0 && t <= t1) {
      const frac = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      return {
        lat: track[i].lat + frac * (track[i + 1].lat - track[i].lat),
        lng: track[i].lng + frac * (track[i + 1].lng - track[i].lng),
      };
    }
  }
  return track[0];
}
