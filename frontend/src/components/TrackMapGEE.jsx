import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const CLIENT_ID = '1002823106203-q2o01n2qpkkm1nphm47lfb3eunl7vv3p.apps.googleusercontent.com';

export default function TrackMapGEE({ track = [], currentTime = 0, onTimeChange }) {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markerRef = useRef(null);
  const eeLayerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [error, setError] = useState(null);

  // Load Google APIs and Earth Engine client library dynamically
  useEffect(() => {
    if (window.ee) {
      checkAuth();
      return;
    }

    const loadLibraries = async () => {
      try {
        // Load Google API Platform client script
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Google API client.'));
          document.head.appendChild(script);
        });

        // Load Earth Engine client script
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@google/earthengine@0.1.370/earth-engine-api.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Earth Engine API client.'));
          document.head.appendChild(script);
        });

        checkAuth();
      } catch (err) {
        setError(err.message || 'Error loading Earth Engine libraries.');
        setLoading(false);
      }
    };

    loadLibraries();

    return () => {
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = () => {
    const ee = window.ee;
    // Attempt background login first (immediate mode)
    ee.data.authenticateViaOauth(
      CLIENT_ID,
      () => {
        initializeEE();
      },
      () => {
        // Immediate auth failed, user needs to click the login button
        setAuthNeeded(true);
        setLoading(false);
      },
      null, // extraScopes
      () => {
        // onImmediateFailed
        setAuthNeeded(true);
        setLoading(false);
      }
    );
  };

  const handleSignIn = () => {
    setError(null);
    setLoading(true);
    const ee = window.ee;
    ee.data.authenticateViaPopup(
      CLIENT_ID,
      () => {
        setAuthNeeded(false);
        initializeEE();
      },
      (err) => {
        console.error('GEE Auth Error:', err);
        setError('Authentication failed. Please verify that popup blockers are disabled, and that http://localhost:5173 / http://127.0.0.1:8766 is allowed in your Google Console authorized origins.');
        setLoading(false);
      }
    );
  };

  const initializeEE = () => {
    const ee = window.ee;
    ee.initialize(
      null,
      null,
      () => {
        setLoading(false);
        initLeaflet();
      },
      (err) => {
        console.error('GEE Init Error:', err);
        setError('Failed to initialize Earth Engine API: ' + err);
        setLoading(false);
      }
    );
  };

  const initLeaflet = () => {
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

      // Load Google Hybrid (Satellite + Labels) tile layer
      L.tileLayer(
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        {
          attribution: '&copy; Google Maps',
          maxZoom: 20,
        }
      ).addTo(map);

      leafletRef.current = { map, L };

      if (track.length > 0) {
        drawGEETrajectory(L, map, track);
      }
    });
  };

  const drawGEETrajectory = (L, map, trackData) => {
    const ee = window.ee;
    if (!ee) return;

    // Clear old GEE layers
    if (eeLayerRef.current) {
      map.removeLayer(eeLayerRef.current);
    }
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    try {
      // Convert track to GEE coordinates
      const coords = trackData.map(pt => [pt.lng, pt.lat]);
      const line = new ee.Geometry.LineString(coords);
      const feature = new ee.Feature(line);
      const collection = new ee.FeatureCollection([feature]);

      // Paint the line onto an empty image
      const empty = ee.Image().byte();
      const painted = empty.paint({
        featureCollection: collection,
        color: 1,
        width: 3.5
      });

      // Fetch GEE map layer
      painted.getMap({ palette: 'ff00ff' }, (mapInfo) => {
        if (!mapInfo || !mapInfo.urlFormat) {
          console.error('Failed to retrieve GEE map ID');
          return;
        }

        const eeLayer = L.tileLayer(mapInfo.urlFormat, {
          maxZoom: 20,
          opacity: 0.95
        });
        eeLayer.addTo(map);
        eeLayerRef.current = eeLayer;
      });

      // Start/Moving marker
      const markerIcon = L.divIcon({
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#ff00ff;border:2px solid #ffffff;box-shadow:0 0 10px rgba(255,0,255,0.9)"></div>',
        className: '',
        iconAnchor: [7, 7],
      });
      const marker = L.marker([trackData[0].lat, trackData[0].lng], { icon: markerIcon }).addTo(map);
      markerRef.current = marker;

      // Fit map bounds
      const bounds = L.latLngBounds(trackData.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    } catch (err) {
      console.error('Error drawing GEE trajectory:', err);
    }
  };

  // Sync timeline marker position
  useEffect(() => {
    if (!leafletRef.current || !markerRef.current || track.length === 0) return;
    const pt = _interpolateTrack(track, currentTime);
    if (pt) {
      markerRef.current.setLatLng([pt.lat, pt.lng]);
    }
  }, [currentTime, track]);

  // Re-draw if track changes
  useEffect(() => {
    if (!leafletRef.current || track.length === 0) return;
    const { map, L } = leafletRef.current;
    drawGEETrajectory(L, map, track);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
      {/* Map Mount Target */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', zIndex: 2 }}
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
             style={{ background: 'var(--bg-primary)', opacity: 0.9 }}>
          <span className="dh-subtitle mb-2">Connecting to Google Earth Engine...</span>
          <div className="dh-lcd text-xs animate-pulse" style={{ color: 'var(--accent-yellow)' }}>
            Retrieving GEE platform modules
          </div>
        </div>
      )}

      {/* Google Auth Required Overlay */}
      {authNeeded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10"
             style={{ background: 'var(--bg-primary)' }}>
          <span className="dh-lcd mb-2" style={{ color: 'var(--accent-yellow)' }}>
            Earth Engine Authentication
          </span>
          <p className="dh-subtitle max-w-xs mb-4" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
            An authorized Google account with Earth Engine access is required to render custom GEE layers.
          </p>
          <button
            onClick={handleSignIn}
            className="dh-panel px-4 py-2 hover:shadow-bat-glow transition-all"
            style={{ color: 'var(--accent-yellow)', borderColor: 'var(--accent-yellow)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '0.6rem', fontWeight: 600 }}
          >
            Sign In with Google
          </button>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10"
             style={{ background: 'var(--bg-primary)' }}>
          <span className="dh-lcd mb-2" style={{ color: 'var(--needle-red)' }}>
            Earth Engine Error
          </span>
          <span className="dh-subtitle max-w-sm" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
            {error}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

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
