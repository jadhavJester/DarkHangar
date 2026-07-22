"""
Export helper module:
1. MATLAB-compatible .mat binary files (using SciPy)
2. Beautifully themed PDF flight reports (using Matplotlib)
"""
import os
import sys
import tempfile
import json
import scipy.io as sio

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.backends.backend_pdf
import matplotlib.backends.backend_agg

def generate_mat_export(ts_data: dict) -> str:
    """
    Flatten timeseries telemetry data into a key-value structure
    and write to a MATLAB binary file (.mat).
    """
    mat_dict = {}
    for msg_name, series in ts_data.items():
        time_s = series.get("time_s", [])
        if not time_s:
            continue
        
        # Add time array
        mat_dict[f"{msg_name}_time_s"] = time_s
        for field, values in series.items():
            if field != "time_s":
                # Ensure no None/null values in list (replace with NaN)
                cleaned_values = [v if v is not None else float('nan') for v in values]
                mat_dict[f"{msg_name}_{field}"] = cleaned_values
                
    # Create temp file
    fd, path = tempfile.mkstemp(suffix=".mat")
    os.close(fd)
    
    sio.savemat(path, mat_dict)
    return path

def generate_pdf_report(flight_meta: dict, ts_data: dict) -> str:
    """
    Generate a high-quality PDF flight report.
    """
    # ── Styling Config ────────────────────────────────────────────────────────
    bg_color = "#111625"
    panel_color = "#182030"
    text_color = "#FFC72C"      # Neon Gold
    label_color = "#8A99AD"     # Soft Grey
    grid_color = "#243348"      # Subdued Grid
    title_color = "#FFFFFF"     # White
    
    plt.rcParams['figure.facecolor'] = bg_color
    plt.rcParams['axes.facecolor'] = panel_color
    plt.rcParams['text.color'] = text_color
    plt.rcParams['axes.labelcolor'] = label_color
    plt.rcParams['xtick.color'] = label_color
    plt.rcParams['ytick.color'] = label_color
    plt.rcParams['grid.color'] = grid_color
    plt.rcParams['grid.linestyle'] = '--'
    plt.rcParams['grid.alpha'] = 0.5
    
    # Create figure
    fig = plt.figure(figsize=(10, 13), dpi=150)
    fig.patch.set_facecolor(bg_color)
    
    from matplotlib.gridspec import GridSpec
    gs = GridSpec(4, 1, height_ratios=[1.0, 2, 2, 2], hspace=0.35)
    
    # ── Header & Stats Table ──────────────────────────────────────────────────
    ax_top = fig.add_subplot(gs[0])
    ax_top.axis('off')
    
    ax_top.text(0.0, 0.9, "FLIGHT LOG ANALYZER", 
                fontsize=16, fontweight='bold', color=text_color, fontname='sans-serif')
    ax_top.text(0.0, 0.75, f"Flight Report: {flight_meta.get('filename', 'Unknown Log')}", 
                fontsize=12, color='#FFFFFF', fontname='sans-serif')
    ax_top.text(0.0, 0.65, f"Date: {flight_meta.get('log_date') or '—'}  |  Archived: {flight_meta.get('uploaded_at') or '—'}", 
                fontsize=9, color=label_color, fontname='sans-serif')
    
    # Stats table content
    m = flight_meta
    stats = [
        ["Total Distance", f"{m.get('total_distance_km', 0):.2f} km" if m.get('total_distance_km') is not None else "—",
         "Duration", f"{m.get('duration_min', 0):.1f} min" if m.get('duration_min') is not None else "—"],
        ["Energy Consumed", f"{m.get('energy_wh', 0):.1f} Wh" if m.get('energy_wh') is not None else "—",
         "Avg Efficiency", f"{m.get('efficiency_wh_per_km', 0):.2f} Wh/km" if m.get('efficiency_wh_per_km') is not None else "—"],
        ["Max Airspeed", f"{m.get('max_airspeed_ms', 0):.1f} m/s" if m.get('max_airspeed_ms') is not None else "—",
         "Max Altitude", f"{m.get('max_altitude_m', 0):.0f} m" if m.get('max_altitude_m') is not None else "—"],
        ["Min Voltage", f"{m.get('min_voltage_v', 0):.2f} V" if m.get('min_voltage_v') is not None else "—",
         "Max Current", f"{m.get('max_current_a', 0):.1f} A" if m.get('max_current_a') is not None else "—"]
    ]
    
    table = ax_top.table(cellText=stats, loc='center', bbox=[0.0, 0.0, 1.0, 0.55])
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    for (row, col), cell in table.get_celld().items():
        cell.set_facecolor(panel_color)
        cell.set_text_props(color='#FFFFFF', fontname='sans-serif')
        if col in [0, 2]:
            cell.set_text_props(color=text_color, fontweight='bold')
        cell.set_edgecolor(grid_color)
        
    # ── Plot 1: Altitude & Speed ──────────────────────────────────────────────
    ax1 = fig.add_subplot(gs[1])
    ax1.set_title("FLIGHT DYNAMICS (ALTITUDE & SPEED)", color=title_color, fontsize=11, fontweight='bold', loc='left', pad=8)
    
    gps_time = ts_data.get("gps", {}).get("time_s", [])
    gps_alt = ts_data.get("gps", {}).get("alt", [])
    gps_spd = ts_data.get("gps", {}).get("spd", [])
    
    if gps_time and gps_alt:
        ax1.plot(gps_time, gps_alt, color="#00F0FF", linewidth=1.5, label="Altitude (m)")
        ax1.set_ylabel("Altitude (m)", color="#00F0FF")
        ax1.tick_params(axis='y', labelcolor="#00F0FF")
        ax1.grid(True)
        
        if gps_spd:
            ax1_twin = ax1.twinx()
            ax1_twin.plot(gps_time, gps_spd, color="#FF007F", linewidth=1.0, linestyle=":", label="Speed (m/s)")
            ax1_twin.set_ylabel("Ground Speed (m/s)", color="#FF007F")
            ax1_twin.tick_params(axis='y', labelcolor="#FF007F")
            ax1_twin.spines['right'].set_color("#FF007F")
            ax1_twin.spines['left'].set_color("#00F0FF")
            ax1_twin.spines['top'].set_visible(False)
    else:
        ax1.text(0.5, 0.5, "No GPS / Altitude Data Available", ha='center', va='center', color=label_color)
        ax1.grid(True)
        
    # ── Plot 2: Electrical (Voltage & Current) ────────────────────────────────
    ax2 = fig.add_subplot(gs[2])
    ax2.set_title("ELECTRICAL SYSTEMS (BATTERY HEALTH)", color=title_color, fontsize=11, fontweight='bold', loc='left', pad=8)
    
    bat_time = ts_data.get("bat", {}).get("time_s", [])
    bat_volt = ts_data.get("bat", {}).get("volt", [])
    bat_curr = ts_data.get("bat", {}).get("curr", [])
    
    if bat_time and bat_volt:
        ax2.plot(bat_time, bat_volt, color="#39FF14", linewidth=1.5, label="Voltage (V)")
        ax2.set_ylabel("Battery Voltage (V)", color="#39FF14")
        ax2.tick_params(axis='y', labelcolor="#39FF14")
        ax2.grid(True)
        ax2.axhline(y=14.8, color="#FF3333", linestyle="--", linewidth=1.0, alpha=0.7)
        
        if bat_curr:
            ax2_twin = ax2.twinx()
            ax2_twin.plot(bat_time, bat_curr, color="#FF9F00", linewidth=1.2, label="Current (A)")
            ax2_twin.set_ylabel("Current Draw (A)", color="#FF9F00")
            ax2_twin.tick_params(axis='y', labelcolor="#FF9F00")
            ax2_twin.spines['right'].set_color("#FF9F00")
            ax2_twin.spines['left'].set_color("#39FF14")
            ax2_twin.spines['top'].set_visible(False)
    else:
        ax2.text(0.5, 0.5, "No Battery Telemetry Available", ha='center', va='center', color=label_color)
        ax2.grid(True)
        
    # ── Plot 3: Power & Vibration ─────────────────────────────────────────────
    ax3 = fig.add_subplot(gs[3])
    ax3.set_title("POWER CONSUMPTION & VIBRATION", color=title_color, fontsize=11, fontweight='bold', loc='left', pad=8)
    ax3.set_xlabel("Time (seconds)", color=label_color)
    
    power_time = ts_data.get("power", {}).get("time_s", [])
    power_watts = ts_data.get("power", {}).get("watts", [])
    
    vibe_time = ts_data.get("vibe", {}).get("time_s", [])
    vibe_x = ts_data.get("vibe", {}).get("vibe_x", [])
    
    if power_time and power_watts:
        ax3.plot(power_time, power_watts, color="#00F0FF", linewidth=1.2, label="Power (W)")
        ax3.set_ylabel("Power (Watts)", color="#00F0FF")
        ax3.tick_params(axis='y', labelcolor="#00F0FF")
        ax3.grid(True)
        
        if vibe_time and vibe_x:
            ax3_twin = ax3.twinx()
            ax3_twin.plot(vibe_time, vibe_x, color="#A020F0", linewidth=0.8, alpha=0.7, label="Vibe X")
            ax3_twin.set_ylabel("IMU Vibration (X-axis)", color="#A020F0")
            ax3_twin.tick_params(axis='y', labelcolor="#A020F0")
            ax3_twin.spines['right'].set_color("#A020F0")
            ax3_twin.spines['left'].set_color("#00F0FF")
            ax3_twin.spines['top'].set_visible(False)
    else:
        ax3.text(0.5, 0.5, "No Power or Vibration Data Available", ha='center', va='center', color=label_color)
        ax3.grid(True)
        
    fig.text(0.5, 0.02, "Generated by Flight Log Analyzer", 
             ha='center', va='center', color=label_color, fontsize=8, alpha=0.5)
    
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    
    plt.savefig(path, facecolor=bg_color, edgecolor='none', bbox_inches='tight')
    plt.close(fig)
    return path
