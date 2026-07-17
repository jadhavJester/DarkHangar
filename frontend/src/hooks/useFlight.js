import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = window.location.origin.includes('5173') ? 'http://localhost:8000' : '';
const IS_DEMO_MODE = !window.location.origin.includes('localhost') && 
                     !window.location.origin.includes('127.0.0.1') && 
                     !window.location.origin.includes('8765');

/**
 * useFlight — fetch and cache flight detail + timeseries.
 */
export function useFlight(flightId) {
  const [flight, setFlight]         = useState(null);
  const [timeseries, setTimeseries] = useState(null);
  const [track, setTrack]           = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const fetchFlight = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);

    if (IS_DEMO_MODE) {
      // In demo mode, load our pre-built mock telemetry assets
      try {
        const [flightsRes, tsRes, trackRes] = await Promise.all([
          axios.get('/mock_flights.json'),
          axios.get('/mock_timeseries.json'),
          axios.get('/mock_track.json')
        ]);
        const matched = flightsRes.data.flights.find(f => String(f.id) === String(id)) || flightsRes.data.flights[0];
        setFlight(matched);
        setTimeseries(tsRes.data);
        setTrack(trackRes.data?.points || []);
      } catch (e) {
        setError("Failed to load demo telemetry assets: " + e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const [flightRes, tsRes, trackRes] = await Promise.all([
        axios.get(`${API}/flights/${id}`),
        axios.get(`${API}/flights/${id}/timeseries`).catch(() => ({ data: null })),
        axios.get(`${API}/flights/${id}/track`).catch(() => ({ data: { points: [] } })),
      ]);
      setFlight(flightRes.data);
      setTimeseries(tsRes.data);
      setTrack(trackRes.data?.points || []);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlight(flightId);
  }, [flightId, fetchFlight]);

  return { flight, timeseries, track, loading, error, refetch: () => fetchFlight(flightId) };
}

/**
 * useFlightList — fetch all flights summary.
 */
export function useFlightList() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      if (IS_DEMO_MODE) {
        const res = await axios.get('/mock_flights.json');
        setFlights(res.data.flights || []);
      } else {
        const res = await axios.get(`${API}/flights`);
        setFlights(res.data.flights || []);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { flights, loading, error, refetch: fetch };
}
