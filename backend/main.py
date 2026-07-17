"""
Dark Hangar — FastAPI entry point.
In desktop app mode this serves the built React frontend as static files.
In dev mode the Vite dev server runs separately on :5173.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from db.database import init_db
from api.upload import router as upload_router
from api.flights import router as flights_router
from api.scan import router as scan_router

import sys

def get_data_dir() -> str:
    if getattr(sys, "frozen", False):
        return os.path.join(os.path.dirname(sys.executable), "data")
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "data"))

BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
DATA_DIR        = get_data_dir()
TIMESERIES_DIR  = os.path.join(DATA_DIR, "timeseries")
STATIC_DIR      = os.path.join(BASE_DIR, "static")   # built React output


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(TIMESERIES_DIR, exist_ok=True)
    init_db()
    yield


app = FastAPI(
    title="Dark Hangar API",
    description="ArduPilot DataFlash .BIN log analyzer",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ───────────────────────────────────────────────────────────────
app.include_router(upload_router)
app.include_router(flights_router)
app.include_router(scan_router)

# ── Timeseries data files ─────────────────────────────────────────────────────
os.makedirs(TIMESERIES_DIR, exist_ok=True)
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")

# ── Serve built React app (desktop / production mode) ────────────────────────
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/")
    def serve_root():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    # Catch-all: serve index.html for any path React Router handles
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Return static file if it exists, otherwise serve index.html (SPA routing)
        candidate = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
else:
    @app.get("/")
    def health():
        return {"status": "Dark Hangar API online", "version": "1.0.0",
                "note": "Run 'npm run build' in frontend/ to enable the UI"}
