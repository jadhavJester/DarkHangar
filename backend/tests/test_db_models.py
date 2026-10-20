"""CRUD tests for db/models.py against a throwaway SQLite database.

db.database.get_db_path is monkeypatched to a temp file so the real
backend/data/dark_hangar.db is never touched.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import db.database as database  # noqa: E402
import db.models as models  # noqa: E402


@pytest.fixture()
def temp_db(tmp_path, monkeypatch):
    db_file = tmp_path / "test.db"
    monkeypatch.setattr(database, "get_db_path", lambda: str(db_file))
    database.init_db()
    return db_file


def flight_payload(**overrides):
    data = {
        "filename": "flight1.BIN",
        "log_date": "2026-10-20",
        "duration_min": 12.5,
        "total_distance_km": 3.21,
        "energy_wh": 42.0,
        "vibe_health": "ok",
        "has_gps": 1,
        "has_battery": 1,
        "has_airspeed": 0,
        "timeseries_path": "timeseries/flight1.json",
    }
    data.update(overrides)
    return data


def test_insert_and_get_flight(temp_db):
    fid = models.insert_flight(flight_payload())
    assert isinstance(fid, int) and fid > 0
    row = models.get_flight(fid)
    assert row["filename"] == "flight1.BIN"
    assert row["duration_min"] == 12.5
    assert row["vibe_health"] == "ok"
    assert models.get_flight(999999) is None


def test_get_all_flights_and_events(temp_db):
    fid = models.insert_flight(flight_payload())
    models.insert_flight(flight_payload(filename="flight2.BIN"))
    assert len(models.get_all_flights()) == 2

    models.insert_events(fid, [
        {"time_us": 1_000_000, "event_type": "ARM", "value": {"armed": True}},
        {"time_us": 2_000_000, "event_type": "MODE", "value": {"mode": "AUTO"}},
    ])
    models.insert_events(fid, [])  # no-op, must not raise
    row = models.get_flight(fid)
    events = row.get("events") or []
    assert len(events) == 2
    assert events[0]["event_type"] == "ARM"


def test_update_notes_and_delete(temp_db):
    fid = models.insert_flight(flight_payload())
    assert models.update_flight_notes(fid, "evening test flight") is True
    assert models.get_flight(fid)["notes"] == "evening test flight"
    assert models.update_flight_notes(999999, "ghost") is False

    assert models.delete_flight(fid) is True
    assert models.get_flight(fid) is None
    assert models.delete_flight(fid) is False
