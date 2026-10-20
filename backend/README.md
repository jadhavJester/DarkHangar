# DarkHangar Backend

FastAPI service that parses ArduPilot DataFlash `.BIN` flight logs and
serves the analysis to the React frontend.

## Layout

- `main.py` — FastAPI app: CORS, the `/data` static mount, SPA serving
  when a frontend build is present in `static/`, and the API routers.
- `api/` — HTTP routes: `upload.py` (log upload), `flights.py` (parsed
  flight data), `scan.py` (folder scanning).
- `parser/` — the log pipeline:
  - `bin_parser.py` — DataFlash `.BIN` parsing via pymavlink into a
    timeseries dict.
  - `derived_metrics.py` — distance, duration, energy, airspeed/altitude/
    battery stats, glide ratio and vibration health.
  - `export_helper.py` — MATLAB `.mat` export and PDF report generation.
- `db/` — flight metadata storage.
- `app_launcher.py` — desktop launcher entry point (PyInstaller builds
  use `DarkHangarV2.spec`).
- `data/` — runtime data: `temp/` for uploads, `timeseries/` for parsed
  output (contents are git-ignored; `.gitkeep` files hold the folders).

## Run

```bash
pip install -r requirements.txt
uvicorn main:app
```

The API listens on Uvicorn's default port 8000. Without a frontend build,
`GET /` returns a small health JSON; with `static/` present it serves
the built UI instead. The frontend dev server (port 5173) is in the
CORS allow-list.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest
```

The suite in `tests/` covers the parser's value conversion, the derived
metrics (including glide-ratio and vibration-health thresholds), the
`.mat` export round-trip, and API smoke tests.
