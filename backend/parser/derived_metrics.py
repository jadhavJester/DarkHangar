"""
Derived metrics computation from parsed ArduPilot DataFlash log data.

All inputs come from the 'timeseries' dict returned by bin_parser.parse_bin_log().
"""
import math
import logging
from typing import Optional

import numpy as np

log = logging.getLogger("dark_hangar.metrics")

# Vibration health thresholds (m/s²)
VIBE_WARN = 15.0
VIBE_BAD = 30.0

# Motor-off detection threshold (amps)
MOTOR_OFF_CURRENT_THRESHOLD = 1.5


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two GPS points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compute_total_distance(gps: dict) -> Optional[float]:
    """Sum haversine distances over all GPS points. Returns km."""
    lats = gps.get("lat", [])
    lngs = gps.get("lng", [])
    if len(lats) < 2:
        return None
    total = 0.0
    for i in range(1, len(lats)):
        total += haversine_distance_km(lats[i - 1], lngs[i - 1], lats[i], lngs[i])
    return round(total, 4)


def compute_duration_min(events: list, timeseries: dict) -> Optional[float]:
    """
    Compute flight duration in minutes.
    Prefers ARM event timestamps; falls back to GPS time range.
    """
    arm_events = [e for e in events if e["event_type"] == "ARM"]
    arm_times = []
    disarm_times = []

    for e in arm_events:
        val = e.get("value", {}) or {}
        t_s = e["time_us"] / 1_000_000
        if val.get("armed"):
            arm_times.append(t_s)
        else:
            disarm_times.append(t_s)

    if arm_times and disarm_times:
        start = min(arm_times)
        end = max(disarm_times)
        if end > start:
            return round((end - start) / 60.0, 2)

    # Fallback: GPS time range
    gps_times = timeseries.get("gps", {}).get("time_s", [])
    if len(gps_times) >= 2:
        return round((gps_times[-1] - gps_times[0]) / 60.0, 2)

    return None


def compute_energy_wh(bat: dict) -> Optional[float]:
    """
    Integrate Power (V × A) over time using numpy trapz.
    Falls back to CurrTot × avg_volt / 1000 if integration fails.
    Returns Wh.
    """
    times = np.array(bat.get("time_s", []))
    volts = np.array(bat.get("volt", []))
    currs = np.array(bat.get("curr", []))
    curr_tot = np.array(bat.get("curr_tot", []))

    if len(times) < 2:
        return None

    # Primary: ∫(V × I) dt
    try:
        power_w = volts * currs
        energy_ws = np.trapz(power_w, times)  # Watt-seconds
        energy_wh = energy_ws / 3600.0
        if energy_wh > 0:
            return round(float(energy_wh), 3)
    except Exception as e:
        log.warning(f"Power integration failed: {e}")

    # Fallback: CurrTot (mAh) × avg_volt / 1000
    if len(curr_tot) > 0 and len(volts) > 0:
        max_curr_tot = float(np.max(curr_tot))  # mAh
        avg_volt = float(np.mean(volts))
        if max_curr_tot > 0 and avg_volt > 0:
            return round(max_curr_tot * avg_volt / 1000.0, 3)

    return None


def compute_airspeed_stats(arsp: dict) -> dict:
    speeds = np.array(arsp.get("airspeed", []))
    if len(speeds) == 0:
        return {"avg": None, "max": None}
    return {
        "avg": round(float(np.mean(speeds)), 2),
        "max": round(float(np.max(speeds)), 2),
    }


def compute_altitude_stats(baro: dict) -> dict:
    alts = np.array(baro.get("alt", []))
    if len(alts) == 0:
        return {"max": None, "min": None, "climb_rate_max": None, "descent_rate_max": None}

    times = np.array(baro.get("time_s", []))
    result = {
        "max": round(float(np.max(alts)), 2),
        "min": round(float(np.min(alts)), 2),
        "climb_rate_max": None,
        "descent_rate_max": None,
    }

    if len(times) >= 2:
        try:
            dt = np.diff(times)
            dalt = np.diff(alts)
            rates = np.where(dt > 0, dalt / dt, 0.0)
            result["climb_rate_max"] = round(float(np.max(rates)), 2)
            result["descent_rate_max"] = round(float(np.min(rates)), 2)
        except Exception as e:
            log.warning(f"Climb rate computation failed: {e}")

    return result


def compute_battery_stats(bat: dict) -> dict:
    volts = np.array(bat.get("volt", []))
    currs = np.array(bat.get("curr", []))
    result = {"max_current": None, "min_voltage": None}
    if len(volts) > 0:
        result["min_voltage"] = round(float(np.min(volts)), 3)
    if len(currs) > 0:
        result["max_current"] = round(float(np.max(currs)), 2)
    return result


