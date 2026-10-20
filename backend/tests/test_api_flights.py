"""API tests for the /flights routes against a throwaway database."""

import sys
from pathlib import Path

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("multipart")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import db.database as database  # noqa: E402
import db.models as models  # noqa: E402


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "api.db"
    monkeypatch.setattr(database, "get_db_path", lambda: str(db_file))
    database.init_db()
    from fastapi.testclient import TestClient
    import main
    return TestClient(main.app)


def test_list_flights_empty_then_populated(client):
    resp = client.get("/flights")
    assert resp.status_code == 200
    assert resp.json() == {"flights": [], "count": 0}

    fid = models.insert_flight({"filename": "api.BIN", "duration_min": 5.0})
    body = client.get("/flights").json()
    assert body["count"] == 1
    assert body["flights"][0]["id"] == fid
    assert body["flights"][0]["filename"] == "api.BIN"


def test_flight_detail_and_404(client):
    fid = models.insert_flight({"filename": "detail.BIN"})
    resp = client.get(f"/flights/{fid}")
    assert resp.status_code == 200
    assert resp.json()["filename"] == "detail.BIN"

    missing = client.get("/flights/424242")
    assert missing.status_code == 404
    assert "not found" in missing.json()["detail"]
