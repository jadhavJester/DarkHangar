# Flight Log Analyzer — ArduPilot DataFlash Log Viewer

Self-contained desktop application for analyzing ArduPilot DataFlash binary logs (`.BIN`). Features telemetry visualization with 3D globe replay and PDF/KML export.

## Features

- **Log Parsing**: Reads ArduPilot `.BIN` / `.log` files; extracts GPS, BARO, ARSP, POWR, VIBE, BAT, IMU, RC, NTUN, and more.
- **Telemetry Dashboard**: Gauges (airspeed, altitude, voltage), timeline with play button, resizable chart + map split.
- **3D Flight Replay**: Cesium-based globe with terrain and flight path.
- **Flight Statistics**: Distance, duration, energy, efficiency, max/avg speed, max/min altitude, battery health, vibration analysis.
- **PDF Export**: Multi-page analytical summary with charts and metrics.
- **KML Export**: GPS track for Google Earth.
- **Bulk Scan**: Scan directories for `.BIN`/`.log` files and import in one click.
- **Vibration Analysis**: FFT-based spectral analysis from IMU data.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+

### Install

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Run (development)

```bash
# Terminal 1 — backend
cd backend
uvicorn main:app --host 127.0.0.1 --port 8765 --reload

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for production

```bash
cd frontend
npm run build
cd ../backend
uvicorn main:app --host 127.0.0.1 --port 8765
```

Open http://127.0.0.1:8765

### Package as standalone .exe

See `build.py` and `DarkHangar.spec` for PyInstaller configuration.
