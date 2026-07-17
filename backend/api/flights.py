"""
GET /flights, GET /flights/{id}, GET /flights/{id}/track, DELETE, PATCH /notes
"""
import json
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

from db.models import get_all_flights, get_flight, delete_flight, update_flight_notes
from parser.export_helper import generate_mat_export, generate_pdf_report

router = APIRouter(prefix="/flights", tags=["flights"])

from db.database import get_data_dir

TIMESERIES_DIR = os.path.join(get_data_dir(), "timeseries")


class NotesUpdate(BaseModel):
    notes: Optional[str] = None


@router.get("")
def list_flights():
    """Return all flights with summary metrics (no timeseries)."""
    flights = get_all_flights()
    return {"flights": flights, "count": len(flights)}


@router.get("/{flight_id}")
def get_flight_detail(flight_id: int):
    """Return full flight detail including events. Timeseries served separately."""
    flight = get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found.")
    return flight


@router.get("/{flight_id}/timeseries")
def get_flight_timeseries(flight_id: int):
    """Return the raw timeseries data for a flight."""
    flight = get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found.")

    ts_path = flight.get("timeseries_path")
    if not ts_path:
        raise HTTPException(status_code=404, detail="No timeseries data available for this flight.")

    full_path = os.path.join(get_data_dir(), ts_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Timeseries file not found on disk.")

    with open(full_path) as f:
        return json.load(f)


@router.get("/{flight_id}/track")
def get_flight_track(flight_id: int):
    """Return GPS lat/lng/alt/speed arrays for the 2D/3D map."""
    flight = get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found.")

    ts_path = flight.get("timeseries_path")
    if not ts_path:
        return {"points": [], "available": False}

    full_path = os.path.join(get_data_dir(), ts_path)
    if not os.path.exists(full_path):
        return {"points": [], "available": False}

    with open(full_path) as f:
        ts = json.load(f)

    gps = ts.get("gps", {})
    times = gps.get("time_s", [])
    lats = gps.get("lat", [])
    lngs = gps.get("lng", [])
    alts = gps.get("alt", [])
    spds = gps.get("spd", [])

    points = [
        {
            "t": times[i],
            "lat": lats[i],
            "lng": lngs[i],
            "alt": alts[i] if i < len(alts) else None,
            "spd": spds[i] if i < len(spds) else None,
        }
        for i in range(len(lats))
    ]

    return {"points": points, "available": True, "count": len(points)}


@router.delete("/{flight_id}")
def remove_flight(flight_id: int):
    """Delete a flight record and its timeseries file."""
    flight = get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found.")

    # Delete timeseries file
    ts_path = flight.get("timeseries_path")
    if ts_path:
        full_path = os.path.join(get_data_dir(), ts_path)
        try:
            if os.path.exists(full_path):
                os.unlink(full_path)
        except Exception:
            pass

    deleted = delete_flight(flight_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete flight.")
    return {"deleted": True, "id": flight_id}


@router.patch("/{flight_id}/notes")
def patch_notes(flight_id: int, body: NotesUpdate):
    """Update the user notes for a flight."""
    flight = get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found.")
    update_flight_notes(flight_id, body.notes or "")
    return {"updated": True, "id": flight_id, "notes": body.notes}


@router.get("/{flight_id}/export/mat")
def export_mat_file(flight_id: int):
    """Generate and return a MATLAB-compatible .mat telemetry file."""
    flight = get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found.")

    ts_path = flight.get("timeseries_path")
    if not ts_path:
        raise HTTPException(status_code=404, detail="No timeseries data available for this flight.")

    full_path = os.path.join(get_data_dir(), ts_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Timeseries file not found on disk.")

    with open(full_path) as f:
        ts_data = json.load(f)

    # Generate .mat file
    try:
        mat_path = generate_mat_export(ts_data)
        safe_filename = flight["filename"].lower().replace(".bin", "") + "_telemetry.mat"
        return FileResponse(
            path=mat_path,
            filename=safe_filename,
            media_type="application/octet-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate MATLAB file: {e}")


@router.get("/{flight_id}/export/pdf")
def export_pdf_report(flight_id: int):
    """Generate and return a beautifully themed MATLAB-style PDF report."""
    flight = get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found.")

    ts_path = flight.get("timeseries_path")
    if not ts_path:
        raise HTTPException(status_code=404, detail="No timeseries data available for this flight.")

    full_path = os.path.join(get_data_dir(), ts_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Timeseries file not found on disk.")

    with open(full_path) as f:
        ts_data = json.load(f)

    # Generate PDF
    try:
        pdf_path = generate_pdf_report(flight, ts_data)
        safe_filename = flight["filename"].lower().replace(".bin", "") + "_report.pdf"
        return FileResponse(
            path=pdf_path,
            filename=safe_filename,
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {e}")
