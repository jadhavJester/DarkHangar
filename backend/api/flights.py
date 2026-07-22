"""
GET /flights, GET /flights/{id}, GET /flights/{id}/track, DELETE, PATCH /notes
"""
import csv
import io
import json
import logging
import os
import sqlite3
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional

from db.models import get_all_flights, get_flight, delete_flight, update_flight_notes
from parser.export_helper import generate_mat_export, generate_pdf_report
from parser.bin_parser import parse_bin_log
from parser.derived_metrics import compute_all
from db.database import get_db_path, get_data_dir

log = logging.getLogger("flight_analyzer.api")

router = APIRouter(prefix="/flights", tags=["flights"])

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


def _load_timeseries(flight_id: int):
    flight = get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found.")
    ts_path = flight.get("timeseries_path")
    if not ts_path:
        raise HTTPException(status_code=404, detail="No timeseries data for this flight.")
    full_path = os.path.join(get_data_dir(), ts_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Timeseries file not found on disk.")
    with open(full_path) as f:
        return json.load(f), flight


@router.get("/{flight_id}/params")
def get_params(flight_id: int):
    """Return all PARAM key-value pairs from the flight log."""
    ts_data, _ = _load_timeseries(flight_id)
    params = ts_data.get("params", {})
    return {"count": len(params), "params": params}


@router.get("/{flight_id}/messages")
def get_messages(flight_id: int):
    """Return all MSG/ERR text messages from the flight, ordered by time."""
    ts_data, _ = _load_timeseries(flight_id)
    msgs = ts_data.get("messages", [])
    events = ts_data.get("events", [])
    # Include ERR events as messages too
    err_msgs = []
    for ev in events:
        if ev.get("event_type") == "ERR":
            subsys = ev.get("value", {}).get("subsys", "?")
            ecode = ev.get("value", {}).get("ecode", "?")
            err_msgs.append({
                "time_s": round(ev.get("time_us", 0) / 1_000_000, 3),
                "message": f"ERR Subsys={subsys} ECode={ecode}",
                "level": "error",
            })
    combined = sorted(msgs + err_msgs, key=lambda m: m["time_s"])
    return {"count": len(combined), "messages": combined}


@router.post("/{flight_id}/recompute")
def recompute_flight(flight_id: int):
    """Re-compute all summary metrics from stored timeseries (e.g. after altitude normalization changes)."""
    ts_data, flight = _load_timeseries(flight_id)

    log.info(f"Re-computing metrics for flight {flight_id}")
    metrics_map = compute_all(ts_data)
    vibe_health = metrics_map.pop("vibe_health", "unknown")

    with sqlite3.connect(get_db_path()) as conn:
        set_clauses = ", ".join(f"{col} = ?" for col in metrics_map)
        values = list(metrics_map.values())
        values.append(vibe_health)
        values.append(flight_id)

        conn.execute(f"""
            UPDATE flights SET {set_clauses}, vibe_health = ?
            WHERE id = ?
        """, values)
        conn.commit()

    return {"recomputed": True, "id": flight_id, "metrics": metrics_map, "vibe_health": vibe_health}


@router.get("/{flight_id}/export/csv")
def export_csv(flight_id: int):
    """Export timeseries as a CSV file."""
    ts_data, flight = _load_timeseries(flight_id)

    # Flatten all timeseries into columns keyed by series.field
    rows = _flatten_timeseries(ts_data.get("timeseries", {}))
    if not rows:
        raise HTTPException(status_code=400, detail="No timeseries data to export.")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

    safe_name = flight["filename"].lower().replace(".bin", "") + "_telemetry.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


def _flatten_timeseries(ts):
    """Merge all timeseries dicts into a list of flat dicts keyed by time_s."""
    from collections import defaultdict

    # Collect all time points across all series
    all_t = set()
    series_map = {}  # key -> {t: value}
    for series_name, fields in ts.items():
        times = fields.get("time_s", [])
        all_t.update(times)
        for field_name, values in fields.items():
            if field_name == "time_s":
                continue
            key = f"{series_name}.{field_name}"
            d = {}
            for i, t in enumerate(times):
                d[t] = values[i] if i < len(values) else None
            series_map[key] = d

    sorted_t = sorted(all_t)
    rows = []
    for t in sorted_t:
        row = {"time_s": t}
        for key, d in series_map.items():
            row[key] = d.get(t)
        rows.append(row)
    return rows


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


@router.get("/{flight_id}/export/kml")
def export_kml_file(flight_id: int):
    """Generate and return a Google Earth KML file for the 3D trajectory."""
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

    gps = ts_data.get("gps", {})
    lats = gps.get("lat", [])
    lngs = gps.get("lng", [])
    alts = gps.get("alt", [])

    if not lats or not lngs:
        raise HTTPException(status_code=400, detail="Flight does not contain GPS track data.")

    # Build KML
    kml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2">',
        '  <Document>',
        f'    <name>Flight Trajectory - {flight.get("filename", f"Flight {flight_id}")}</name>',
        f'    <description>3D flight path.</description>',
        '    <Style id="flightPathStyle">',
        '      <LineStyle>',
        '        <color>ff00ffff</color> <!-- Yellow (AABBGGRR: ff-00-ff-ff) -->',
        '        <width>4</width>',
        '      </LineStyle>',
        '      <PolyStyle>',
        '        <color>7f00ff00</color> <!-- Translucent green extruded walls -->',
        '      </PolyStyle>',
        '    </Style>',
        '    <Placemark>',
        '      <name>3D Flight Path</name>',
        '      <styleUrl>#flightPathStyle</styleUrl>',
        '      <LineString>',
        '        <extrude>1</extrude>',
        '        <tessellate>1</tessellate>',
        '        <altitudeMode>absolute</altitudeMode>',
        '        <coordinates>'
    ]

    for i in range(len(lats)):
        lat = lats[i]
        lng = lngs[i]
        alt = alts[i] if i < len(alts) else 0.0
        kml_lines.append(f'          {lng},{lat},{alt}')

    kml_lines.extend([
        '        </coordinates>',
        '      </LineString>',
        '    </Placemark>',
        '  </Document>',
        '</kml>'
    ])

    kml_content = "\n".join(kml_lines)
    
    # Save to a temporary file
    temp_dir = os.path.join(get_data_dir(), "temp")
    os.makedirs(temp_dir, exist_ok=True)
    kml_path = os.path.join(temp_dir, f"flight_{flight_id}.kml")
    with open(kml_path, "w", encoding="utf-8") as f:
        f.write(kml_content)

    safe_filename = flight["filename"].lower().replace(".bin", "") + "_trajectory.kml"
    return FileResponse(
        path=kml_path,
        filename=safe_filename,
        media_type="application/vnd.google-earth.kml+xml"
    )
