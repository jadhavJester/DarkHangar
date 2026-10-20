"""Tests for vibration health and glide ratio in derived_metrics.py."""

import importlib.util
from pathlib import Path

import pytest

_spec = importlib.util.spec_from_file_location(
    "derived_metrics",
    Path(__file__).resolve().parents[1] / "parser" / "derived_metrics.py")
dm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dm)


def test_vibe_health_thresholds():
    assert dm.compute_vibe_health({}) == "unknown"
    assert dm.compute_vibe_health({"vibe_x": [1.0, -3.0]}) == "ok"
    # Thresholds: >= 15 m/s^2 warns, >= 30 m/s^2 is bad (any axis)
    assert dm.compute_vibe_health({"vibe_y": [15.0]}) == "warn"
    assert dm.compute_vibe_health({"vibe_z": [-29.9]}) == "warn"
    assert dm.compute_vibe_health({"vibe_x": [30.0]}) == "bad"


def _glide_inputs():
    times = list(range(11))
    bat = {"time_s": times,
           "curr": [5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 5]}  # motor off t=2..9
    gps = {"time_s": times, "lat": [0.0] * 11,
           "lng": [i * 0.001 for i in times]}
    baro = {"time_s": times, "alt": [100 - 10 * i for i in times]}
    return bat, gps, baro


def test_glide_ratio_from_motor_off_segment():
    bat, gps, baro = _glide_inputs()
    glide = dm.compute_glide_ratio(bat, gps, baro)
    # Segment t=2..9: ~0.778 km travelled, 70 m lost -> ratio ~11.1
    assert glide == pytest.approx(11.12, abs=0.1)


def test_glide_ratio_none_cases():
    bat, gps, baro = _glide_inputs()
    powered = dict(bat, curr=[5.0] * 11)  # motor never off
    assert dm.compute_glide_ratio(powered, gps, baro) is None
    assert dm.compute_glide_ratio({}, gps, baro) is None
    assert dm.compute_glide_ratio(bat, {}, baro) is None
    short = {"time_s": [0, 1, 2], "curr": [5, 0, 5]}  # 1 s off < 5 s minimum
    assert dm.compute_glide_ratio(short, gps, baro) is None
