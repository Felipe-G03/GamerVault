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
        background: 'var(--bg-primary, #07080c)',
        surface: {
          DEFAULT: 'var(--surface-dark, #10121a)',
          low: 'var(--surface-low, #0a0c10)',
          container: 'var(--surface-container, #161822)',
          high: 'var(--surface-high, #1f2230)',
          higher: 'var(--surface-higher, #2b2f42)'
        },
        border: {
          DEFAULT: 'var(--border-default, #262a3b)',
          subtle: 'var(--border-subtle, #181b26)',
          bright: 'var(--border-bright, #3d435d)'
        },
        accent: {
          DEFAULT: 'var(--accent-primary, #10b981)',
          bright: 'var(--accent-bright, #3dd69b)',
          glow: 'var(--accent-glow, rgba(61, 214, 155, 0.25))',
          subtle: 'var(--accent-subtle, #0d3829)'
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
