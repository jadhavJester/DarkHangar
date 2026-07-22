import React, { useEffect, useRef, useState } from 'react';

/**
 * TrackMap3D — CesiumJS 3D Globe map.
 * Shows 3D GPS trajectory and a moving aircraft marker synchronized with the timeline.
 */
export default function TrackMap3D({ track = [], currentTime = 0 }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const cesiumRef = useRef(null);
  const markerEntityRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Cesium resources dynamically
  useEffect(() => {
    if (viewerRef.current || !containerRef.current) return;

    if (window.Cesium) {
      initCesium(window.Cesium);
      return;
    }

    // Append Stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cesium.com/downloads/cesiumjs/releases/1.110/Build/Cesium/Widgets/widgets.css';
    document.head.appendChild(link);

    // Append Script
    const script = document.createElement('script');
    script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.110/Build/Cesium/Cesium.js';
    script.async = true;
    
    script.onload = () => {
      if (window.Cesium) {
        initCesium(window.Cesium);
      } else {
        setError("Failed to load Cesium module from CDN.");
        setLoading(false);
      }
    };

    script.onerror = () => {
      setError("Failed to load Cesium assets. An internet connection is required for the 3D globe.");
      setLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      cesiumRef.current = null;
      markerEntityRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize Cesium Viewer
  const initCesium = (Cesium) => {
    try {
      const viewer = new Cesium.Viewer(containerRef.current, {
        terrainProvider: Cesium.createWorldTerrain ? Cesium.createWorldTerrain() : undefined,
        infoBox: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        baseLayerPicker: true,
        geocoder: false,
        homeButton: false,
        timeline: false,
        animation: false,
        fullscreenButton: false,
      });

      if (viewer.creditContainer) {
        viewer.creditContainer.style.display = 'none';
      }

      viewerRef.current = viewer;
      cesiumRef.current = { Cesium, viewer };

      if (track.length > 0) {
        drawTrajectory(Cesium, viewer, track);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("An error occurred while initializing the 3D WebGL engine.");
      setLoading(false);
    }
  };

  // Draw 3D trajectory line and marker
  const drawTrajectory = (Cesium, viewer, trackData) => {
    // Clear existing entities
    viewer.entities.removeAll();

    const positions = trackData.map(pt =>
      Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, pt.alt || 0)
    );

    // Draw 3D path line (yellow)
    viewer.entities.add({
      name: 'Flight path',
      polyline: {
        positions: positions,
        width: 3.5,
        material: Cesium.Color.fromCssColorString('#f2c30f'),
        clampToGround: false,
      }
    });

    // Draw path extrusion (green semi-translucent wall to ground)
    viewer.entities.add({
      name: 'Flight path wall',
      wall: {
        positions: positions,
        minimumHeights: trackData.map(() => 0.0), // Extend all the way to ground
        material: Cesium.Color.fromCssColorString('#2f9e44').withAlpha(0.2),
      }
    });

    // Add Start Pin
    viewer.entities.add({
      position: positions[0],
      point: {
        pixelSize: 8,
        color: Cesium.Color.GREEN,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
      },
      label: {
        text: 'START',
        font: '10px monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -10)
      }
    });

    // Add Moving Marker (yellow billboard/pin)
    const initialPt = _interpolateTrack(trackData, currentTime) || trackData[0];
    const marker = viewer.entities.add({
      name: 'Telemetry position',
      position: Cesium.Cartesian3.fromDegrees(initialPt.lng, initialPt.lat, initialPt.alt || 0),
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString('#00f0ff'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
      }
    });
    markerEntityRef.current = marker;

    // Zoom to fit the entire trajectory bounds
    viewer.zoomTo(viewer.entities);
  };

  // Re-draw if track changes
  useEffect(() => {
    if (!cesiumRef.current || track.length === 0) return;
    const { Cesium, viewer } = cesiumRef.current;
    drawTrajectory(Cesium, viewer, track);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  // Sync timeline marker position
  useEffect(() => {
    if (!cesiumRef.current || !markerEntityRef.current || track.length === 0) return;
    const { Cesium } = cesiumRef.current;
    const pt = _interpolateTrack(track, currentTime);
    if (pt) {
      markerEntityRef.current.position = Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, pt.alt || 0);
    }
  }, [currentTime, track]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
      {/* Container where Cesium will mount */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary-dark z-10"
             style={{ background: 'var(--bg-primary)', opacity: 0.9 }}>
          <span className="dh-subtitle mb-2">Loading 3D Globe Viewer...</span>
          <div className="dh-lcd text-xs animate-pulse" style={{ color: 'var(--accent-yellow)' }}>
            Retrieving planet tiles from CDN
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10"
             style={{ background: 'var(--bg-primary)' }}>
          <span className="dh-lcd mb-2" style={{ color: 'var(--needle-red)' }}>
            3D Globe Unavailable
          </span>
          <span className="dh-subtitle max-w-xs" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
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
      const alt0 = track[i].alt ?? 0;
      const alt1 = track[i + 1].alt ?? 0;
      return {
        lat: track[i].lat + frac * (track[i + 1].lat - track[i].lat),
        lng: track[i].lng + frac * (track[i + 1].lng - track[i].lng),
        alt: alt0 + frac * (alt1 - alt0),
      };
    }
  }
  return track[0];
}
