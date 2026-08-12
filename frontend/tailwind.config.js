/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0B0E11',
        panel: '#14181D',
        'panel-alt': '#191E24',
        border: '#232A32',
        ink: '#E7EAEE',
        muted: '#8A93A1',
        faint: '#5A6472',
        accent: {
          DEFAULT: '#5B8CFF',
          hover: '#7AA0FF',
        },
        confidence: {
          high: '#4FE3C1',
          mid: '#F2B84B',
          low: '#F0625B',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.35 },
        },
      },
      animation: {
        scan: 'scan 2.2s ease-in-out infinite',
        pulseDot: 'pulseDot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
