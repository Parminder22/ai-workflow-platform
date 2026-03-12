import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWorkflows } from '../api/workflowApi'
import { useTheme } from '../theme'

const QUICK_START = [
  {
    title:       'Document Summarizer',
    description: 'Upload → Extract → AI Summarize → Save',
    icon:        '📄',
    nodes:       ['Upload Document', 'Extract Text', 'AI Summarize', 'Save to DB'],
  },
  {
    title:       'Knowledge Indexer',
    description: 'Upload → Chunk → Embed → Vector Store',
    icon:        '🧠',
    nodes:       ['Upload Document', 'Chunk Text', 'Generate Embeddings', 'Vector Store'],
  },
  {
    title:       'Email Notifier',
    description: 'Webhook → Extract Fields → Send Email',
    icon:        '📧',
    nodes:       ['Webhook Trigger', 'Extract Fields', 'Send Email'],
  },
]

function StatCard({ label, value, icon, accentColor, colors }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="rounded-xl p-5 border transition-all duration-200"
      style={{
        background:   hovered ? colors.bgHover : colors.bgCard,
        borderColor:  colors.border,
        boxShadow:    hovered ? colors.shadowLg : colors.shadow,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
          style={{ background: colors.bgHover }}
        >
          {icon}
        </div>
        <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ background: accentColor }} />
      </div>
      <div
        className="text-2xl mb-0.5"
        style={{ color: accentColor, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}
      >
        {value ?? '—'}
      </div>
      <div className="text-xs" style={{ color: colors.text3, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  )
}

function Dashboard() {
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading]     = useState(true)
  const navigate = useNavigate()
  const { colors, theme } = useTheme()

  // Accent alternatives for stat cards
  const statAccents = [colors.accent, '#3b82f6', '#8b5cf6', '#f59e0b']

  useEffect(() => {
    fetchWorkflows()
      .then(res => setWorkflows(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Workflows',     value: workflows.length, icon: '⚡' },
    { label: 'Nodes Available',value: 16,              icon: '🧩' },
    { label: 'AI Models',     value: 4,                icon: '🧠' },
    { label: 'Status',        value: 'Active',         icon: '✅' },
  ]

  return (
    <div style={{ background: colors.bg, minHeight: '100%', transition: 'background 0.25s ease' }}>
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl mb-2"
            style={{
              fontFamily:    'Syne, sans-serif',
              fontWeight:    700,
              color:         colors.text,
              letterSpacing: '-0.02em',
            }}
          >
            Good morning 👋
          </h1>
          <p style={{ color: colors.text3, fontSize: '14px' }}>
            Build, run, and monitor your AI document workflows.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
          {stats.map((s, i) => (
            <StatCard
              key={s.label}
              {...s}
              accentColor={statAccents[i]}
              colors={colors}
            />
          ))}
        </div>

        {/* Two-column */}
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 320px' }}>

          {/* Recent workflows */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-base"
                style={{ fontFamily: 'Syne, sans-serif', color: colors.text, fontWeight: 600 }}
              >
                Recent Workflows
              </h2>
              <button
                onClick={() => navigate('/workflows')}
                className="text-xs transition-colors"
                style={{ color: colors.accent }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                View all →
              </button>
            </div>

            <div
              className="rounded-xl border overflow-hidden"
              style={{ background: colors.bgRaised, borderColor: colors.border, boxShadow: colors.shadow }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div
                    className="w-5 h-5 rounded-full border-2 animate-spin"
                    style={{ borderColor: colors.border, borderTopColor: colors.accent }}
                  />
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-3">⚡</div>
                  <div className="text-sm mb-1" style={{ color: colors.text2, fontWeight: 500 }}>
                    No workflows yet
                  </div>
                  <div className="text-xs mb-4" style={{ color: colors.text3 }}>
                    Create your first workflow to get started
                  </div>
                  <button
                    onClick={() => navigate('/workflows')}
                    className="px-4 py-2 rounded-lg text-xs transition-all"
                    style={{
                      background:  colors.accentBg,
                      border:      `1px solid ${colors.accentBorder}`,
                      color:       colors.accent,
                      fontWeight:  600,
                    }}
                  >
                    Create Workflow
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                      {['Name', 'Created', 'Actions'].map(h => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 uppercase tracking-wider"
                          style={{ color: colors.text4, fontWeight: 500, fontSize: '10px' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.slice(0, 6).map((wf, i) => (
                      <tr
                        key={wf.id}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: i < Math.min(workflows.length, 6) - 1 ? `1px solid ${colors.borderSubtle}` : 'none' }}
                        onClick={() => navigate(`/workflow/${wf.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = colors.bgHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: colors.accent }} />
                            <span className="text-sm" style={{ color: colors.text, fontWeight: 500 }}>
                              {wf.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: colors.text3 }}>
                          {wf.created_at
                            ? new Date(wf.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="text-xs px-2.5 py-1 rounded-md transition-all"
                            style={{
                              background:  colors.accentBg,
                              border:      `1px solid ${colors.accentBorder}`,
                              color:       colors.accent,
                            }}
                            onClick={e => { e.stopPropagation(); navigate(`/workflow/${wf.id}`) }}
                          >
                            Open →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick start */}
          <div>
            <h2
              className="text-base mb-4"
              style={{ fontFamily: 'Syne, sans-serif', color: colors.text, fontWeight: 600 }}
            >
              Quick Start
            </h2>
            <div className="space-y-3">
              {QUICK_START.map(t => (
                <div
                  key={t.title}
                  className="rounded-xl p-4 border cursor-pointer transition-all duration-200"
                  style={{ background: colors.bgCard, borderColor: colors.border, boxShadow: colors.shadow }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = colors.accentBorder
                    e.currentTarget.style.background  = colors.bgHover
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.background  = colors.bgCard
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: colors.bgHover }}
                    >
                      {t.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm mb-1" style={{ color: colors.text, fontWeight: 600 }}>
                        {t.title}
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: colors.text3 }}>
                        {t.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {t.nodes.map((node, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-md"
                        style={{
                          background: colors.bgHover,
                          color:      colors.text3,
                          border:     `1px solid ${colors.borderSubtle}`,
                          fontSize:   '10px',
                        }}
                      >
                        {node}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Dashboard