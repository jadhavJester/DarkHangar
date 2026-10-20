"""Tests for the airspeed / altitude / battery stats in derived_metrics.py."""

import importlib.util
from pathlib import Path

import pytest

_spec = importlib.util.spec_from_file_location(
    "derived_metrics",
    Path(__file__).resolve().parents[1] / "parser" / "derived_metrics.py")
dm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dm)


def test_airspeed_stats_avg_and_max():
    assert dm.compute_airspeed_stats({"airspeed": [10.0, 14.0, 12.0]}) == \
        {"avg": 12.0, "max": 14.0}
    assert dm.compute_airspeed_stats({}) == {"avg": None, "max": None}
    assert dm.compute_airspeed_stats({"airspeed": []}) == \
        {"avg": None, "max": None}


def test_altitude_stats_normalizes_to_ground_and_rates():
    baro = {"alt": [100.0, 150.0, 130.0], "time_s": [0.0, 10.0, 20.0]}
    out = dm.compute_altitude_stats(baro)
    assert out["max"] == 50.0          # AGL: first reading is ground
    assert out["min"] == 0.0
    assert out["climb_rate_max"] == 5.0    # +50 m in 10 s
    assert out["descent_rate_max"] == -2.0  # -20 m in 10 s


def test_altitude_stats_empty_and_gps_fallback():
    empty = {"max": None, "min": None,
             "climb_rate_max": None, "descent_rate_max": None}
    assert dm.compute_altitude_stats({}) == empty
    out = dm.compute_altitude_stats({}, {"alt": [500.0, 700.0]})
    assert out["max"] == 200.0 and out["min"] == 0.0
    assert out["climb_rate_max"] is None  # no baro timestamps -> no rates


def test_battery_stats_min_voltage_and_max_current():
    bat = {"volt": [16.8, 15.9, 16.1], "curr": [2.0, 22.5, 10.0]}
    assert dm.compute_battery_stats(bat) == \
        {"max_current": 22.5, "min_voltage": 15.9}
    assert dm.compute_battery_stats({}) == \
        {"max_current": None, "min_voltage": None}
    assert dm.compute_battery_stats({"volt": [12.0]}) == \
        {"max_current": None, "min_voltage": 12.0}
