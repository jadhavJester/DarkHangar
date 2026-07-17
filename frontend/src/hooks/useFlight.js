import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = window.location.origin.includes('5173') ? 'http://localhost:8000' : '';

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
      const res = await axios.get(`${API}/flights`);
      setFlights(res.data.flights || []);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { flights, loading, error, refetch: fetch };
}
