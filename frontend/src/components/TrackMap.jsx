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
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
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
      {/* Bat watermark */}
      <div className="bat-watermark">
        <svg viewBox="0 0 200 100" width="60%" fill="white">
          <path d="M100 60 C60 40, 20 80, 0 60 C20 20, 60 0, 100 30 C140 0, 180 20, 200 60 C180 80, 140 40, 100 60Z" />
        </svg>
      </div>
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
  if (maxAlt === minAlt) return '#f2c30f';
  const t = Math.max(0, Math.min(1, (alt - minAlt) / (maxAlt - minAlt)));
  // Blue (low) → Yellow (high)
  const r = Math.round(50  + t * (242 - 50));
  const g = Math.round(100 + t * (195 - 100));
  const b = Math.round(220 + t * (15  - 220));
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
    html: '<div style="width:10px;height:10px;border-radius:50%;background:#2f9e44;border:2px solid #0b0d10;box-shadow:0 0 6px rgba(47,158,68,0.8)"></div>',
    className: '', iconAnchor: [5, 5],
  });
  L.marker([track[0].lat, track[0].lng], { icon: startIcon }).addTo(map)
    .bindTooltip('Start', { className: 'leaflet-tooltip-dark' });

  // Moving marker (yellow)
  const markerIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#f2c30f;border:2px solid #0b0d10;box-shadow:0 0 10px rgba(242,195,15,0.9)"></div>',
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
