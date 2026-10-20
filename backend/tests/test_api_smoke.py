"""Smoke tests for the FastAPI app (no frontend build present).

Without a built frontend in backend/static, GET / serves the API health
JSON; the OpenAPI schema must expose the app identity. These tests guard
that the app still boots and routes after parser/api changes.
"""

import sys
from pathlib import Path

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("multipart")  # upload routes need python-multipart

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402


def test_health_endpoint_when_no_frontend_build():
    if (Path(main.__file__).parent / "static").is_dir():
        pytest.skip("frontend build present; / serves the SPA instead")
    client = TestClient(main.app)
    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "API online"
    assert body["version"] == "2.0.0"


def test_openapi_identity_and_routes():
    client = TestClient(main.app)
    spec = client.get("/openapi.json")
    assert spec.status_code == 200
    assert spec.json()["info"]["title"] == "DarkHangar V2"
    paths = spec.json()["paths"]
    assert any("upload" in p for p in paths)
    assert any("flights" in p for p in paths)
