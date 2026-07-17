"""
POST /flights/scan-folder — Batch import all .BIN files from a folder.
Skips files already imported (matched by filename).
"""
import os
import json
import tempfile
import logging
import traceback
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from parser.bin_parser import parse_bin_log
from parser.derived_metrics import compute_all
from db.models import insert_flight, insert_events, get_all_flights
from db.database import db_session

log = logging.getLogger("dark_hangar.scan")

router = APIRouter(prefix="/flights", tags=["scan"])

TIMESERIES_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "timeseries")


class ScanFolderRequest(BaseModel):
    folder_path: str
    skip_existing: bool = True  # skip files already in DB by filename


class FileResult(BaseModel):
    filename: str
    status: str        # "imported" | "skipped" | "error"
    flight_id: Optional[int] = None
    message: Optional[str] = None
    metrics: Optional[dict] = None


@router.post("/scan-folder")
def scan_folder(req: ScanFolderRequest):
    """
    Scan a folder for .BIN files and import any that haven't been imported yet.
    Returns a summary of imported, skipped, and errored files.
    """
    folder = req.folder_path.strip()

    if not os.path.isdir(folder):
        return {
            "error": f"Folder not found: {folder}",
            "results": [],
            "summary": {"imported": 0, "skipped": 0, "errors": 1},
        }

    # Find all .BIN files, sorted by name
    bin_files = sorted([
        f for f in os.listdir(folder)
        if f.upper().endswith(".BIN")
    ])

    if not bin_files:
        return {
            "error": None,
            "results": [],
            "summary": {"imported": 0, "skipped": 0, "errors": 0},
            "message": "No .BIN files found in folder.",
        }

    # Build set of already-imported filenames for deduplication
    existing_filenames = set()
    if req.skip_existing:
        existing = get_all_flights()
        existing_filenames = {f["filename"] for f in existing}

    results = []
    os.makedirs(TIMESERIES_DIR, exist_ok=True)

    for fname in bin_files:
        fpath = os.path.join(folder, fname)

        # Skip if already imported
        if req.skip_existing and fname in existing_filenames:
            results.append(FileResult(
                filename=fname,
                status="skipped",
                message="Already imported",
            ))
            log.info(f"[SKIP] {fname} — already in DB")
            continue

        log.info(f"[IMPORT] {fname} ({os.path.getsize(fpath)//1024} KB)…")

        try:
            parsed = parse_bin_log(fpath)
            meta    = parsed.get("meta", {})
            events  = parsed.get("events", [])
            warnings = parsed.get("errors", [])

            metrics = compute_all(parsed)

            # Build timeseries JSON
            ts_data = {}
            for key, series in parsed.get("timeseries", {}).items():
                if series.get("time_s"):
                    ts_data[key] = series

            # Derived power series
            bat = parsed.get("timeseries", {}).get("bat", {})
            if bat.get("volt") and bat.get("curr"):
                import numpy as np
                volts = np.array(bat["volt"])
                currs = np.array(bat["curr"])
                ts_data["power"] = {
                    "time_s": bat["time_s"],
                    "watts": (volts * currs).tolist(),
                }

            flight_data = {
                "filename": fname,
                "log_date": meta.get("log_date"),
                "has_gps": meta.get("has_gps", False),
                "has_battery": meta.get("has_battery", False),
                "has_airspeed": meta.get("has_airspeed", False),
                **metrics,
                "timeseries_path": None,
            }

            flight_id = insert_flight(flight_data)

            # Save timeseries
            ts_filename = f"{flight_id}.json"
            ts_filepath = os.path.join(TIMESERIES_DIR, ts_filename)
            if ts_data:
                with open(ts_filepath, "w") as f:
                    json.dump(ts_data, f, allow_nan=False)
                ts_path = f"timeseries/{ts_filename}"
                with db_session() as conn:
                    conn.execute(
                        "UPDATE flights SET timeseries_path = ? WHERE id = ?",
                        (ts_path, flight_id),
                    )

            insert_events(flight_id, events)

            results.append(FileResult(
                filename=fname,
                status="imported",
                flight_id=flight_id,
                message=f"OK{' — ' + '; '.join(warnings) if warnings else ''}",
                metrics={k: v for k, v in metrics.items() if v is not None},
            ))
            log.info(f"[OK] {fname} → flight #{flight_id}")

        except Exception as e:
            log.error(f"[ERROR] {fname}: {e}\n{traceback.format_exc()}")
            results.append(FileResult(
                filename=fname,
                status="error",
                message=str(e),
            ))

    imported = sum(1 for r in results if r.status == "imported")
    skipped  = sum(1 for r in results if r.status == "skipped")
    errors   = sum(1 for r in results if r.status == "error")

    log.info(f"Scan complete: {imported} imported, {skipped} skipped, {errors} errors")

    return {
        "error": None,
        "results": [r.model_dump() for r in results],
        "summary": {"imported": imported, "skipped": skipped, "errors": errors},
    }
