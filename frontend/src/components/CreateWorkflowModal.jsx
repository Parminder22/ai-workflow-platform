import { useState, useEffect, useRef } from 'react'
import { createWorkflow } from '../api/workflowApi'
import { useTheme } from '../theme'

function CreateWorkflowModal({ onClose, onCreated }) {
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const inputRef = useRef(null)
  const { colors, theme } = useTheme()

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Workflow name is required'); return }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return }

    setLoading(true)
    setError('')
    try {
      await createWorkflow(trimmed)
      onCreated?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create workflow')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
      style={{ background: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 animate-slide-up"
        style={{
          background:  colors.bgRaised,
          border:      `1px solid ${colors.border}`,
          boxShadow:   colors.shadowModal,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-lg"
              style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: colors.text, letterSpacing: '-0.01em' }}
            >
              New Workflow
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.text3 }}>
              Give your workflow a descriptive name
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: colors.text3, background: colors.bgHover }}
            onMouseEnter={e => { e.currentTarget.style.color = colors.text }}
            onMouseLeave={e => { e.currentTarget.style.color = colors.text3 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Input */}
        <div className="mb-5">
          <label className="block text-xs mb-1.5" style={{ color: colors.text2, fontWeight: 500 }}>
            Workflow name
          </label>
          <input
            ref={inputRef}
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Document Summarizer"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background:  colors.bgInput,
              border:      `1px solid ${error ? '#ef4444' : colors.border}`,
              color:       colors.text,
              fontFamily:  'Outfit, sans-serif',
            }}
            onFocus={e => { if (!error) e.currentTarget.style.borderColor = colors.accentBorder }}
            onBlur={e  => { if (!error) e.currentTarget.style.borderColor = colors.border }}
          />
          {error && <p className="mt-1.5 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
        </div>

        {/* Suggestions */}
        <div className="mb-5">
          <div className="text-xs mb-2" style={{ color: colors.text4 }}>Suggestions</div>
          <div className="flex flex-wrap gap-1.5">
            {['Document Summarizer', 'Knowledge Indexer', 'Email Notifier', 'Data Extractor'].map(s => (
              <button
                key={s}
                onClick={() => { setName(s); setError('') }}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{ background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text3 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = colors.accentBorder; e.currentTarget.style.color = colors.accent }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.text3 }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm transition-all"
            style={{ background: colors.bgHover, border: `1px solid ${colors.border}`, color: colors.text2, fontWeight: 500 }}
            onMouseEnter={e => e.currentTarget.style.background = colors.bgInput}
            onMouseLeave={e => e.currentTarget.style.background = colors.bgHover}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: loading ? colors.accent + '99' : colors.accent,
              color:      colors.accentFg,
              fontWeight: 700,
              cursor:     loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: colors.accentFg + '50', borderTopColor: colors.accentFg }} />
                Creating...
              </>
            ) : 'Create Workflow'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateWorkflowModal