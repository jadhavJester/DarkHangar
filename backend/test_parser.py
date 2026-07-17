"""
Quick parser test against real SILVER Wing logs.
Run from the backend directory: python test_parser.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from parser.bin_parser import parse_bin_log
from parser.derived_metrics import compute_all

LOG_DIR = r"D:\SILVER Wing LOGS\APM\LOGS"

test_files = [
    "00000001.BIN",
    "00000013.BIN",  # Large: 2.4 MB
    "00000019.BIN",  # Largest: 10.7 MB
]

for fname in test_files:
    fpath = os.path.join(LOG_DIR, fname)
    if not os.path.exists(fpath):
        print(f"[SKIP] {fname} not found")
        continue

    print(f"\n{'='*60}")
    print(f"Testing: {fname}  ({os.path.getsize(fpath)//1024} KB)")
    try:
        parsed = parse_bin_log(fpath)
        ts = parsed["timeseries"]
        meta = parsed["meta"]
        events = parsed["events"]

        print(f"  GPS points:   {len(ts['gps']['time_s'])}")
        print(f"  BAT points:   {len(ts['bat']['time_s'])}")
        print(f"  ARSP points:  {len(ts['arsp']['time_s'])}")
        print(f"  BARO points:  {len(ts['baro']['time_s'])}")
        print(f"  ATT points:   {len(ts['att']['time_s'])}")
        print(f"  VIBE points:  {len(ts['vibe']['time_s'])}")
        print(f"  Events:       {len(events)}")
        print(f"  has_gps:      {meta['has_gps']}")
        print(f"  has_battery:  {meta['has_battery']}")
        print(f"  has_airspeed: {meta['has_airspeed']}")
        print(f"  log_date:     {meta['log_date']}")
        if parsed["errors"]:
            print(f"  ERRORS: {parsed['errors']}")

        metrics = compute_all(parsed)
        print(f"\n  --- Derived Metrics ---")
        for k, v in metrics.items():
            print(f"  {k:30s}: {v}")

    except Exception as e:
        import traceback
        print(f"  FAILED: {e}")
        traceback.print_exc()