def compute_glide_ratio(bat: dict, gps: dict, baro: dict) -> Optional[float]:
    """
    Detect motor-off phases (current ≈ 0) and compute best glide ratio
    as horizontal distance / altitude lost over those phases.
    """
    bat_times = np.array(bat.get("time_s", []))
    bat_currs = np.array(bat.get("curr", []))
    gps_times = np.array(gps.get("time_s", []))
    gps_lats = np.array(gps.get("lat", []))
    gps_lngs = np.array(gps.get("lng", []))
    baro_times = np.array(baro.get("time_s", []))
    baro_alts = np.array(baro.get("alt", []))

    if len(bat_times) == 0 or len(gps_times) == 0 or len(baro_times) == 0:
        return None

    # Find motor-off segments (current below threshold for >= 5 seconds)
    motor_off = bat_currs < MOTOR_OFF_CURRENT_THRESHOLD
    if not np.any(motor_off):
        return None

    best_glide = 0.0
    in_segment = False
    seg_start = 0

    for i, off in enumerate(motor_off):
        if off and not in_segment:
            in_segment = True
            seg_start = i
        elif not off and in_segment:
            in_segment = False
            seg_end = i
            dur = bat_times[seg_end - 1] - bat_times[seg_start]
            if dur < 5.0:
                continue

            t_start = bat_times[seg_start]
            t_end = bat_times[seg_end - 1]

            # Interpolate GPS positions at segment boundaries
            try:
                lat_start = float(np.interp(t_start, gps_times, gps_lats))
                lng_start = float(np.interp(t_start, gps_times, gps_lngs))
                lat_end = float(np.interp(t_end, gps_times, gps_lats))
                lng_end = float(np.interp(t_end, gps_times, gps_lngs))
                alt_start = float(np.interp(t_start, baro_times, baro_alts))
                alt_end = float(np.interp(t_end, baro_times, baro_alts))

                horiz_km = haversine_distance_km(lat_start, lng_start, lat_end, lng_end)
                alt_lost_m = alt_start - alt_end
                if alt_lost_m > 2.0 and horiz_km > 0.01:
                    glide = (horiz_km * 1000) / alt_lost_m
                    best_glide = max(best_glide, glide)
            except Exception as e:
                log.warning(f"Glide ratio segment failed: {e}")

    return round(best_glide, 2) if best_glide > 0 else None


def compute_vibe_health(vibe: dict) -> str:
    """Return 'ok', 'warn', or 'bad' based on vibration levels."""
    all_vibes = (
        vibe.get("vibe_x", []) + vibe.get("vibe_y", []) + vibe.get("vibe_z", [])
    )
    if not all_vibes:
        return "unknown"
    max_vibe = max(abs(v) for v in all_vibes)
    if max_vibe >= VIBE_BAD:
        return "bad"
    if max_vibe >= VIBE_WARN:
        return "warn"
    return "ok"


def compute_all(parsed: dict) -> dict:
    """
    Compute all derived metrics from a parsed log dict.
    Returns a flat dict of metric name → value (None if unavailable).
    """
    ts = parsed.get("timeseries", {})
    events = parsed.get("events", [])

    bat = ts.get("bat", {})
    gps = ts.get("gps", {})
    arsp = ts.get("arsp", {})
    baro = ts.get("baro", {})
    vibe = ts.get("vibe", {})

    distance = compute_total_distance(gps)
    duration = compute_duration_min(events, ts)
    energy = compute_energy_wh(bat)
    airspeed_stats = compute_airspeed_stats(arsp)
    alt_stats = compute_altitude_stats(baro)
    bat_stats = compute_battery_stats(bat)
    glide = compute_glide_ratio(bat, gps, baro)
    vibe_health = compute_vibe_health(vibe)

    efficiency_wh_per_km = None
    if energy and distance and distance > 0:
        efficiency_wh_per_km = round(energy / distance, 3)

    efficiency_wh_per_min = None
    if energy and duration and duration > 0:
        efficiency_wh_per_min = round(energy / duration, 3)

    return {
        "total_distance_km": distance,
        "duration_min": duration,
        "energy_wh": energy,
        "efficiency_wh_per_km": efficiency_wh_per_km,
        "efficiency_wh_per_min": efficiency_wh_per_min,
        "avg_airspeed_ms": airspeed_stats["avg"],
        "max_airspeed_ms": airspeed_stats["max"],
        "max_altitude_m": alt_stats["max"],
        "min_altitude_m": alt_stats["min"],
        "climb_rate_max_ms": alt_stats["climb_rate_max"],
        "descent_rate_max_ms": alt_stats["descent_rate_max"],
        "max_current_a": bat_stats["max_current"],
        "min_voltage_v": bat_stats["min_voltage"],
        "glide_ratio": glide,
        "vibe_health": vibe_health,
    }
