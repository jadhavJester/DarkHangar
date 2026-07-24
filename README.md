# DarkHangar V2

**ArduPilot DataFlight Log Analyzer** — a desktop application for parsing, visualizing, and exporting UAV flight telemetry from ArduPilot DataFlash `.BIN` files.

Built with a FastAPI backend, React/Vite frontend, and packaged as a standalone Windows executable via PyInstaller.

---

## Features

### Instrument Panel Dashboard

- **Analog Gauges** — real-time canvas-rendered radial gauges for airspeed, altitude (AGL), and battery voltage with red/green zone indicators
- **Summary Stats** — distance, duration, energy consumption, efficiency (Wh/km), max/avg airspeed, max altitude, max current, min voltage, glide ratio
- **Power Chart** — multi-series time-series chart with 12 toggleable series, flight mode event markers, dual Y-axes, and data downsampling for performance
- **Chart Series Selector** — toggle altitude, power, airspeed, voltage, GPS speed, throttle, climb rate, roll, pitch, current, wind speed, and GPS altitude
- **Timeline Scrubber** — scrub through the flight with play/pause at 60x speed, colored mode event chips above the slider

### Maps

- **2D Track Map** — Leaflet map with altitude-colored track segments, green start marker, gold moving marker synced to timeline
- **3D Globe** — CesiumJS 3D visualization with extruded walls from flight path to ground
- **Google Earth** — satellite imagery with GEE-rendered flight path overlay (requires Google sign-in)

### Data Inspection

- **RC Monitor** — animated 4-channel RC input/output bars (AIL, ELE, THR, RUD) with PWM values synced to timeline
- **Message Log** — scrollable, filterable list of MSG and ERR messages from the flight log with time display
- **Params Browser** — searchable, sortable table of all PARM key-value pairs

### Multi-Flight Analysis

- **Flight History** — scrollable card list with summary stats and vibe health badges
- **Trend Charts** — compare efficiency, distance, duration, energy, and max airspeed across all flights

### Export

| Format | Description | Dependencies |
|--------|-------------|--------------|
| **CSV** | Flat merged timeseries with `series.field` columns | None |
| **KML** | Google Earth 3D trajectory with extruded path | None |
| **MAT** | MATLAB binary `.mat` file with per-series variables | scipy |
| **PDF** | Themed 4-panel report (altitude/speed, battery, power/vibration) | matplotlib |

### Parsing

Parses ArduPilot DataFlash `.BIN` logs via `pymavlink.DFReader`. Extracts:

| Message | Data | Fields |
|---------|------|--------|
| BAT / CURR | Battery | voltage, current, total current |
| GPS | Position | lat, lng, alt, ground speed, course |
| ARSP | Airspeed | indicated airspeed |
| BARO | Barometric altitude | altitude |
| ATT | Attitude | roll, pitch, yaw |
| CTUN | Control tuning | throttle output, nav pitch/roll |
| RCIN / RCOU | RC channels | ch1-ch4 (aileron, elevator, throttle, rudder) |
| VIBE | IMU vibration | x, y, z axes |
| WIND | Wind estimation | direction, speed |
| PARM | Parameters | all key-value pairs |
| MSG | Text messages | message string |
| MODE / ARM / ERR | Events | flight mode changes, arming, errors |

### Derived Metrics

All computed automatically on upload or recompute:

- Total distance (haversine), duration, energy (numpy trapz integration)
- Efficiency (Wh/km, Wh/min), airspeed stats (avg, max)
- Altitude stats (max, min, normalized to AGL), climb/descent rates
- Battery stats (max current, min voltage), glide ratio (motor-off detection)
- Vibration health rating (ok / warn / bad)

---

## Architecture

