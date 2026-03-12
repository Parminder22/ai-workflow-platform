/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          mint:    '#14f195',
          violet:  '#7c3aed',
          blue:    '#3b82f6',
        },
        surface: {
          base:    '#08080f',
          raised:  '#0e0e1a',
          card:    '#141425',
          overlay: '#1a1a2e',
          hover:   '#1e1e35',
        },
        border: {
          subtle:  '#1e1e35',
          default: '#252540',
          strong:  '#363660',
        },
        text: {
          primary:  '#e4e4f4',
          secondary:'#a0a0c8',
          muted:    '#60608a',
          inverse:  '#08080f',
        },
        node: {
          input:   '#3b82f6',
          process: '#8b5cf6',
          ai:      '#14f195',
          output:  '#f59e0b',
          default: '#6060a0',
        },
        status: {
          success: '#14f195',
          error:   '#ff4757',
          warning: '#ffa502',
          info:    '#3b82f6',
        }
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M0 0h40v1H0zM0 0v40h1V0z'/%3E%3C/g%3E%3C/svg%3E\")",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'card':      '0 1px 3px rgba(0,0,0,0.4), 0 4px 24px rgba(0,0,0,0.2)',
        'card-hover':'0 2px 8px rgba(0,0,0,0.5), 0 8px 40px rgba(0,0,0,0.3)',
        'modal':     '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        'glow-mint': '0 0 20px rgba(20,241,149,0.2)',
        'glow-blue': '0 0 20px rgba(59,130,246,0.2)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'slide-in':   'slideIn 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.25rem',
      }
    },
  },
  plugins: [],
}