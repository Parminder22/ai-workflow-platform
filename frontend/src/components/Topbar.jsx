import { useLocation } from 'react-router-dom'
import { useTheme } from '../theme'

const ROUTE_LABELS = {
  '/':          'Dashboard',
  '/workflows': 'Workflows',
  '/jobs':      'Run History',
}

// Sun icon (light mode)
function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

// Moon icon (dark mode)
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function IconButton({ onClick, title, children, colors }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
      style={{ color: colors.text3, background: 'transparent' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = colors.bgHover
        e.currentTarget.style.color = colors.text
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = colors.text3
      }}
    >
      {children}
    </button>
  )
}

function Topbar({ title, actions }) {
  const { pathname } = useLocation()
  const { colors, theme, toggleTheme } = useTheme()

  const rootPath = '/' + (pathname.split('/')[1] || '')
  const label = title || ROUTE_LABELS[rootPath] || 'FlowAI'

  return (
    <header
      className="h-14 flex items-center justify-between px-6 border-b flex-shrink-0"
      style={{
        background:    colors.bgRaised,
        borderColor:   colors.borderSubtle,
        backdropFilter: 'blur(8px)',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: colors.text4 }}>FlowAI</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.text4} strokeWidth="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span className="text-sm" style={{ color: colors.text, fontWeight: 500 }}>{label}</span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {actions}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-150"
          style={{
            background:   colors.accentBg,
            border:       `1px solid ${colors.accentBorder}`,
            color:        colors.accent,
            fontWeight:   500,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {/* Notifications */}
        <IconButton title="Notifications" colors={colors}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </IconButton>

        {/* Help */}
        <IconButton title="Help" colors={colors}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </IconButton>
      </div>
    </header>
  )
}

export default Topbar