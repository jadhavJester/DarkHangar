"""
Data access layer — CRUD helpers for flights and flight_events tables.
"""
import json
from typing import Optional
from db.database import db_session


def insert_flight(data: dict) -> int:
    cols = [
        "filename", "log_date", "duration_min", "total_distance_km",
        "energy_wh", "efficiency_wh_per_km", "efficiency_wh_per_min",
        "avg_airspeed_ms", "max_airspeed_ms", "max_altitude_m", "min_altitude_m",
        "max_current_a", "min_voltage_v", "climb_rate_max_ms", "descent_rate_max_ms",
        "glide_ratio", "vibe_health", "has_airspeed", "has_gps", "has_battery",
        "timeseries_path",
    ]
    placeholders = ", ".join(["?" for _ in cols])
    col_names = ", ".join(cols)
    values = [data.get(c) for c in cols]

    with db_session() as conn:
        cur = conn.execute(
            f"INSERT INTO flights ({col_names}) VALUES ({placeholders})", values
        )
        return cur.lastrowid


def insert_events(flight_id: int, events: list[dict]):
    if not events:
        return
    with db_session() as conn:
        conn.executemany(
            "INSERT INTO flight_events (flight_id, time_us, event_type, value) VALUES (?, ?, ?, ?)",
            [(flight_id, e["time_us"], e["event_type"], json.dumps(e.get("value"))) for e in events],
        )


def get_all_flights() -> list[dict]:
    with db_session() as conn:
        rows = conn.execute(
            "SELECT * FROM flights ORDER BY uploaded_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_flight(flight_id: int) -> Optional[dict]:
    with db_session() as conn:
        row = conn.execute("SELECT * FROM flights WHERE id = ?", (flight_id,)).fetchone()
        if row is None:
            return None
        flight = dict(row)
        events = conn.execute(
            "SELECT * FROM flight_events WHERE flight_id = ? ORDER BY time_us",
            (flight_id,),
        ).fetchall()
        flight["events"] = []
        for e in events:
            evt = dict(e)
            if evt.get("value"):
                try:
                    evt["value"] = json.loads(evt["value"])
                except Exception:
                    pass
            flight["events"].append(evt)
    return flight


def delete_flight(flight_id: int) -> bool:
    with db_session() as conn:
        cur = conn.execute("DELETE FROM flights WHERE id = ?", (flight_id,))
    return cur.rowcount > 0


def update_flight_notes(flight_id: int, notes: str) -> bool:
    with db_session() as conn:
        cur = conn.execute(
            "UPDATE flights SET notes = ? WHERE id = ?", (notes, flight_id)
        )
    return cur.rowcount > 0
