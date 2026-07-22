import React from 'react';
import Panel from '../components/Panel';
import ReadoutLCD from '../components/ReadoutLCD';
import AnalogGauge from '../components/AnalogGauge';

export default function Styleguide() {
  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="dh-subtitle mb-2">Design System</div>
          <h1 className="dh-title text-4xl mb-4">Styleguide</h1>
          <p className="dh-lcd label">
            Batman-noir × Retro Aviation × eCalc-density instrument panel
          </p>
        </div>

        {/* Colors */}
        <Panel title="Color Palette" className="mb-6 p-5">
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: 'BG Primary', color: '#0b0d10' },
              { name: 'BG Panel', color: '#14181c' },
              { name: 'Bat-Signal Yellow', color: '#f2c30f' },
              { name: 'Chrome Hi', color: '#4a4e55' },
              { name: 'Chrome Lo', color: '#1c1e22' },
              { name: 'Needle Red', color: '#c81e1e' },
              { name: 'Healthy Green', color: '#2f9e44' },
              { name: 'Grid Line', color: '#2a2f36' },
            ].map(sw => (
              <div key={sw.name} className="flex flex-col gap-1">
                <div style={{ height: 40, background: sw.color, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }} />
                <div className="dh-lcd label" style={{ color: 'var(--text-dim)' }}>{sw.name}</div>
                <div className="dh-lcd" style={{ fontSize: '0.65rem' }}>{sw.color}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Typography */}
        <Panel title="Typography" className="mb-6 p-5">
          <div className="flex flex-col gap-4">
            <div>
              <div className="dh-lcd label mb-1">Display — Orbitron Bold</div>
              <div className="dh-title text-4xl">DARK HANGAR</div>
              <div className="dh-title text-2xl">Fixed-Wing UAV Analyzer</div>
            </div>
            <div>
              <div className="dh-lcd label mb-1">Accent — Orbitron Uppercase</div>
              <div className="dh-subtitle">Mission Archive · Flight Log</div>
            </div>
            <div>
              <div className="dh-lcd label mb-1">LCD Readout — Share Tech Mono</div>
              <div className="flex gap-6 items-end">
                <ReadoutLCD label="Airspeed" value={24.7} unit="m/s" precision={1} />
                <ReadoutLCD label="Voltage" value={22.4} unit="V" precision={2} state="good" />
                <ReadoutLCD label="Current" value={51.2} unit="A" precision={1} state="warn" />
                <ReadoutLCD label="No Data" value={null} unit="km" />
              </div>
            </div>
          </div>
        </Panel>

        {/* Panel variants */}
        <Panel title="Panel Variants" className="mb-6 p-5">
          <div className="grid grid-cols-3 gap-4">
            <Panel title="With Title" className="p-4">
              <p className="dh-lcd label">Panel body content</p>
            </Panel>
            <Panel className="p-4">
              <p className="dh-lcd label">No title variant</p>
              <p className="dh-lcd" style={{ fontSize: '0.8rem' }}>With brushed-metal texture</p>
            </Panel>
            <Panel noRivets className="p-4" style={{ borderLeft: '3px solid var(--accent-yellow)' }}>
              <p className="dh-lcd label" style={{ color: 'var(--accent-yellow)' }}>Accent border</p>
              <p className="dh-lcd" style={{ fontSize: '0.8rem' }}>No rivets variant</p>
            </Panel>
          </div>
        </Panel>

        {/* Badges */}
        <Panel title="Badges & States" className="mb-6 p-5">
          <div className="flex gap-3 flex-wrap">
            <span className="dh-badge ok">✓ VIBE OK</span>
            <span className="dh-badge warn">⚠ WARN</span>
            <span className="dh-badge bad">✗ BAD</span>
            <span className="dh-badge warn">No GPS</span>
            <span className="dh-badge warn">No BAT</span>
          </div>
        </Panel>

        {/* Analog Gauges */}
        <Panel title="Analog Gauges (canvas-gauges)" className="mb-6 p-5">
          <div className="flex gap-6 flex-wrap justify-center">
            <AnalogGauge label="Airspeed" unit="m/s" value={18.4} min={0} max={40} greenZoneEnd={15} size={160} />
            <AnalogGauge label="Altitude" unit="m"   value={128}  min={0} max={500} size={160} />
            <AnalogGauge label="Voltage"  unit="V"   value={23.1} min={0} max={30} redZoneStart={21} greenZoneEnd={25} size={160} />
            <AnalogGauge label="Current"  unit="A"   value={28.6} min={0} max={60} redZoneStart={50} size={160} />
            <AnalogGauge label="Power"    unit="W"   value={642}  min={0} max={1000} redZoneStart={800} size={160} />
          </div>
        </Panel>

        {/* Stat table demo */}
        <Panel title="Stats Table (eCalc-style density)" className="mb-6 p-5">
          <div className="grid grid-cols-2 gap-x-8">
            {[
              ['Total Distance', '12.4 km'],
              ['Duration', '23.1 min'],
              ['Energy Used', '184 Wh'],
              ['Efficiency', '14.8 Wh/km'],
              ['Max Airspeed', '31.2 m/s'],
              ['Max Altitude', '218 m'],
              ['Max Current', '44.7 A'],
              ['Min Voltage', '21.6 V'],
              ['Glide Ratio', '12.4:1'],
              ['Vibe Health', 'OK'],
            ].map(([l, v]) => (
              <div key={l} className="stat-row">
                <span className="stat-label">{l}</span>
                <span className="stat-value">{v}</span>
              </div>
            ))}
          </div>
        </Panel>

      </div>
    </div>
  );
}
