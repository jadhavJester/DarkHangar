import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

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
STATIC_DIR      = os.path.join(BASE_DIR, "static")

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(TIMESERIES_DIR, exist_ok=True)
    init_db()
    yield

app = FastAPI(
    title="Flight Log Analyzer",
    description="ArduPilot DataFlash .BIN log analyzer",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(flights_router)
app.include_router(scan_router)

os.makedirs(TIMESERIES_DIR, exist_ok=True)
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")

if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/")
    def serve_root():
        with open(os.path.join(STATIC_DIR, "index.html"), encoding="utf-8") as f:
            return HTMLResponse(f.read(), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        candidate = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(candidate) and not full_path.endswith(".html"):
            return FileResponse(candidate)
        path = os.path.join(STATIC_DIR, "index.html")
        with open(path, encoding="utf-8") as f:
            return HTMLResponse(f.read(), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
else:
    @app.get("/")
    def health():
        return {"status": "API online", "version": "1.0.0",
                "note": "Run 'npm run build' in frontend/ to enable the UI"}
