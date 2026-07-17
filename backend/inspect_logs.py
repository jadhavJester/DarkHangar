"""
Deep inspection of all BIN logs in D:\SILVER Wing LOGS\APM\LOGS\
Reports message types, field names, sample values, and data quality.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from pymavlink import DFReader

LOG_DIR = r"D:\SILVER Wing LOGS\APM\LOGS"

import os, collections

files = sorted([f for f in os.listdir(LOG_DIR) if f.endswith('.BIN')])
print(f"Found {len(files)} BIN files\n")

all_msg_types = collections.Counter()

for fname in files:
    fpath = os.path.join(LOG_DIR, fname)
    size_kb = os.path.getsize(fpath) // 1024
    
    try:
        mlog = DFReader.DFReader_binary(fpath, zero_time_base=True)
    except Exception as e:
        print(f"  [{fname}] CANNOT OPEN: {e}")
        continue

    msg_types   = collections.Counter()
    field_names = {}   # msg_type -> set of field names
    samples     = {}   # msg_type -> first message dict

    count = 0
    while True:
        try:
            msg = mlog.recv_match(blocking=False)
        except Exception:
            break
        if msg is None:
            break
        mtype = msg.get_type()
        if mtype in ('FMT', 'FMTU', 'PARM', 'UNIT', 'MULT', 'MSG'):
            continue
        msg_types[mtype] += 1
        all_msg_types[mtype] += 1
        if mtype not in field_names:
            try:
                fnames = [f for f in msg._fieldnames if f != 'TimeUS']
                field_names[mtype] = fnames
                sample = {f: getattr(msg, f, None) for f in fnames[:6]}
                samples[mtype] = sample
            except Exception:
                field_names[mtype] = []
        count += 1

    # Highlight key types
    key_types = ['BAT','CURR','GPS','ARSP','BARO','ATT','CTUN','RCIN','RCOU',
                 'VIBE','MODE','ARM','ERR','EV','WIND','IMU','NKF1','STAT']
    found_key = [t for t in key_types if t in msg_types]
    missing_key = [t for t in key_types if t not in msg_types]

    print(f"┌─ {fname}  ({size_kb} KB,  {count:,} messages)")
    print(f"│  Key types present : {', '.join(found_key) or 'none'}")
    if missing_key:
        print(f"│  Key types MISSING : {', '.join(missing_key)}")
    
    # Show fields for the most important types
    for t in ['BAT','CURR','GPS','ARSP','BARO','CTUN','VIBE','STAT']:
        if t in field_names and field_names[t]:
            print(f"│  {t:6s} fields: {field_names[t]}")
            print(f"│         sample: {samples.get(t, {})}") 
    
    # Show ALL message types with counts
    top = msg_types.most_common(20)
    print(f"│  All types: {dict(top)}")
    print(f"└{'─'*60}")
    print()

print(f"\n{'='*60}")
print(f"AGGREGATE across all logs:")
print(f"{'='*60}")
for mtype, cnt in all_msg_types.most_common(30):
    print(f"  {mtype:10s}: {cnt:8,}")
