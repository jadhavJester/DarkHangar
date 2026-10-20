"""API tests for POST /flights/scan-folder validation paths.

Only the non-parsing branches are covered here (missing folder, no .BIN
files, unparseable file): real .BIN parsing needs pymavlink fixtures.
"""

import sys
from pathlib import Path

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("multipart")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import db.database as database  # noqa: E402


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "scan.db"
    monkeypatch.setattr(database, "get_db_path", lambda: str(db_file))
    database.init_db()
    from fastapi.testclient import TestClient
    import main
    return TestClient(main.app)


def test_scan_missing_folder_reports_error(client, tmp_path):
    resp = client.post("/flights/scan-folder",
                       json={"folder_path": str(tmp_path / "nope")})
    assert resp.status_code == 200
    body = resp.json()
    assert body["error"].startswith("Folder not found")
    assert body["results"] == []
    assert body["summary"] == {"imported": 0, "skipped": 0, "errors": 1}


def test_scan_folder_without_bin_files(client, tmp_path):
    (tmp_path / "notes.txt").write_text("not a log")
    (tmp_path / "photo.jpg").write_bytes(b"\xff\xd8")
    body = client.post("/flights/scan-folder",
                       json={"folder_path": str(tmp_path)}).json()
    assert body["error"] is None
    assert body["results"] == []
    assert body["summary"] == {"imported": 0, "skipped": 0, "errors": 0}
    assert "No .BIN files" in body["message"]


def test_scan_unparseable_bin_file_reports_file_error(client, tmp_path):
    (tmp_path / "broken.BIN").write_bytes(b"this is not a dataflash log")
    body = client.post("/flights/scan-folder",
                       json={"folder_path": str(tmp_path)}).json()
    assert body["summary"]["errors"] == 1
    assert body["results"][0]["filename"] == "broken.BIN"
    assert body["results"][0]["status"] == "error"
