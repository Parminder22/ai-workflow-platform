import { useState } from 'react'
import { STEP_TYPES_BY_CATEGORY, CATEGORY_LABELS, STEP_TYPES } from '../constants/stepTypes'
import { useTheme } from '../theme'

const CATEGORY_ORDER = ['input', 'process', 'ai', 'output']

function NodeCard({ step, colors, onDragStart }) {
  const [hovered, setHovered] = useState(false)
  const nodeColor = colors.nodeColors[step.category] || colors.nodeColors.default

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all"
      style={{
        background: hovered ? nodeColor.bg    : colors.bgHover,
        border:     `1px solid ${hovered ? nodeColor.border + '50' : colors.borderSubtle}`,
      }}
      draggable
      onDragStart={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={step.description}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: nodeColor.bg, border: `1px solid ${nodeColor.border}25` }}
      >
        {step.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs truncate" style={{ color: colors.text, fontWeight: 500, lineHeight: 1.3 }}>
          {step.label}
        </div>
      </div>
      {/* Drag dots */}
      <div className="flex flex-col gap-0.5 opacity-30 flex-shrink-0">
        {[0,1,2].map(i => (
          <div key={i} className="flex gap-0.5">
            {[0,1].map(j => (
              <div key={j} className="w-0.5 h-0.5 rounded-full" style={{ background: colors.text3 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function NodeSidebar() {
  const [search, setSearch]       = useState('')
  const [collapsed, setCollapsed] = useState({})
  const { colors } = useTheme()

  const toggleCategory = cat =>
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))

  const onDragStart = (event, step) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({
        type:     'workflowNode',
        label:    step.label,
        nodeType: step.id,
        category: step.category,
        icon:     step.icon,
        config:   step.config || {},
      })
    )
    event.dataTransfer.effectAllowed = 'move'
  }

  const query = search.toLowerCase()
  const filteredByCategory = {}

  if (query) {
    STEP_TYPES
      .filter(s => s.label.toLowerCase().includes(query) || s.description.toLowerCase().includes(query))
      .forEach(s => {
        if (!filteredByCategory[s.category]) filteredByCategory[s.category] = []
        filteredByCategory[s.category].push(s)
      })
  } else {
    Object.assign(filteredByCategory, STEP_TYPES_BY_CATEGORY)
  }

  const hasResults = Object.values(filteredByCategory).some(a => a.length > 0)

  return (
    <aside
      className="w-56 flex flex-col border-r overflow-hidden flex-shrink-0"
      style={{
        background:  colors.sidebar,
        borderColor: colors.border,
        minHeight:   '100%',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b flex-shrink-0" style={{ borderColor: colors.borderSubtle }}>
        <div
          className="uppercase tracking-widest mb-3"
          style={{ color: colors.text4, fontSize: '9px', fontWeight: 600 }}
        >
          Node Library
        </div>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            width="11" height="11" viewBox="0 0 24 24"
            fill="none" stroke={colors.text4} strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs outline-none transition-all"
            style={{
              background:  colors.bgInput,
              border:      `1px solid ${colors.border}`,
              color:       colors.text,
              fontFamily:  'Outfit, sans-serif',
            }}
            onFocus={e => e.currentTarget.style.borderColor = colors.accentBorder}
            onBlur={e  => e.currentTarget.style.borderColor = colors.border}
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {!hasResults ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-xs" style={{ color: colors.text3 }}>
              No nodes match &ldquo;{search}&rdquo;
            </div>
          </div>
        ) : (
          CATEGORY_ORDER.map(cat => {
            const steps = filteredByCategory[cat] || []
            if (steps.length === 0) return null
            const nodeColor   = colors.nodeColors[cat]
            const isCollapsed = collapsed[cat]

            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center gap-2 mb-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: nodeColor.border }} />
                  <span
                    className="flex-1 text-left uppercase tracking-wider"
                    style={{ color: nodeColor.text, fontWeight: 600, fontSize: '9px' }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <svg
                    width="10" height="10" viewBox="0 0 24 24"
                    fill="none" stroke={nodeColor.text} strokeWidth="2.5"
                    style={{
                      opacity: 0.5,
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {!isCollapsed && (
                  <div className="space-y-1">
                    {steps.map(step => (
                      <NodeCard
                        key={step.id}
                        step={step}
                        colors={colors}
                        onDragStart={e => onDragStart(e, step)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: colors.borderSubtle }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: colors.text4 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Drag nodes onto the canvas
        </div>
      </div>
    </aside>
  )
}

export default NodeSidebar