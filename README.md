# DarkHangar V2

UAV flight log analyzer for ArduPilot DataFlash `.BIN` files.

## Features

- **Instrument Panel** — live gauges for throttle, speed, altitude, battery, and more
- **Track Map** — OpenStreetMap 2D track with takeoff/landing markers
- **3D Track** — Three.js WebGL globe with altitude
- **Google Earth** — KML track preview in browser
- **Power Chart** — time-series chart with 12 toggleable series
- **Mode Timeline** — visual flight mode events (STABILIZE, RTL, AUTO, etc.)
- **RC Monitor** — animated RCIN/RCOUT channel bars synced to timeline
- **Message Log** — MSG/ERR messages from the flight log with filter
- **Params Browser** — searchable/sortable PARM table
- **Export** — CSV, MAT, PDF, and KML download
- **AGL Normalization** — all altitude values shown as height above ground

## Quick Start (Development)

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Run

**Option A — Dev servers:**

```bat
launch.bat
```

Opens both backend (port 8000) and frontend (port 5173).

**Option B — Desktop app (pywebview):**

```bat
cd backend
python app_launcher.py
```

### Build EXE

```bat
build.bat
```

Output: `distribution\DarkHangarV2.exe`

## Project Structure

```
DarkHangar-v2/
├── backend/
│   ├── api/            # FastAPI endpoints (flights, upload, scan)
│   ├── parser/         # .BIN parser, derived metrics, export helpers
│   ├── db/             # SQLite database layer
│   ├── main.py         # FastAPI app, static file serving, SPA routing
│   ├── app_launcher.py # pywebview desktop launcher
│   ├── DarkHangarV2.spec # PyInstaller build spec
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/ # UI components (PowerChart, RC Monitor, etc.)
│   │   ├── hooks/      # useFlight, useTimeline
│   │   ├── pages/      # Dashboard, Upload
│   │   ├── theme.css   # Light cream glassmorphism CSS
│   │   └── App.jsx     # Router setup
│   ├── vite.config.js
│   └── package.json
├── build.bat           # Build pipeline (frontend → EXE → zip)
├── launch.bat          # Dev launcher
└── .gitignore
```

## Upload

- **Single file**: drag-and-drop or click to select a `.BIN` file
- **Folder scan**: select a directory and it recursively finds all `.BIN` files

## License

Internal use.
