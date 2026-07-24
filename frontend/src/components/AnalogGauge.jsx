import React, { useEffect, useRef } from 'react';

/**
 * AnalogGauge — canvas-gauges RadialGauge with translucent glass plate.
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

    import('canvas-gauges').then(({ RadialGauge }) => {
      const highlights = [];

      if (greenZoneEnd != null) {
        highlights.push({
          from: min,
          to: greenZoneEnd,
          color: 'rgba(74, 224, 96, 0.18)',
        });
      }
      if (redZoneStart != null) {
        highlights.push({
          from: redZoneStart,
          to: max,
          color: 'rgba(224, 64, 64, 0.22)',
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

        // Translucent glass plate
        colorPlate:           'rgba(250, 246, 238, 0.15)',
        colorPlateEnd:        'rgba(250, 246, 238, 0.08)',
        colorBorderOuter:     'rgba(184, 134, 11, 0.12)',
        colorBorderOuterEnd:  'rgba(184, 134, 11, 0.06)',
        colorBorderMiddle:    'rgba(255, 255, 255, 0.10)',
        colorBorderMiddleEnd: 'rgba(255, 255, 255, 0.05)',
        colorBorderInner:     'rgba(255, 255, 255, 0.08)',
        colorBorderInnerEnd:  'rgba(255, 255, 255, 0.03)',

        colorNeedle:          '#b33030',
        colorNeedleEnd:       '#b33030',
        colorNeedleShadowUp:  'rgba(0,0,0,0)',
        colorNeedleShadowDown:'rgba(0,0,0,0)',
        colorTitle:           'rgba(139, 125, 107, 0.6)',
        colorUnits:           'rgba(139, 125, 107, 0.5)',
        colorNumbers:         '#2c2416',
        colorMajorTicks:      'rgba(139, 115, 85, 0.4)',
        colorMinorTicks:      'rgba(214, 201, 176, 0.25)',

        // Style
        borderOuterWidth: 1,
        borderMiddleWidth: 0,
        borderInnerWidth: 0,
        borderShadowWidth: 0,
        needle: true,
        needleType: 'arrow',
        needleWidth: 2,
        needleCircleSize: 5,
        needleCircleOuter: false,
        needleCircleInner: false,
        colorNeedleCircleOuter:    '#b33030',
        colorNeedleCircleOuterEnd: '#b33030',
        colorNeedleCircleInner:    '#b33030',
        colorNeedleCircleInnerEnd: '#b33030',

        animationDuration: 300,
        animationRule: 'linear',

        majorTicks: _buildMajorTicks(min, max, 6),
        minorTicks: 5,
        strokeTicks: true,

        highlights,

        fontTitleSize: 18,
        fontUnitsSize: 22,
        fontNumbersSize: 18,

        shadows: false,
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
