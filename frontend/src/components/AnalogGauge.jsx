import React, { useEffect, useRef } from 'react';

/**
 * AnalogGauge — canvas-gauges RadialGauge wrapper.
 *
 * Props:
 *   value      — current reading
 *   min/max    — gauge range
 *   unit       — unit string
 *   label      — gauge label
 *   size       — canvas size in px (default 160)
 *   redZoneStart — value at which red zone begins
 *   greenZoneEnd — value at which green zone ends
 */
export default function AnalogGauge({
  value = 0,
  min = 0,
  max = 100,
  unit = '',
  label = '',
  size = 160,
  redZoneStart,
  greenZoneEnd,
}) {
  const canvasRef = useRef(null);
  const gaugeRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Dynamic import to avoid SSR issues
    import('canvas-gauges').then(({ RadialGauge }) => {
      const highlights = [];

      if (greenZoneEnd != null) {
        highlights.push({
          from: min,
          to: greenZoneEnd,
          color: 'rgba(47, 158, 68, 0.35)',
        });
      }
      if (redZoneStart != null) {
        highlights.push({
          from: redZoneStart,
          to: max,
          color: 'rgba(200, 30, 30, 0.45)',
        });
      }

      const gauge = new RadialGauge({
        renderTo: canvasRef.current,
        width:  size,
        height: size,
        units: unit,
        title: label,
        value: value,
        minValue: min,
        maxValue: max,

        // Colors — Dark Hangar palette
        colorPlate:           '#0b0d10',
        colorPlateEnd:        '#14181c',
        colorBorderOuter:     '#1c1e22',
        colorBorderOuterEnd:  '#0b0d10',
        colorBorderMiddle:    '#4a4e55',
        colorBorderMiddleEnd: '#1c1e22',
        colorBorderInner:     '#2a2f36',
        colorBorderInnerEnd:  '#14181c',
        colorNeedle:          '#c81e1e',
        colorNeedleEnd:       '#ff2222',
        colorNeedleShadowUp:  'rgba(0,0,0,0.6)',
        colorNeedleShadowDown:'rgba(0,0,0,0.8)',
        colorTitle:           '#6b7280',
        colorUnits:           '#f2c30f',
        colorNumbers:         '#e8ecf0',
        colorMajorTicks:      '#4a4e55',
        colorMinorTicks:      '#2a2f36',

        // Style
        borderOuterWidth: 3,
        borderMiddleWidth: 2,
        borderInnerWidth: 2,
        borderShadowWidth: 0,
        needle: true,
        needleType: 'arrow',
        needleWidth: 2.5,
        needleCircleSize: 7,
        needleCircleOuter: true,
        needleCircleInner: false,
        colorNeedleCircleOuter:    '#2a2f36',
        colorNeedleCircleOuterEnd: '#14181c',
        colorNeedleCircleInner:    '#c81e1e',
        colorNeedleCircleInnerEnd: '#c81e1e',

        animationDuration: 300,
        animationRule: 'linear',

        majorTicks: _buildMajorTicks(min, max, 6),
        minorTicks: 5,
        strokeTicks: true,

        highlights,

        fontTitleSize: 18,
        fontUnitsSize: 22,
        fontNumbersSize: 18,

        // Shadow glow effect on the plate
        shadows: true,
      });

      gauge.draw();
      gaugeRef.current = gauge;
    });

    return () => {
      if (gaugeRef.current) {
        gaugeRef.current.destroy?.();
        gaugeRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, unit, label, size, redZoneStart, greenZoneEnd]);

  // Update value without re-creating the gauge
  useEffect(() => {
    if (gaugeRef.current) {
      gaugeRef.current.value = value;
    }
  }, [value]);

  return (
    <div className="gauge-container">
      <canvas ref={canvasRef} width={size} height={size} />
      <span className="gauge-label">{label}</span>
      <span className="gauge-value-text">
        {value != null ? value.toFixed(1) : '---'} {unit}
      </span>
    </div>
  );
}

function _buildMajorTicks(min, max, count) {
  const ticks = [];
  const step = (max - min) / (count - 1);
  for (let i = 0; i < count; i++) {
    ticks.push(String(Math.round(min + step * i)));
  }
  return ticks;
}
