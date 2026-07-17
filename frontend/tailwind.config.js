/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Hangar palette
        'dh-bg':       '#0b0d10',
        'dh-panel':    '#14181c',
        'dh-accent':   '#f2c30f',   // Bat-signal yellow
        'dh-chrome-hi':'#4a4e55',
        'dh-chrome-lo':'#1c1e22',
        'dh-needle':   '#c81e1e',
        'dh-green':    '#2f9e44',
        'dh-grid':     '#2a2f36',
        'dh-text':     '#e8ecf0',
        'dh-dim':      '#6b7280',
      },
      fontFamily: {
        orbitron:    ['Orbitron', 'sans-serif'],
        lcd:         ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        'bat-glow': '0 0 18px rgba(242, 195, 15, 0.12), 0 0 40px rgba(242, 195, 15, 0.04)',
        'bat-glow-strong': '0 0 24px rgba(242, 195, 15, 0.3)',
        'panel':  'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'brushed-metal': 'repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)',
        'carbon-fiber': 'repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 6px)',
      },
    },
  },
  plugins: [],
}
