"""Edge-case tests for derived_metrics.py branches not covered elsewhere:

duration fallbacks when ARM data is incomplete, the energy integration
fallback when series lengths mismatch, and degenerate geometry inputs.
"""

import importlib.util
from pathlib import Path

import pytest

_spec = importlib.util.spec_from_file_location(
    "derived_metrics",
    Path(__file__).resolve().parents[1] / "parser" / "derived_metrics.py")
dm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dm)

GPS_TS = {"gps": {"time_s": [0.0, 900.0]}}  # 15-minute GPS span


def test_duration_arm_without_disarm_falls_back_to_gps():
    events = [{"event_type": "ARM", "time_us": 100_000_000,
               "value": {"armed": True}}]
    assert dm.compute_duration_min(events, GPS_TS) == 15.0


def test_duration_disarm_before_arm_falls_back_to_gps():
    events = [
        {"event_type": "ARM", "time_us": 900_000_000,
         "value": {"armed": True}},
        {"event_type": "ARM", "time_us": 100_000_000,
         "value": {"armed": False}},
    ]
    assert dm.compute_duration_min(events, GPS_TS) == 15.0


def test_duration_ignores_non_arm_events():
    events = [{"event_type": "MODE", "time_us": 5_000_000, "value": {}}]
    assert dm.compute_duration_min(events, GPS_TS) == 15.0
    assert dm.compute_duration_min(events, {}) is None


def test_energy_mismatched_series_uses_currtot_fallback():
    # volts shorter than times/currs: the trapz path raises, the CurrTot
    # fallback must take over: 500 mAh x 10 V / 1000 = 5 Wh.
    bat = {"time_s": [0, 100], "volt": [10], "curr": [2, 2],
           "curr_tot": [0, 500]}
    assert dm.compute_energy_wh(bat) == pytest.approx(5.0)


def test_energy_no_power_and_no_currtot_returns_none():
    bat = {"time_s": [0, 100], "volt": [10, 10], "curr": [0, 0],
           "curr_tot": []}
    assert dm.compute_energy_wh(bat) is None


def test_altitude_single_reading_and_zero_distance():
    out = dm.compute_altitude_stats({"alt": [250.0], "time_s": [0.0]})
    assert out == {"max": 0.0, "min": 0.0,
                   "climb_rate_max": None, "descent_rate_max": None}
    gps = {"lat": [10.0, 10.0], "lng": [20.0, 20.0]}
    assert dm.compute_total_distance(gps) == 0.0
