import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateWorkflowModal from '../components/CreateWorkflowModal'
import { fetchWorkflows, deleteWorkflow } from '../api/workflowApi'
import { useTheme } from '../theme'

function Workflows() {
  const { colors }                  = useTheme()
  const navigate                    = useNavigate()
  const [workflows, setWorkflows]   = useState([])
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [busyId, setBusyId]         = useState(null)

  useEffect(() => { loadWorkflows() }, [])

  const loadWorkflows = async () => {
    setLoading(true)
    try {
      const res = await fetchWorkflows()
      setWorkflows(res.data)
    } catch (e) {
      console.error('Failed to load workflows', e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    setBusyId(id)
    try {
      await deleteWorkflow(id)
      setWorkflows(wfs => wfs.filter(w => w.id !== id))
    } catch (e) {
      console.error('Delete failed', e)
    } finally {
      setBusyId(null)
      setDeletingId(null)
    }
  }

  const formatDate = (d) => {
    if (!d) return null
    const diff = Date.now() - new Date(d)
    if (diff < 60000)    return 'just now'
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(d).toLocaleDateString()
  }

  return (
    <div className="flex-1 overflow-auto" style={{ background: colors.bg }}>
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl mb-1"
              style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: colors.text, letterSpacing: '-0.02em' }}>
              Workflows
            </h1>
            <p className="text-sm" style={{ color: colors.text3 }}>
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: colors.accent, color: colors.accentFg }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Workflow
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl h-36 animate-pulse"
                style={{ background: colors.bgCard, border: `1px solid ${colors.borderSubtle}` }} />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4" style={{ opacity: 0.15 }}>⚡</div>
            <div className="text-base font-semibold mb-2" style={{ color: colors.text2 }}>No workflows yet</div>
            <div className="text-sm mb-6" style={{ color: colors.text4 }}>Create your first workflow to get started</div>
            <button onClick={() => setOpen(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: colors.accent, color: colors.accentFg }}>
              + New Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map(wf => (
              <WorkflowCard key={wf.id} wf={wf} colors={colors}
                formatDate={formatDate}
                onOpen={() => navigate(`/workflow/${wf.id}`)}
                onDelete={() => setDeletingId(wf.id)}
              />
            ))}
          </div>
        )}
      </div>

      {open && (
        <CreateWorkflowModal onClose={() => setOpen(false)} onCreated={loadWorkflows} />
      )}

      {deletingId && (
        <DeleteConfirm
          workflow={workflows.find(w => w.id === deletingId)}
          busy={busyId === deletingId}
          colors={colors}
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  )
}

function WorkflowCard({ wf, colors, formatDate, onOpen, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const lastRun = formatDate(wf.last_run)

  return (
    <div className="rounded-2xl flex flex-col"
      style={{
        background: colors.bgCard,
        border:     `1px solid ${hovered ? colors.border : colors.borderSubtle}`,
        boxShadow:  hovered ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex-1 p-5 cursor-pointer" onClick={onOpen}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: colors.accentBg, border: `1px solid ${colors.accentBorder}` }}>
            ⚡
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate"
              style={{ color: colors.text, fontFamily: 'Syne, sans-serif' }}>
              {wf.name}
            </div>
            <div className="text-xs mt-0.5" style={{ color: colors.text4 }}>#{wf.id}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors.accent }} />
            <span className="text-xs" style={{ color: colors.text3 }}>
              {wf.node_count || 0} node{wf.node_count !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={colors.text4} strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span className="text-xs" style={{ color: colors.text3 }}>
              {wf.run_count || 0} run{wf.run_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t"
        style={{ borderColor: colors.borderSubtle }}>
        <span className="text-xs" style={{ color: colors.text4 }}>
          {lastRun ? `Last run ${lastRun}` : 'Never run'}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={onOpen}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs"
            style={{ color: colors.accent, background: colors.accentBg, border: `1px solid ${colors.accentBorder}` }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            Open
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="w-6 h-6 flex items-center justify-center rounded-lg"
            style={{ color: colors.text4 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ef444415'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text4 }}
            title="Delete">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirm({ workflow, busy, colors, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl p-6 max-w-sm w-full mx-4 animate-slide-up"
        style={{ background: colors.bgRaised, border: `1px solid ${colors.border}` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
          style={{ background: '#ef444415', border: '1px solid #ef444430' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </div>
        <div className="text-base font-semibold mb-1"
          style={{ color: colors.text, fontFamily: 'Syne, sans-serif' }}>
          Delete "{workflow?.name}"?
        </div>
        <div className="text-sm mb-6" style={{ color: colors.text3 }}>
          This permanently deletes the workflow, all nodes, edges, and run history. Cannot be undone.
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.text2 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#ef4444', color: '#fff', opacity: busy ? 0.7 : 1 }}>
            {busy
              ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />Deleting…</>
              : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Workflows