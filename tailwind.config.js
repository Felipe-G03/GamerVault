/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-primary, #040a07)',
        surface: {
          DEFAULT: 'rgba(var(--surface-default-rgb, 11, 23, 17), <alpha-value>)',
          low: 'rgba(var(--surface-low-rgb, 6, 16, 11), <alpha-value>)',
          container: 'rgba(var(--surface-container-rgb, 16, 33, 25), <alpha-value>)',
          high: 'rgba(var(--surface-high-rgb, 23, 48, 36), <alpha-value>)',
          higher: 'rgba(var(--surface-higher-rgb, 33, 67, 51), <alpha-value>)'
        },
        border: {
          DEFAULT: 'rgba(var(--border-default-rgb, 25, 56, 41), <alpha-value>)',
          subtle: 'rgba(var(--border-subtle-rgb, 15, 36, 26), <alpha-value>)',
          bright: 'rgba(var(--border-bright-rgb, 38, 89, 65), <alpha-value>)'
        },
        accent: {
          DEFAULT: 'rgba(var(--accent-rgb, 16, 185, 129), <alpha-value>)',
          bright: 'rgba(var(--accent-bright-rgb, 61, 214, 155), <alpha-value>)',
          glow: 'var(--accent-glow, rgba(61, 214, 155, 0.35))',
          subtle: 'var(--accent-subtle, rgba(16, 185, 129, 0.18))'
        },
        orange: {
          DEFAULT: '#f97316',
          vibrant: '#ea580c',
          glow: 'rgba(249, 115, 22, 0.25)'
        },
        cyan: {
          DEFAULT: '#06b6d4',
          vibrant: '#0284c7',
          glow: 'rgba(6, 182, 212, 0.25)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
        gamer: ['"Orbitron"', '"Chakra Petch"', 'sans-serif']
      },
      boxShadow: {
        'neon-green': '0 0 15px -3px var(--accent-glow, rgba(61, 214, 155, 0.45))',
        'neon-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.45)',
        'neon-orange': '0 0 15px -3px rgba(249, 115, 22, 0.45)',
        'glow-card': '0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.05)'
      }
    },
  },
  plugins: [],
}