```
DarkHangar-v2/
├── backend/
│   ├── api/
│   │   ├── flights.py        # Flight CRUD, export endpoints, recompute
│   │   ├── upload.py         # Single file upload + parse
│   │   └── scan.py           # Batch folder import
│   ├── parser/
│   │   ├── bin_parser.py     # ArduPilot .BIN parser via pymavlink
│   │   ├── derived_metrics.py # Computed flight statistics
│   │   └── export_helper.py  # MAT/PDF export (lazy-loaded)
│   ├── db/
│   │   ├── database.py       # SQLite schema, init, path helpers
│   │   └── models.py         # CRUD queries
│   ├── main.py               # FastAPI app, static serving, SPA routing
│   ├── app_launcher.py       # pywebview desktop launcher
│   ├── DarkHangarV2.spec     # PyInstaller build spec
│   ├── requirements.txt
│   └── data/                 # User data (gitignored)
│       ├── timeseries/       # Parsed flight JSON files
│       └── dark_hangar.db    # SQLite database
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components (14 total)
│   │   ├── pages/            # Dashboard, History, Upload, Styleguide
│   │   ├── hooks/            # useFlight, useTimeline
│   │   ├── theme.css         # Light cream glassmorphism theme
│   │   └── App.jsx           # Router
│   ├── vite.config.js        # Builds to ../backend/static
│   └── package.json
├── build.bat                 # Full build pipeline (frontend + PyInstaller)
├── launch.bat                # Dev mode launcher
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Development Mode

```bat
launch.bat
```

Starts the backend API on `http://localhost:8000` and the Vite dev server on `http://localhost:5173` with hot reload.

### Desktop App (pywebview)

```bat
cd backend
python app_launcher.py
```

Opens a native OS window with the full application.

### Build Standalone EXE

```bat
build.bat
```

Builds the frontend, installs dependencies, runs PyInstaller, and creates a distribution folder at `distribution\DarkHangarV2\`. The full build takes ~10 minutes.

Output size breakdown:
- ~258 MB folder-mode build (console=false)
- Includes: Python 3.12, FastAPI, uvicorn, pymavlink, numpy, SQLAlchemy, pywebview, React frontend
- Excludes from standalone: scipy, matplotlib (PDF/MAT export unavailable; CSV/KML work)

---

## API Reference

### Flights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/flights` | List all flights with summary metrics |
| GET | `/flights/{id}` | Get flight detail with events |
| GET | `/flights/{id}/timeseries` | Raw timeseries JSON |
| GET | `/flights/{id}/track` | GPS points for map rendering |
| GET | `/flights/{id}/params` | All PARM key-value pairs |
| GET | `/flights/{id}/messages` | MSG/ERR messages sorted by time |
| DELETE | `/flights/{id}` | Delete flight and timeseries file |
| PATCH | `/flights/{id}/notes` | Update flight notes |
| POST | `/flights/{id}/recompute` | Re-derive all metrics from timeseries |
| GET | `/flights/{id}/export/csv` | Download as CSV |
| GET | `/flights/{id}/export/mat` | Download as MATLAB .mat |
| GET | `/flights/{id}/export/pdf` | Download as themed PDF report |
| GET | `/flights/{id}/export/kml` | Download as Google Earth KML |

### Upload & Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/flights/upload` | Upload a single `.BIN` file |
| POST | `/flights/scan-folder` | Batch import all `.BIN` files from a directory |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.12, FastAPI, uvicorn |
| Parsing | pymavlink (DFReader) |
| Database | SQLite (via stdlib sqlite3) |
| Numerical | numpy |
| Frontend | React 19, Vite 8, Tailwind CSS |
| Charts | Recharts 3 |
| Gauges | canvas-gauges |
| Maps | Leaflet (2D), CesiumJS (3D) |
| Desktop | pywebview (EdgeChromium on Windows) |
| Packaging | PyInstaller 6 |

---

## Visual Theme

Light cream glassmorphism UI with:
- Warm parchment background (`#f5efe3`)
- Frosted glass panels with `backdrop-filter: blur(18px)`
- Dark goldenrod accent (`#b8860b`) with ambient glow effects
- Space Grotesk + JetBrains Mono typography
- Animated floating ambient orbs
- Custom gold-themed scrollbars, sliders, and resize handles

---

## License

Internal use.
