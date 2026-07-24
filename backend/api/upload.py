"""
POST /flights/upload — .BIN log upload, parse, and store.
"""
import os
import json
import tempfile
import logging
import traceback

from fastapi import APIRouter, UploadFile, File, HTTPException

from parser.bin_parser import parse_bin_log
from parser.derived_metrics import compute_all
from db.models import insert_flight, insert_events

log = logging.getLogger("flight_analyzer.upload")

router = APIRouter(prefix="/flights", tags=["upload"])

from db.database import get_data_dir

TIMESERIES_DIR = os.path.join(get_data_dir(), "timeseries")


@router.post("/upload")
async def upload_flight(file: UploadFile = File(...)):
    """
    Upload a .BIN DataFlash log file.
    Parses it server-side, computes derived metrics, stores in DB.
    Returns the flight summary.
    """
    if not file.filename.lower().endswith(".bin"):
        raise HTTPException(status_code=400, detail="Only .BIN DataFlash log files are supported.")

    # Write upload to a temp file
    suffix = ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        content = await file.read()
        tmp.write(content)

    errors = []
    parsed = None
    metrics = {}

    try:
        parsed = parse_bin_log(tmp_path)
        errors.extend(parsed.get("errors", []))
    except ValueError as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=422, detail=f"Could not parse log: {e}")
    except Exception as e:
        os.unlink(tmp_path)
        log.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal parser error: {e}")
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    meta = parsed.get("meta", {})

    # Validation: warn but don't fail on missing data
    if not meta.get("has_gps"):
        errors.append("No valid GPS data found in log — distance/track unavailable.")
    if not meta.get("has_battery"):
        errors.append("No battery data (BAT/CURR) found — energy metrics unavailable.")

    try:
        metrics = compute_all(parsed)
    except Exception as e:
        log.error(f"Metrics computation error: {e}")
        errors.append(f"Partial metrics computation error: {e}")
        metrics = {}

    # Store timeseries JSON blob
    os.makedirs(TIMESERIES_DIR, exist_ok=True)
    timeseries_path = None

    # Build a compact serializable timeseries
    ts_data = {}
    for key, series in parsed.get("timeseries", {}).items():
        if series.get("time_s"):  # Only store non-empty series
            ts_data[key] = series
    # Also store a derived power series for charts
    bat = parsed.get("timeseries", {}).get("bat", {})
    if bat.get("volt") and bat.get("curr"):
        import numpy as np
        volts = np.array(bat["volt"])
        currs = np.array(bat["curr"])
        ts_data["power"] = {
            "time_s": bat["time_s"],
            "watts": (volts * currs).tolist(),
        }

    # Insert flight record to DB first, then save timeseries with the ID
    flight_data = {
        "filename": file.filename,
        "log_date": meta.get("log_date"),
        "has_gps": meta.get("has_gps", False),
        "has_battery": meta.get("has_battery", False),
        "has_airspeed": meta.get("has_airspeed", False),
        **metrics,
        "timeseries_path": None,  # Will update after we have the ID
    }

    flight_id = insert_flight(flight_data)

    # Save timeseries file
    if ts_data:
        ts_filename = f"{flight_id}.json"
        ts_filepath = os.path.join(TIMESERIES_DIR, ts_filename)
        with open(ts_filepath, "w") as f:
            json.dump(ts_data, f, allow_nan=False)
        timeseries_path = f"timeseries/{ts_filename}"

        # Update the DB row with the timeseries path
        from db.database import db_session
        with db_session() as conn:
            conn.execute(
                "UPDATE flights SET timeseries_path = ? WHERE id = ?",
                (timeseries_path, flight_id),
            )

    # Store events
    insert_events(flight_id, parsed.get("events", []))

    return {
        "id": flight_id,
        "filename": file.filename,
        "metrics": metrics,
        "meta": meta,
        "warnings": errors,
        "timeseries_available": bool(ts_data),
    }
