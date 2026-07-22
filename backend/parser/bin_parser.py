"""
ArduPilot DataFlash .BIN log parser using pymavlink DFReader.

Extracts time-series data for all relevant message types and returns a
structured dict suitable for derived metrics computation and JSON storage.
Missing message types are gracefully skipped.
"""
import os
import tempfile
import logging
from typing import Optional

log = logging.getLogger("flight_analyzer.parser")


def _safe_float(v) -> Optional[float]:
    """Convert a value to float, returning None on error."""
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def parse_bin_log(filepath: str) -> dict:
    """
    Parse a DataFlash .BIN log file.

    Returns a dict with:
      - 'timeseries': dict of message-type → {field: [values], time_s: [timestamps]}
      - 'events': list of {time_us, event_type, value}
      - 'meta': {has_gps, has_battery, has_airspeed, log_date}
      - 'errors': list of non-fatal parse warnings
    """
    try:
        from pymavlink import DFReader
    except ImportError as e:
        raise RuntimeError(
            "pymavlink is not installed. Run: pip install pymavlink"
        ) from e

    result = {
        "timeseries": {
            "bat":  {"time_s": [], "volt": [], "curr": [], "curr_tot": []},
            "gps":  {"time_s": [], "lat": [], "lng": [], "alt": [], "spd": [], "gcrs": []},
            "arsp": {"time_s": [], "airspeed": []},
            "baro": {"time_s": [], "alt": []},
            "att":  {"time_s": [], "roll": [], "pitch": [], "yaw": []},
            "ctun": {"time_s": [], "thr_out": [], "nav_pitch": [], "nav_roll": []},
            "rcin": {"time_s": [], "c1": [], "c2": [], "c3": [], "c4": []},
            "rcou": {"time_s": [], "c1": [], "c2": [], "c3": [], "c4": []},
            "vibe": {"time_s": [], "vibe_x": [], "vibe_y": [], "vibe_z": []},
            "wind": {"time_s": [], "direction": [], "speed": []},
        },
        "params": {},
        "messages": [],
        "events": [],
        "meta": {
            "has_gps": False,
            "has_battery": False,
            "has_airspeed": False,
            "log_date": None,
        },
        "errors": [],
    }

    ts = result["timeseries"]
    events = result["events"]
    meta = result["meta"]
    errors = result["errors"]

    try:
        mlog = DFReader.DFReader_binary(filepath, zero_time_base=True)
    except Exception as e:
        raise ValueError(f"Cannot open log file: {e}") from e

    msg_count = 0
    while True:
        try:
            msg = mlog.recv_match(blocking=False)
        except Exception as exc:
            errors.append(f"Parse error at message {msg_count}: {exc}")
            break

        if msg is None:
            break

        msg_count += 1
        mtype = msg.get_type()

        if mtype == "SKIP_TO_END":
            break

        # Time in seconds (convert from microseconds)
        try:
            time_us = getattr(msg, "TimeUS", None)
            time_s = float(time_us) / 1_000_000 if time_us is not None else None
        except Exception:
            time_s = None

        # ── Battery / Power ──────────────────────────────────────────────────
        if mtype in ("BAT", "CURR"):
            volt = _safe_float(getattr(msg, "Volt", None))
            curr = _safe_float(getattr(msg, "Curr", None))
            curr_tot = _safe_float(getattr(msg, "CurrTot", None))
            if volt is not None and time_s is not None:
                ts["bat"]["time_s"].append(time_s)
                ts["bat"]["volt"].append(volt)
                ts["bat"]["curr"].append(curr if curr is not None else 0.0)
                ts["bat"]["curr_tot"].append(curr_tot if curr_tot is not None else 0.0)
                meta["has_battery"] = True

        # ── GPS ──────────────────────────────────────────────────────────────
        elif mtype == "GPS":
            lat = _safe_float(getattr(msg, "Lat", None))
            lng = _safe_float(getattr(msg, "Lng", None))
            alt = _safe_float(getattr(msg, "Alt", None))
            spd = _safe_float(getattr(msg, "Spd", None))
            gcrs = _safe_float(getattr(msg, "GCrs", None))
            if lat is not None and lng is not None and lat != 0.0 and lng != 0.0:
                ts["gps"]["time_s"].append(time_s)
                ts["gps"]["lat"].append(lat)
                ts["gps"]["lng"].append(lng)
                ts["gps"]["alt"].append(alt if alt is not None else 0.0)
                ts["gps"]["spd"].append(spd if spd is not None else 0.0)
                ts["gps"]["gcrs"].append(gcrs if gcrs is not None else 0.0)
                meta["has_gps"] = True

                # Try to extract log date from first GPS fix
                if meta["log_date"] is None:
                    gps_week = getattr(msg, "GWk", None)
                    gps_ms = getattr(msg, "GMS", None)
                    if gps_week and gps_ms:
                        try:
                            import datetime
                            # GPS epoch: Jan 6, 1980
                            gps_epoch = datetime.datetime(1980, 1, 6)
                            gps_time = gps_epoch + datetime.timedelta(
                                weeks=int(gps_week),
                                milliseconds=int(gps_ms)
                            )
                            meta["log_date"] = gps_time.strftime("%Y-%m-%d")
                        except Exception:
                            pass

        # ── Airspeed ─────────────────────────────────────────────────────────
        elif mtype == "ARSP":
            airspeed = _safe_float(getattr(msg, "Airspeed", None))
            if airspeed is not None and time_s is not None:
                ts["arsp"]["time_s"].append(time_s)
                ts["arsp"]["airspeed"].append(airspeed)
                meta["has_airspeed"] = True

        # ── Barometric Altitude ───────────────────────────────────────────────
        elif mtype == "BARO":
            alt = _safe_float(getattr(msg, "Alt", None))
            if alt is not None and time_s is not None:
                ts["baro"]["time_s"].append(time_s)
                ts["baro"]["alt"].append(alt)

        # ── Attitude ─────────────────────────────────────────────────────────
        elif mtype == "ATT":
            roll = _safe_float(getattr(msg, "Roll", None))
            pitch = _safe_float(getattr(msg, "Pitch", None))
            yaw = _safe_float(getattr(msg, "Yaw", None))
            if roll is not None and time_s is not None:
                ts["att"]["time_s"].append(time_s)
                ts["att"]["roll"].append(roll)
                ts["att"]["pitch"].append(pitch if pitch is not None else 0.0)
                ts["att"]["yaw"].append(yaw if yaw is not None else 0.0)

        # ── Control Tuning ───────────────────────────────────────────────────
        elif mtype == "CTUN":
            thr_out = _safe_float(getattr(msg, "ThrOut", None))
            nav_pitch = _safe_float(getattr(msg, "NavPitch", None))
            nav_roll = _safe_float(getattr(msg, "NavRoll", None))
            if thr_out is not None and time_s is not None:
                ts["ctun"]["time_s"].append(time_s)
                ts["ctun"]["thr_out"].append(thr_out)
                ts["ctun"]["nav_pitch"].append(nav_pitch if nav_pitch is not None else 0.0)
                ts["ctun"]["nav_roll"].append(nav_roll if nav_roll is not None else 0.0)

        # ── RC Input ─────────────────────────────────────────────────────────
        elif mtype == "RCIN":
            if time_s is not None:
                ts["rcin"]["time_s"].append(time_s)
                ts["rcin"]["c1"].append(_safe_float(getattr(msg, "C1", None)) or 1500)
                ts["rcin"]["c2"].append(_safe_float(getattr(msg, "C2", None)) or 1500)
                ts["rcin"]["c3"].append(_safe_float(getattr(msg, "C3", None)) or 1000)
                ts["rcin"]["c4"].append(_safe_float(getattr(msg, "C4", None)) or 1500)

        # ── RC Output ────────────────────────────────────────────────────────
        elif mtype == "RCOU":
            if time_s is not None:
                ts["rcou"]["time_s"].append(time_s)
                ts["rcou"]["c1"].append(_safe_float(getattr(msg, "C1", None)) or 1500)
                ts["rcou"]["c2"].append(_safe_float(getattr(msg, "C2", None)) or 1500)
                ts["rcou"]["c3"].append(_safe_float(getattr(msg, "C3", None)) or 1000)
                ts["rcou"]["c4"].append(_safe_float(getattr(msg, "C4", None)) or 1500)

        # ── Vibration ────────────────────────────────────────────────────────
        elif mtype == "VIBE":
            vx = _safe_float(getattr(msg, "VibeX", None))
            vy = _safe_float(getattr(msg, "VibeY", None))
            vz = _safe_float(getattr(msg, "VibeZ", None))
            if vx is not None and time_s is not None:
                ts["vibe"]["time_s"].append(time_s)
                ts["vibe"]["vibe_x"].append(vx)
                ts["vibe"]["vibe_y"].append(vy if vy is not None else 0.0)
                ts["vibe"]["vibe_z"].append(vz if vz is not None else 0.0)

        # ── Wind ─────────────────────────────────────────────────────────────
        elif mtype == "WIND":
            direction = _safe_float(getattr(msg, "Direction", None))
            speed = _safe_float(getattr(msg, "Speed", None))
            if direction is not None and time_s is not None:
                ts["wind"]["time_s"].append(time_s)
                ts["wind"]["direction"].append(direction)
                ts["wind"]["speed"].append(speed if speed is not None else 0.0)

        # ── Parameters ───────────────────────────────────────────────────────
        elif mtype == "PARM":
            name = getattr(msg, "Name", None)
            value = _safe_float(getattr(msg, "Value", None))
            if name is not None:
                result["params"][name.strip()] = value

        # ── Text Messages ────────────────────────────────────────────────────
        elif mtype == "MSG":
            msg_text = getattr(msg, "Message", None)
            if msg_text is not None and time_s is not None:
                result["messages"].append({
                    "time_s": round(time_s, 3),
                    "message": str(msg_text).strip(),
                })

        # ── Events ───────────────────────────────────────────────────────────
        elif mtype == "MODE":
            mode = getattr(msg, "Mode", None)
            mode_num = getattr(msg, "ModeNum", None)
            events.append({
                "time_us": int(time_us) if time_us else 0,
                "event_type": "MODE",
                "value": {"mode": str(mode), "mode_num": int(mode_num) if mode_num is not None else None},
            })

        elif mtype == "ARM":
            arm_state = getattr(msg, "ArmState", None)
            events.append({
                "time_us": int(time_us) if time_us else 0,
                "event_type": "ARM",
                "value": {"armed": bool(arm_state)},
            })

        elif mtype in ("ERR", "EV"):
            subsys = getattr(msg, "Subsys", None)
            ecode = getattr(msg, "ECode", None)
            events.append({
                "time_us": int(time_us) if time_us else 0,
                "event_type": mtype,
                "value": {"subsys": subsys, "ecode": ecode},
            })

    log.info(f"Parsed {msg_count} messages from {os.path.basename(filepath)}")
    log.info(
        f"GPS points: {len(ts['gps']['time_s'])}, "
        f"BAT points: {len(ts['bat']['time_s'])}, "
        f"ARSP points: {len(ts['arsp']['time_s'])}, "
        f"Params: {len(result['params'])}, "
        f"Messages: {len(result['messages'])}"
    )

    return result
