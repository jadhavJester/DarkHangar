"""Integration tests for derived_metrics.compute_all."""

import importlib.util
from pathlib import Path

import pytest

_spec = importlib.util.spec_from_file_location(
    "derived_metrics",
    Path(__file__).resolve().parents[1] / "parser" / "derived_metrics.py")
dm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dm)


def sample_parsed():
    return {
        "timeseries": {
            "gps": {"lat": [0.0, 0.0], "lng": [0.0, 0.01],
                    "time_s": [0, 600], "alt": [0, 0]},
            "bat": {"time_s": [0, 3600], "volt": [10, 10],
                    "curr": [2, 2], "curr_tot": [0, 2000]},
            "arsp": {"airspeed": [10.0, 14.0]},
            "baro": {"alt": [100.0, 150.0], "time_s": [0, 3600]},
            "vibe": {"vibe_x": [1.0, 2.0], "vibe_y": [0.0], "vibe_z": [0.0]},
        },
        "events": [],
    }


def test_compute_all_nested_layout():
    out = dm.compute_all(sample_parsed())
    assert out["total_distance_km"] == pytest.approx(1.112, abs=0.001)
    assert out["duration_min"] == 10.0        # GPS time-range fallback
    assert out["energy_wh"] == pytest.approx(20.0)
    assert out["efficiency_wh_per_km"] == pytest.approx(17.986, abs=0.01)
    assert out["efficiency_wh_per_min"] == pytest.approx(2.0)
    assert out["avg_airspeed_ms"] == 12.0 and out["max_airspeed_ms"] == 14.0
    assert out["max_altitude_m"] == 50.0 and out["min_altitude_m"] == 0.0
    assert out["max_current_a"] == 2 and out["min_voltage_v"] == 10.0
    assert out["glide_ratio"] is None        # motor never off
    assert out["vibe_health"] == "ok"


def test_compute_all_flat_layout_and_empty_input():
    flat = sample_parsed()["timeseries"]
    out = dm.compute_all(flat)
    assert out["total_distance_km"] == pytest.approx(1.112, abs=0.001)

    empty = dm.compute_all({})
    assert empty["total_distance_km"] is None
    assert empty["duration_min"] is None
    assert empty["energy_wh"] is None
    assert empty["efficiency_wh_per_km"] is None
    assert empty["avg_airspeed_ms"] is None
    assert empty["vibe_health"] == "unknown"
