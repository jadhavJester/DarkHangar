import React from 'react';

/**
 * Panel — Frosted glass card with ambient glow and optional header.
 * Props: title, className, children, noRivets, style
 */
export default function Panel({ title, className = '', children, noRivets = false, style }) {
  return (
    <div className={`dh-panel ${className}`} style={style}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(212,160,23,0.15) 30%, rgba(255,255,255,0.08) 50%, rgba(212,160,23,0.15) 70%, transparent 100%)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      {title && (
        <div className="dh-panel-header">
          {typeof title === 'string' ? `■ ${title}` : title}
        </div>
      )}
      {children}
    </div>
  );
}
