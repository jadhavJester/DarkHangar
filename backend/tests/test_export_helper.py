"""Tests for parser/export_helper.py MATLAB export.

The .mat writer flattens each message series into <msg>_<field> arrays.
These tests round-trip a generated file through scipy.io.loadmat and
check the flattening plus the None -> NaN cleaning MATLAB requires.
"""

import importlib.util
import math
from pathlib import Path

import pytest

scipy_io = pytest.importorskip("scipy.io")

_spec = importlib.util.spec_from_file_location(
    "export_helper",
    Path(__file__).resolve().parents[1] / "parser" / "export_helper.py")
eh = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(eh)


def test_mat_export_flattens_series_and_cleans_nones(tmp_path):
    ts_data = {
        "gps": {"time_s": [0.0, 1.0], "lat": [51.5, None],
                "lng": [-0.12, -0.13]},
        "no_time": {"lat": [1.0]},  # no time_s -> series is skipped
    }
    path = eh.generate_mat_export(ts_data)
    try:
        assert Path(path).exists() and path.endswith(".mat")
        data = scipy_io.loadmat(path)
        assert "gps_time_s" in data and "gps_lat" in data
        assert "no_time_lat" not in data
        lat = data["gps_lat"].flatten()
        assert lat[0] == pytest.approx(51.5)
        assert math.isnan(lat[1])  # None became NaN
    finally:
        Path(path).unlink(missing_ok=True)


def test_mat_export_empty_input_still_writes_file():
    path = eh.generate_mat_export({})
    try:
        assert Path(path).exists()
    finally:
        Path(path).unlink(missing_ok=True)
