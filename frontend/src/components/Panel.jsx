import React from 'react';

/**
 * Panel — Brushed-metal card with rivets and optional header.
 * Props: title, className, children, noRivets
 */
export default function Panel({ title, className = '', children, noRivets = false, style }) {
  return (
    <div className={`dh-panel ${className}`} style={style}>
      {!noRivets && (
        <>
          <span className="dh-rivet tl" />
          <span className="dh-rivet tr" />
          <span className="dh-rivet bl" />
          <span className="dh-rivet br" />
        </>
      )}
      {title && (
        <div className="dh-panel-header">{title}</div>
      )}
      {children}
    </div>
  );
}
