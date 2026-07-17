import React from 'react';

/**
 * ReadoutLCD — 7-segment style digital readout.
 * Props: value, unit, label, precision, state ('warn'|'good'|null)
 */
export default function ReadoutLCD({ value, unit, label, precision = 1, state }) {
  const formatted =
    value == null ? '---' :
    typeof value === 'number' ? value.toFixed(precision) :
    String(value);

  const stateClass = state === 'warn' ? 'warn' : state === 'good' ? 'good' : '';

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="dh-lcd label">{label}</span>
      )}
      <div className="flex items-end gap-1">
        <span className={`dh-lcd value ${stateClass}`}>{formatted}</span>
        {unit && <span className="dh-lcd unit mb-1">{unit}</span>}
      </div>
    </div>
  );
}
