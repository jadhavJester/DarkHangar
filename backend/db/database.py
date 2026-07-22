"""
SQLite database initialization and connection management.
"""
import os
import sys
import sqlite3
from contextlib import contextmanager

def get_data_dir() -> str:
    if getattr(sys, "frozen", False):
        return os.path.join(os.path.dirname(sys.executable), "data")
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

def get_db_path() -> str:
    return os.path.join(get_data_dir(), "dark_hangar.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db_session():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS flights (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    filename            TEXT NOT NULL,
    uploaded_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    log_date            DATE,
    duration_min        REAL,
    total_distance_km   REAL,
    energy_wh           REAL,
    efficiency_wh_per_km  REAL,
    efficiency_wh_per_min REAL,
    avg_airspeed_ms     REAL,
    max_airspeed_ms     REAL,
    max_altitude_m      REAL,
    min_altitude_m      REAL,
    max_current_a       REAL,
    min_voltage_v       REAL,
    climb_rate_max_ms   REAL,
    descent_rate_max_ms REAL,
    glide_ratio         REAL,
    vibe_health         TEXT DEFAULT 'unknown',
    has_airspeed        BOOLEAN DEFAULT 0,
    has_gps             BOOLEAN DEFAULT 0,
    has_battery         BOOLEAN DEFAULT 0,
    notes               TEXT,
    timeseries_path     TEXT
);

CREATE TABLE IF NOT EXISTS flight_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id   INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    time_us     INTEGER NOT NULL,
    event_type  TEXT NOT NULL,
    value       TEXT
);

CREATE INDEX IF NOT EXISTS idx_flight_events_flight_id ON flight_events(flight_id);
CREATE INDEX IF NOT EXISTS idx_flights_uploaded_at ON flights(uploaded_at DESC);
"""


def init_db():
    """Create tables if they don't exist."""
    os.makedirs(os.path.dirname(get_db_path()), exist_ok=True)
    with db_session() as conn:
        conn.executescript(SCHEMA_SQL)
    print(f"[DB] Initialized at {get_db_path()}")
