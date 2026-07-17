import sys, os, collections
sys.path.insert(0, os.path.dirname(__file__))
from pymavlink import DFReader

LOG_DIR = r"D:\SILVER Wing LOGS\APM\LOGS"
files = sorted([f for f in os.listdir(LOG_DIR) if f.endswith('.BIN')])

KEY = ['BAT','GPS','ARSP','BARO','ATT','CTUN','VIBE','MODE','ARM','RCIN','RCOU','WIND','IMU']

print(f"{'FILE':<18} {'KB':>5}  {'GPS':>5}  {'VOLT RANGE':>12}  {'MAX A':>6}  {'MESSAGES PRESENT'}")
print("-" * 100)

for fname in files:
    fpath = os.path.join(LOG_DIR, fname)
    size_kb = os.path.getsize(fpath) // 1024
    try:
        mlog = DFReader.DFReader_binary(fpath, zero_time_base=True)
        types = collections.Counter()
        bat_v, bat_c, gps_pts = [], [], 0
        while True:
            msg = mlog.recv_match(blocking=False)
            if msg is None:
                break
            t = msg.get_type()
            types[t] += 1
            if t == 'BAT':
                v = getattr(msg, 'Volt', None)
                c = getattr(msg, 'Curr', None)
                if v: bat_v.append(v)
                if c: bat_c.append(c)
            if t == 'GPS':
                la = getattr(msg, 'Lat', 0)
                if la != 0:
                    gps_pts += 1

        present = " ".join([t for t in KEY if t in types])
        vrange = f"{min(bat_v):.1f}-{max(bat_v):.1f}V" if bat_v else "no BAT"
        cmax   = f"{max(bat_c):.0f}A" if bat_c else "---"
        print(f"{fname:<18} {size_kb:>5}  {gps_pts:>5}  {vrange:>12}  {cmax:>6}  {present}")
    except Exception as e:
        print(f"{fname:<18} ERROR: {e}")
