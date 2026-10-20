"""Tests for backend/parser/derived_metrics.py — flight-log derived metrics.

Loaded by file path so the tests do not depend on the parser package's
__init__ (which pulls in the DataFlash binary parser dependencies).
"""

import importlib.util
import math
from pathlib import Path

import pytest

_spec = importlib.util.spec_from_file_location(
    "derived_metrics",
    Path(__file__).resolve().parents[1] / "parser" / "derived_metrics.py")
dm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dm)


def test_haversine_zero_and_known_distances():
    assert dm.haversine_distance_km(28.6, 77.2, 28.6, 77.2) == 0.0
    # One degree of longitude on the equator = 2*pi*R/360
    assert dm.haversine_distance_km(0, 0, 0, 1) == pytest.approx(111.195, abs=0.01)
    # Delhi -> Mumbai is roughly 1,148 km great-circle
    assert dm.haversine_distance_km(28.6139, 77.2090, 19.0760, 72.8777) == \
        pytest.approx(1148, abs=15)


def test_total_distance_accumulates_segments():
    assert dm.compute_total_distance({"lat": [], "lng": []}) is None
    assert dm.compute_total_distance({"lat": [0.0], "lng": [0.0]}) is None
    gps = {"lat": [0.0, 0.0, 0.0], "lng": [0.0, 1.0, 2.0]}
    assert dm.compute_total_distance(gps) == pytest.approx(222.39, abs=0.02)


def test_duration_prefers_arm_events():
    events = [
        {"event_type": "ARM", "time_us": 60_000_000, "value": {"armed": True}},
        {"event_type": "ARM", "time_us": 660_000_000, "value": {"armed": False}},
    ]
    assert dm.compute_duration_min(events, {}) == 10.0


def test_duration_falls_back_to_gps_and_handles_empty():
    ts = {"gps": {"time_s": [100.0, 700.0]}}
    assert dm.compute_duration_min([], ts) == 10.0
    assert dm.compute_duration_min([], {}) is None


def test_energy_wh_constant_power():
    # 10 V x 2 A held for 3600 s = 20 Wh exactly
    bat = {"time_s": [0, 1800, 3600], "volt": [10, 10, 10],
           "curr": [2, 2, 2], "curr_tot": [0, 1000, 2000]}
    assert dm.compute_energy_wh(bat) == pytest.approx(20.0)


def test_energy_wh_fallback_and_insufficient_data():
    assert dm.compute_energy_wh({"time_s": [0]}) is None
    # Zero current draw -> integration yields 0 -> CurrTot fallback:
    # 1000 mAh x 10 V / 1000 = 10 Wh
    bat = {"time_s": [0, 60], "volt": [10, 10], "curr": [0, 0],
           "curr_tot": [0, 1000]}
    assert dm.compute_energy_wh(bat) == pytest.approx(10.0)
