import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../theme'

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    to: '/workflows',
    label: 'Workflows',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
        <path d="M12 7v4M8.5 17l3.5-6 3.5 6"/>
      </svg>
    ),
  },
  {
    to: '/jobs',
    label: 'Run History',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
]

function Sidebar() {
  const { pathname } = useLocation()
  const { colors, theme } = useTheme()

  return (
    <aside
      className="w-60 flex flex-col border-r flex-shrink-0"
      style={{
        background: colors.sidebar,
        borderColor: colors.border,
        minHeight: '100vh',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 px-5 py-5 border-b"
        style={{ borderColor: colors.borderSubtle }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: colors.accentBg, border: `1px solid ${colors.accentBorder}` }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div>
          <span
            className="text-sm"
            style={{ color: colors.text, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.01em' }}
          >
            FlowAI
          </span>
          <div className="text-xs" style={{ color: colors.text4, marginTop: '-1px', fontSize: '10px' }}>
            Workflow Studio
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <div
          className="px-2 pb-2 uppercase tracking-widest"
          style={{ color: colors.text4, fontSize: '9px', fontWeight: 600 }}
        >
          Navigate
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)

          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150"
              style={{
                background: isActive ? colors.accentBg : 'transparent',
                color:      isActive ? colors.accent   : colors.text3,
                border:     `1px solid ${isActive ? colors.accentBorder : 'transparent'}`,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = colors.bgHover
                  e.currentTarget.style.color = colors.text
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = colors.text3
                }
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.65 }}>{item.icon}</span>
              <span className="text-sm" style={{ fontWeight: 500 }}>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: colors.accent }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: colors.borderSubtle }}>
        <div
          className="flex items-center gap-3 rounded-lg px-2 py-2"
          style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #14f195, #3b82f6)', color: '#08080f', fontWeight: 700 }}
          >
            PS
          </div>
          <div className="min-w-0">
            <div className="text-xs truncate" style={{ color: colors.text, fontWeight: 600 }}>Parminder Singh</div>
            <div className="text-xs truncate" style={{ color: colors.text4, fontSize: '10px' }}>Builder</div>
          </div>
        </div>
        <div className="mt-3 text-center" style={{ color: colors.text4, fontSize: '10px', letterSpacing: '0.02em' }}>
          By <span style={{ color: colors.accent, fontWeight: 600 }}>Parminder Singh</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar