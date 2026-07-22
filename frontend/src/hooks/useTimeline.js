import { useState, useCallback, useMemo } from 'react';

/**
 * useTimeline — manages scrub position and interpolates all gauge values.
 *
 * @param {object} timeseries — full timeseries dict from API
 * @param {number} duration — flight duration in seconds
 */
export function useTimeline(timeseries, duration) {
  const [currentTime, setCurrentTime] = useState(0);

  const getSeries = useCallback((key) => {
    if (!timeseries) return null;
    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(timeseries).find(k => k.toLowerCase() === lowerKey);
    return foundKey ? timeseries[foundKey] : null;
  }, [timeseries]);

  const interpolate = useCallback((series, field, t) => {
    if (!series) return null;
    const times = series.time_s || series.TimeS || series.time || series.time_us;
    const foundField = Object.keys(series).find(f => f.toLowerCase() === field.toLowerCase());
    const values = foundField ? series[foundField] : null;
    if (!times || !values || times.length === 0) return null;
    if (t <= times[0]) return values[0];
    if (t >= times[times.length - 1]) return values[values.length - 1];

    // Binary search for surrounding indices
    let lo = 0, hi = times.length - 1;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (times[mid] <= t) lo = mid;
      else hi = mid;
    }
    const frac = (t - times[lo]) / (times[hi] - times[lo]);
    return values[lo] + frac * (values[hi] - values[lo]);
  }, []);

  const groundAlt = useMemo(() => {
    const baro = getSeries('baro') || getSeries('altitude');
    const gps = getSeries('gps');
    return baro?.alt?.[0] ?? baro?.altitude?.[0] ?? gps?.alt?.[0] ?? gps?.altitude?.[0] ?? 0;
  }, [getSeries]);

  const gaugeValues = useMemo(() => {
    if (!timeseries) return {};
    const t = currentTime;
    const ga = groundAlt;

    const batSeries = getSeries('bat') || getSeries('battery');
    const gpsSeries = getSeries('gps');
    const arspSeries = getSeries('arsp') || getSeries('airspeed');
    const baroSeries = getSeries('baro') || getSeries('altitude');
    const attSeries = getSeries('att') || getSeries('attitude');
    const ctunSeries = getSeries('ctun');

    const _alt = (raw) => raw != null ? Math.max(0, raw - ga) : null;

    return {
      airspeed: interpolate(arspSeries, 'airspeed', t) ?? interpolate(arspSeries, 'asp', t) ?? interpolate(arspSeries, 'arsp', t) ?? interpolate(gpsSeries, 'spd', t) ?? interpolate(gpsSeries, 'speed', t),
      altitude:  _alt(interpolate(baroSeries, 'alt', t) ?? interpolate(baroSeries, 'altitude', t) ?? interpolate(gpsSeries, 'alt', t) ?? interpolate(gpsSeries, 'altitude', t)),
      voltage:   interpolate(batSeries, 'volt', t) ?? interpolate(batSeries, 'voltage', t) ?? interpolate(batSeries, 'v', t),
      current:   interpolate(batSeries, 'curr', t) ?? interpolate(batSeries, 'current', t) ?? interpolate(batSeries, 'c', t),
      power:     (() => {
        const v = interpolate(batSeries, 'volt', t) ?? interpolate(batSeries, 'voltage', t) ?? interpolate(batSeries, 'v', t);
        const c = interpolate(batSeries, 'curr', t) ?? interpolate(batSeries, 'current', t) ?? interpolate(batSeries, 'c', t);
        return v != null && c != null ? v * c : null;
      })(),
      roll:      interpolate(attSeries, 'roll', t),
      pitch:     interpolate(attSeries, 'pitch', t),
      yaw:       interpolate(attSeries, 'yaw', t),
      throttle:  interpolate(ctunSeries, 'thr_out', t) ?? interpolate(ctunSeries, 'thr', t),
      gps_lat:   interpolate(gpsSeries, 'lat', t),
      gps_lng:   interpolate(gpsSeries, 'lng', t),
      gps_alt:   _alt(interpolate(gpsSeries, 'alt', t)),
      gps_spd:   interpolate(gpsSeries, 'spd', t) ?? interpolate(gpsSeries, 'speed', t),
    };
  }, [timeseries, currentTime, interpolate, getSeries, groundAlt]);

  return { currentTime, setCurrentTime, gaugeValues };
}
