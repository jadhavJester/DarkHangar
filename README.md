# 🦇 Dark Hangar — UAV Flight Log Analyzer

Dark Hangar is a premium, self-contained **desktop application** designed for analyzing ArduPilot DataFlash binary logs (`.BIN`). The software features a custom retro-noir × glowing aviation dashboard aesthetic, combining modern telemetry visualization with high-fidelity exporting capabilities.

---

## 🚀 Key Features

* **Interactive Instrument Panel**: Real-time animated gauges tracking airspeed, altitude, battery voltage, active current draw, and total power output.
* **Timeline Playback**: Interactive timeline slider allowing users to scrub through the entire flight logs to correlate throttle events (`CTUN`), flight modes (`MODE`), and vehicle arming flags.
* **GPS Ground Track Map**: Interactive dark-themed Leaflet-based map visualizing GPS coordinate plots, speeds, and climb metrics.
* **Themed PDF Flight Reports**: Generates high-resolution multi-page analytical summaries matching the Dark Hangar theme (dark navy pages, gold grids, custom speed/alt profiles, battery health status, and vibration spectral analyses).
* **MATLAB Telemetry Exporter**: Instant flat binary `.mat` exporter utilizing SciPy to allow direct loading of flight coordinates and battery metrics into MATLAB.
* **Persistent History database**: Automatic SQLite persistence of uploaded logs, computed metrics, events, and timeseries data in the local environment.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **App Shell** | `pywebview` (Native OS window rendering) |
| **Backend API** | FastAPI + Uvicorn server (running as a concurrent thread) |
| **Log Parser** | `pymavlink` DataFlash LogReader |
| **Database** | SQLite + SQLAlchemy |
| **Frontend UI** | React + Vite + Vanilla CSS (Custom retro design tokens) |
| **Data Viz** | `canvas-gauges` + `Recharts` + `Leaflet.js` |
| **PDF Generation** | `Matplotlib` (statically bundled) |
| **Data Science Export**| `SciPy` (MATLAB `.mat` exporter) |

---

## ⚙️ Quick Start (Run from Source)

### 1. Prerequisites
Ensure you have **Python 3.10+** and **Node.js 18+** installed.

### 2. Setup Backend Dependencies
```powershell
cd backend
pip install -r requirements.txt
```

### 3. Setup Frontend UI
```powershell
cd frontend
npm install
npm run build
```

### 4. Run the Application
You can run the launcher directly:
```powershell
# Double-click the root launch.bat, or:
cd backend
python app_launcher.py
```
A native OS desktop window will open immediately.

---

## 📦 Distribute & Rebuild

To pack the application into a standalone folder and download package:

1. Double-click **`build.bat`** (or run `./build.bat` in PowerShell).
2. The compiler will:
   * Re-bundle the React SPA assets.
   * Run PyInstaller with the custom dependencies mapped in `DarkHangar.spec`.
   * Automatically sync your local sqlite database and flight telemetry files.
   * Generate the package at `backend/dist/DarkHangar/` and compress it to `backend/dist/DarkHangar.zip`.

### Running the Packaged Executable
Extract **`DarkHangar.zip`** and double-click **`DarkHangar.exe`** inside the folder to run the application. No dependencies, command-lines, or browsers required!
