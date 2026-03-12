import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllRuns } from '../api/workflowApi'
import { useTheme } from '../theme'

function RunHistory() {
  const { colors }          = useTheme()
  const navigate            = useNavigate()
  const [runs, setRuns]     = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter]   = useState('all') // all | success | partial | failed

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchAllRuns()
      setRuns(res.data)
    } catch (e) {
      console.error('Failed to load runs', e)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d) => {
    if (!d) return '—'
    const date = new Date(d)
    const diff = Date.now() - date
    if (diff < 60000)    return 'just now'
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleString()
  }

  const duration = (r) => {
    if (!r.started_at || !r.finished_at) return null
    const ms = new Date(r.finished_at) - new Date(r.started_at)
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const statusStyle = (status) => {
    switch (status) {
      case 'success': return { bg: colors.accentBg, border: colors.accentBorder, text: colors.accent, dot: colors.accent }
      case 'partial': return { bg: '#f59e0b15', border: '#f59e0b30', text: '#f59e0b', dot: '#f59e0b' }
      case 'failed':  return { bg: '#ef444415', border: '#ef444430', text: '#ef4444', dot: '#ef4444' }
      default:        return { bg: colors.bgHover, border: colors.borderSubtle, text: colors.text3, dot: colors.text4 }
    }
  }

  const filtered = filter === 'all' ? runs : runs.filter(r => r.status === filter)

  const counts = {
    all:     runs.length,
    success: runs.filter(r => r.status === 'success').length,
    partial: runs.filter(r => r.status === 'partial').length,
    failed:  runs.filter(r => r.status === 'failed').length,
  }

  return (
    <div className="flex-1 overflow-auto" style={{ background: colors.bg }}>
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl mb-1"
            style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: colors.text, letterSpacing: '-0.02em' }}>
            Run History
          </h1>
          <p className="text-sm" style={{ color: colors.text3 }}>
            All workflow executions across your account
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit"
          style={{ background: colors.bgCard, border: `1px solid ${colors.borderSubtle}` }}>
          {['all', 'success', 'partial', 'failed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
              style={{
                background: filter === f ? colors.bgRaised : 'transparent',
                color:      filter === f ? colors.text : colors.text3,
                boxShadow:  filter === f ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                border:     filter === f ? `1px solid ${colors.borderSubtle}` : '1px solid transparent',
              }}
            >
              {f}
              <span className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: colors.bgHover, color: colors.text4 }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse"
                style={{ background: colors.bgCard, border: `1px solid ${colors.borderSubtle}` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4" style={{ opacity: 0.15 }}>📋</div>
            <div className="text-sm font-medium mb-1" style={{ color: colors.text3 }}>
              {filter === 'all' ? 'No runs yet' : `No ${filter} runs`}
            </div>
            <div className="text-xs" style={{ color: colors.text4 }}>
              Run a workflow from the editor to see results here
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(run => {
              const s    = statusStyle(run.status)
              const isEx = expanded === run.id
              let log    = []
              try { log = typeof run.steps_log === 'string' ? JSON.parse(run.steps_log) : (run.steps_log || []) } catch {}

              return (
                <div key={run.id} className="rounded-xl overflow-hidden transition-all"
                  style={{ background: colors.bgCard, border: `1px solid ${isEx ? colors.border : colors.borderSubtle}` }}>

                  {/* Row */}
                  <button
                    className="w-full flex items-center gap-4 px-4 py-3.5 text-left"
                    onClick={() => setExpanded(isEx ? null : run.id)}
                  >
                    {/* Status dot */}
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} />

                    {/* Workflow name */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: colors.text }}>
                        {run.workflow_name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: colors.text4 }}>
                        {log.length} step{log.length !== 1 ? 's' : ''} · {formatDate(run.started_at)}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 capitalize"
                      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
                      {run.status}
                    </span>

                    {/* Duration */}
                    {duration(run) && (
                      <span className="text-xs flex-shrink-0" style={{ color: colors.text4 }}>
                        {duration(run)}
                      </span>
                    )}

                    {/* Expand arrow */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.text4} strokeWidth="2"
                      style={{ flexShrink: 0, transform: isEx ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>

                    {/* Jump to editor */}
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/workflow/${run.workflow_id}`) }}
                      className="flex-shrink-0 text-xs px-2 py-1 rounded-lg transition-all"
                      style={{ color: colors.text3, border: `1px solid ${colors.borderSubtle}` }}
                      onMouseEnter={e => { e.currentTarget.style.color = colors.accent; e.currentTarget.style.borderColor = colors.accentBorder }}
                      onMouseLeave={e => { e.currentTarget.style.color = colors.text3; e.currentTarget.style.borderColor = colors.borderSubtle }}
                    >
                      Open →
                    </button>
                  </button>

                  {/* Expanded log */}
                  {isEx && (
                    <div className="border-t px-4 py-4 space-y-2"
                      style={{ borderColor: colors.borderSubtle }}>
                      {run.error && (
                        <div className="rounded-lg px-3 py-2 text-xs"
                          style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444' }}>
                          {run.error}
                        </div>
                      )}
                      {log.length === 0 ? (
                        <div className="text-xs text-center py-2" style={{ color: colors.text4 }}>No step logs available</div>
                      ) : log.map((step, i) => (
                        <StepLogRow key={i} step={step} colors={colors} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StepLogRow({ step, colors }) {
  const [open, setOpen] = useState(false)
  const isErr = step.status === 'error'

  const preview = () => {
    const o = step.output
    if (!o) return null
    return o.summary?.slice(0, 100)
      || o.text?.slice(0, 100)
      || o.category
      || o.message
      || (o.chunks ? `${o.chunks.length} chunks` : null)
      || (o.pairs  ? `${o.pairs.length} pairs`  : null)
      || null
  }

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${isErr ? '#ef444430' : colors.borderSubtle}`, background: colors.bgHover }}>
      <button className="w-full flex items-center gap-3 px-3 py-2 text-left" onClick={() => setOpen(o => !o)}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: isErr ? '#ef444420' : colors.accentBg, color: isErr ? '#ef4444' : colors.accent }}>
          {isErr ? '✕' : '✓'}
        </span>
        <span className="text-xs font-medium flex-1 truncate" style={{ color: colors.text }}>{step.label}</span>
        <span className="text-xs flex-shrink-0 font-mono" style={{ color: colors.text4 }}>{step.type}</span>
        {step.durationMs != null && (
          <span className="text-xs flex-shrink-0" style={{ color: colors.text4 }}>{step.durationMs}ms</span>
        )}
        {preview() && !open && (
          <span className="text-xs flex-shrink-0 max-w-32 truncate" style={{ color: colors.text3 }}>
            {preview()}
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={colors.text4} strokeWidth="2"
          style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {open && step.output && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: colors.borderSubtle }}>
          <pre className="text-xs mt-2 leading-relaxed overflow-x-auto"
            style={{ color: colors.text2, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto' }}>
            {JSON.stringify(step.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default RunHistory