"""Tests for backend/parser/bin_parser.py helpers.

parse_bin_log itself needs real ArduPilot .BIN files (pymavlink); the
value-conversion helper it applies to every field is pure and is pinned
here. Loaded by file path to avoid the parser package __init__.
"""

import importlib.util
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "bin_parser",
    Path(__file__).resolve().parents[1] / "parser" / "bin_parser.py")
bp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bp)


def test_safe_float_converts_numbers_and_numeric_strings():
    assert bp._safe_float(3) == 3.0
    assert bp._safe_float(2.5) == 2.5
    assert bp._safe_float("2.5") == 2.5
    assert bp._safe_float(" -1.25 ") == -1.25


def test_safe_float_returns_none_for_unconvertible_values():
    assert bp._safe_float(None) is None
    assert bp._safe_float("not-a-number") is None
    assert bp._safe_float("") is None
    assert bp._safe_float([1.0]) is None
    assert bp._safe_float({"x": 1}) is None
