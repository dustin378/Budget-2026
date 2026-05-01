/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f5f1ea',
        'paper-light': '#fbf9f4',
        ink: '#1a1814',
        'ink-muted': '#6b6660',
        'ink-faint': '#a39d92',
        line: '#d4cdc1',
        'line-soft': '#e8e2d6',
        positive: '#2d5e3e',
        negative: '#8b2e2a',
        flag: '#b8860b',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontVariantNumeric: {
        'tabular-nums': 'tabular-nums',
      },
    },
  },
  plugins: [],
}
