import { createContext, useContext, useEffect, useState } from 'react'

// ── Color Tokens ──────────────────────────────────────────────────────────────

export const THEMES = {
  dark: {
    name: 'dark',

    // Surfaces
    bg:          '#08080f',
    bgRaised:    '#0e0e1a',
    bgCard:      '#141425',
    bgInput:     '#141425',
    bgHover:     '#1e1e35',
    sidebar:     '#0a0a14',

    // Borders
    borderSubtle: '#1e1e35',
    border:       '#252540',
    borderStrong: '#363660',

    // Text
    text:  '#e4e4f4',
    text2: '#a0a0c8',
    text3: '#60608a',
    text4: '#40406a',

    // Accent — electric mint
    accent:       '#14f195',
    accentBg:     'rgba(20,241,149,0.08)',
    accentBorder: 'rgba(20,241,149,0.22)',
    accentFg:     '#08080f',

    // Shadows
    shadow:      '0 1px 3px rgba(0,0,0,0.4), 0 4px 24px rgba(0,0,0,0.2)',
    shadowLg:    '0 8px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
    shadowModal: '0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)',

    // Node category palettes
    nodeColors: {
      input:   { bg: 'rgba(59,130,246,0.12)',  border: '#3b82f6', text: '#93c5fd' },
      process: { bg: 'rgba(139,92,246,0.12)',  border: '#8b5cf6', text: '#c4b5fd' },
      ai:      { bg: 'rgba(20,241,149,0.10)',  border: '#14f195', text: '#6ee7b7' },
      output:  { bg: 'rgba(245,158,11,0.12)',  border: '#f59e0b', text: '#fcd34d' },
      default: { bg: 'rgba(96,96,160,0.12)',   border: '#6060a0', text: '#c0c0e8' },
    },

    // Canvas
    canvasBg:  '#08080f',
    canvasDot: '#1a1a30',
  },

  light: {
    name: 'light',

    // Surfaces — warm parchment
    bg:          '#f7f4ef',
    bgRaised:    '#ffffff',
    bgCard:      '#fdfaf7',
    bgInput:     '#f2ede6',
    bgHover:     '#ede8e0',
    sidebar:     '#f0ece3',

    // Borders — warm
    borderSubtle: '#ebe5dc',
    border:       '#ddd5c8',
    borderStrong: '#c8bfb2',

    // Text — warm charcoal
    text:  '#18140e',
    text2: '#5a5044',
    text3: '#948474',
    text4: '#b8aea0',

    // Accent — warm amber / bronze
    accent:       '#c47b28',
    accentBg:     'rgba(196,123,40,0.07)',
    accentBorder: 'rgba(196,123,40,0.22)',
    accentFg:     '#ffffff',

    // Shadows — soft warm
    shadow:      '0 1px 2px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.07)',
    shadowLg:    '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
    shadowModal: '0 12px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.07)',

    // Node category palettes — saturated for light bg
    nodeColors: {
      input:   { bg: 'rgba(37,99,235,0.07)',   border: '#2563eb', text: '#1d4ed8' },
      process: { bg: 'rgba(124,58,237,0.07)',  border: '#7c3aed', text: '#6d28d9' },
      ai:      { bg: 'rgba(196,123,40,0.08)',  border: '#c47b28', text: '#92580a' },
      output:  { bg: 'rgba(217,119,6,0.08)',   border: '#d97706', text: '#b45309' },
      default: { bg: 'rgba(120,100,80,0.07)',  border: '#8a7a68', text: '#5a4a38' },
    },

    // Canvas
    canvasBg:  '#f7f4ef',
    canvasDot: '#ddd5c8',
  },
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeCtx = createContext({
  theme:       'dark',
  colors:      THEMES.dark,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('flowai-theme') || 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('flowai-theme', theme) } catch {}
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeCtx.Provider value={{ theme, colors: THEMES[theme], toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)