import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  MarkerType,
} from 'reactflow'
import axios from 'axios'
import { useParams, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState, memo } from 'react'
import 'reactflow/dist/style.css'

import NodeSidebar from '../components/NodeSidebar'
import { getStepType } from '../constants/stepTypes'
import { useTheme } from '../theme'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4001'

// ── Toast System ─────────────────────────────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((type, title, message) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

function Toast({ toasts, removeToast }) {
  const { colors } = useTheme()

  const typeColor = {
    success: colors.accent,
    error:   '#ef4444',
    info:    '#3b82f6',
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none" style={{ minWidth: 280 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-3 px-4 py-3 rounded-xl pointer-events-auto animate-toast-in"
          style={{
            background:  colors.bgRaised,
            border:      `1px solid ${typeColor[t.type] || colors.border}30`,
            boxShadow:   colors.shadowLg,
          }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
            style={{
              background: (typeColor[t.type] || colors.border) + '20',
              color:       typeColor[t.type] || colors.text3,
            }}
          >
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'i'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs" style={{ color: colors.text, fontWeight: 600 }}>{t.title}</div>
            {t.message && <div className="text-xs mt-0.5" style={{ color: colors.text3 }}>{t.message}</div>}
          </div>
          <button onClick={() => removeToast(t.id)} className="text-xs flex-shrink-0" style={{ color: colors.text4 }}>✕</button>
        </div>
      ))}
    </div>
  )
}

// ── Custom Node ───────────────────────────────────────────────────────────────

const WorkflowNode = memo(({ data, selected }) => {
  const { colors } = useTheme()
  const nodeColor = colors.nodeColors[data.category] || colors.nodeColors.default

  const handleStyle = {
    background:   nodeColor.border + '80',
    border:       `2px solid ${nodeColor.border}`,
    width:        8,
    height:       8,
  }

  return (
    <div
      className="workflow-node"
      style={{
        borderColor: selected ? nodeColor.border : nodeColor.border + '50',
        boxShadow:   selected
          ? `0 0 0 2px ${nodeColor.border}25, 0 4px 20px rgba(0,0,0,0.15)`
          : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ ...handleStyle, top: -4 }} />

      <div className="node-header">
        <div
          className="node-icon"
          style={{ background: nodeColor.bg, border: `1px solid ${nodeColor.border}30` }}
        >
          {data.icon || '⚡'}
        </div>
        <div className="node-label">{data.label}</div>
      </div>

      <div className="node-type-badge" style={{ color: nodeColor.text + 'aa' }}>
        {data.category || 'default'}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4 }} />
    </div>
  )
})

const nodeTypes = { workflowNode: WorkflowNode }

// ── Context Menu ──────────────────────────────────────────────────────────────

function ContextMenu({ menu, onDelete, onClose, colors }) {
  return (
    <div
      style={{ position: 'absolute', top: menu.y, left: menu.x, zIndex: 100 }}
      className="animate-fade-in"
      onClick={e => e.stopPropagation()}
    >
      <div
        className="rounded-xl overflow-hidden py-1"
        style={{
          background: colors.bgRaised,
          border:     `1px solid ${colors.border}`,
          boxShadow:  colors.shadowLg,
          minWidth:   160,
        }}
      >
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors"
          style={{ color: '#ef4444' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
          Delete Node
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors"
          style={{ color: colors.text2 }}
          onMouseEnter={e => e.currentTarget.style.background = colors.bgHover}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Config field primitives ───────────────────────────────────────────────────

function CfgLabel({ children, colors }) {
  return (
    <label className="block text-xs mb-1.5" style={{ color: colors.text2, fontWeight: 500 }}>
      {children}
    </label>
  )
}

function CfgInput({ value, onChange, placeholder, colors, nodeColor, type = 'text' }) {
  return (
    <input
      type={type}
      className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all"
      style={{ background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, fontFamily: 'Outfit, sans-serif' }}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={e => e.target.style.borderColor = nodeColor.border + '80'}
      onBlur={e  => e.target.style.borderColor = colors.border}
    />
  )
}

function CfgTextarea({ value, onChange, placeholder, colors, nodeColor, rows = 4 }) {
  return (
    <textarea
      rows={rows}
      className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all resize-none"
      style={{ background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, fontFamily: 'Outfit, sans-serif', lineHeight: 1.6 }}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={e => e.target.style.borderColor = nodeColor.border + '80'}
      onBlur={e  => e.target.style.borderColor = colors.border}
    />
  )
}

function CfgSelect({ value, onChange, options, colors, nodeColor }) {
  return (
    <select
      className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all"
      style={{ background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, fontFamily: 'Outfit, sans-serif' }}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      onFocus={e => e.target.style.borderColor = nodeColor.border + '80'}
      onBlur={e  => e.target.style.borderColor = colors.border}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: colors.bgInput }}>{o.label}</option>
      ))}
    </select>
  )
}

function CfgSlider({ value, onChange, min, max, step = 1, label, colors, nodeColor }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs" style={{ color: colors.text2, fontWeight: 500 }}>{label}</span>
        <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: nodeColor.bg, color: nodeColor.text }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value ?? min}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: nodeColor.border }}
      />
      <div className="flex justify-between text-xs mt-0.5" style={{ color: colors.text4 }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

function CfgDivider({ colors }) {
  return <div style={{ height: 1, background: colors.borderSubtle, margin: '2px 0' }} />
}

// ── File Upload field ─────────────────────────────────────────────────────────

function FileUploadField({ config, onUpdateConfig, colors, nodeColor }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const fileInputRef = useRef(null)

  const doUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await axios.post(`${API}/api/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onUpdateConfig({
        filePath: res.data.path,
        fileId:   res.data.fileId,
        filename: res.data.filename,
        mimetype: res.data.mimetype,
        size:     res.data.size,
      })
    } catch (err) {
      console.error('Upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  const onFileChange = e => { if (e.target.files[0]) doUpload(e.target.files[0]) }
  const onDrop = e => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files[0]) doUpload(e.dataTransfer.files[0])
  }

  const hasFile = !!config?.filename

  return (
    <div>
      <CfgLabel colors={colors}>File</CfgLabel>

      {hasFile ? (
        <div className="rounded-lg p-3 flex items-start gap-2.5"
          style={{ background: nodeColor.bg, border: `1px solid ${nodeColor.border}30` }}>
          <div className="text-base mt-0.5">📄</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: nodeColor.text }}>{config.filename}</div>
            <div className="text-xs mt-0.5" style={{ color: colors.text3 }}>
              {config.mimetype} · {config.size ? (config.size / 1024).toFixed(1) + ' KB' : ''}
            </div>
          </div>
          <button
            onClick={() => onUpdateConfig({ filePath: null, fileId: null, filename: null, mimetype: null, size: null })}
            className="text-xs flex-shrink-0"
            style={{ color: '#ef444480' }}
            onMouseEnter={e => e.target.style.color = '#ef4444'}
            onMouseLeave={e => e.target.style.color = '#ef444480'}
          >✕</button>
        </div>
      ) : (
        <div
          className="rounded-lg p-4 text-center cursor-pointer transition-all"
          style={{
            border:     `1.5px dashed ${dragOver ? nodeColor.border : colors.border}`,
            background: dragOver ? nodeColor.bg : colors.bgInput,
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: nodeColor.border + '40', borderTopColor: nodeColor.border }} />
              <span className="text-xs" style={{ color: colors.text3 }}>Uploading…</span>
            </div>
          ) : (
            <>
              <div className="text-lg mb-1">📁</div>
              <div className="text-xs font-medium" style={{ color: colors.text2 }}>
                Drop file or click to browse
              </div>
              <div className="text-xs mt-0.5" style={{ color: colors.text4 }}>
                PDF, DOCX, TXT, CSV · max 50 MB
              </div>
            </>
          )}
        </div>
      )}

      <input ref={fileInputRef} type="file" className="hidden"
        accept=".pdf,.docx,.doc,.txt,.md,.csv"
        onChange={onFileChange}
      />
    </div>
  )
}

// ── Per-node config fields ────────────────────────────────────────────────────

function NodeConfigFields({ node, onUpdateConfig, colors, nodeColor }) {
  const cfg = node.data.config || {}
  const upd = (key, val) => onUpdateConfig({ ...cfg, [key]: val })

  const GROK_MODELS = [
    { value: 'llama-3.3-70b-versatile',  label: 'Llama 3.3 70B (recommended)' },
    { value: 'llama-3.1-8b-instant',     label: 'Llama 3.1 8B (fastest)' },
    { value: 'mixtral-8x7b-32768',       label: 'Mixtral 8x7B (long context)' },
    { value: 'gemma2-9b-it',             label: 'Gemma 2 9B' },
  ]

  const AiCommon = () => (
    <>
      <CfgDivider colors={colors} />
      <div>
        <CfgLabel colors={colors}>Model</CfgLabel>
        <CfgSelect
          value={cfg.model || 'llama-3.3-70b-versatile'}
          onChange={v => upd('model', v)}
          options={GROK_MODELS}
          colors={colors} nodeColor={nodeColor}
        />
      </div>
      <CfgSlider
        label="Temperature"
        value={cfg.temperature ?? 0.7}
        onChange={v => upd('temperature', v)}
        min={0} max={2} step={0.1}
        colors={colors} nodeColor={nodeColor}
      />
      <div>
        <CfgLabel colors={colors}>System Prompt (optional)</CfgLabel>
        <CfgTextarea
          value={cfg.systemPrompt || ''}
          onChange={v => upd('systemPrompt', v)}
          placeholder="Override the default system prompt…"
          rows={3} colors={colors} nodeColor={nodeColor}
        />
      </div>
    </>
  )

  switch (node.data.nodeType) {

    // ── Input ──────────────────────────────────────────────────────────────

    case 'upload':
      return (
        <FileUploadField
          config={cfg}
          onUpdateConfig={onUpdateConfig}
          colors={colors} nodeColor={nodeColor}
        />
      )

    case 'webhook':
      return (
        <>
          <div>
            <CfgLabel colors={colors}>Webhook Path</CfgLabel>
            <CfgInput value={cfg.path || ''} onChange={v => upd('path', v)}
              placeholder="/webhook/my-trigger" colors={colors} nodeColor={nodeColor} />
          </div>
          <div>
            <CfgLabel colors={colors}>Secret Token (optional)</CfgLabel>
            <CfgInput value={cfg.secret || ''} onChange={v => upd('secret', v)}
              placeholder="Validate incoming requests" colors={colors} nodeColor={nodeColor} />
          </div>
        </>
      )

    case 'schedule':
      return (
        <>
          <div>
            <CfgLabel colors={colors}>Cron Expression</CfgLabel>
            <CfgInput value={cfg.cron || '0 9 * * 1-5'} onChange={v => upd('cron', v)}
              placeholder="0 9 * * 1-5" colors={colors} nodeColor={nodeColor} />
            <div className="mt-1 text-xs" style={{ color: colors.text4 }}>
              {cfg.cron === '0 9 * * 1-5' || !cfg.cron ? 'Weekdays at 9 AM' : ''}
            </div>
          </div>
          <div>
            <CfgLabel colors={colors}>Timezone</CfgLabel>
            <CfgInput value={cfg.timezone || 'UTC'} onChange={v => upd('timezone', v)}
              placeholder="UTC" colors={colors} nodeColor={nodeColor} />
          </div>
        </>
      )

    // ── Processing ─────────────────────────────────────────────────────────

    case 'extract_text':
      return (
        <div className="rounded-lg p-3 text-xs" style={{ background: nodeColor.bg, border: `1px solid ${nodeColor.border}20`, color: nodeColor.text }}>
          Automatically extracts text from the file passed by the Upload Document node. Supports PDF, DOCX, TXT, CSV.
        </div>
      )

    case 'chunk':
      return (
        <>
          <CfgSlider label="Chunk Size (words)" value={cfg.chunkSize ?? 512}
            onChange={v => upd('chunkSize', v)} min={64} max={2048} step={64}
            colors={colors} nodeColor={nodeColor} />
          <CfgSlider label="Overlap (words)" value={cfg.overlap ?? 64}
            onChange={v => upd('overlap', v)} min={0} max={512} step={16}
            colors={colors} nodeColor={nodeColor} />
        </>
      )

    case 'clean':
      return (
        <div className="rounded-lg p-3 text-xs" style={{ background: nodeColor.bg, border: `1px solid ${nodeColor.border}20`, color: nodeColor.text }}>
          Strips extra whitespace, non-printable characters, and normalises line endings. No configuration needed.
        </div>
      )

    case 'transform':
      return (
        <div>
          <CfgLabel colors={colors}>Template</CfgLabel>
          <CfgTextarea value={cfg.template || '{{text}}'} onChange={v => upd('template', v)}
            placeholder="Use {{text}} as the upstream text placeholder"
            rows={4} colors={colors} nodeColor={nodeColor} />
          <div className="mt-1 text-xs" style={{ color: colors.text4 }}>Use {'{{text}}'} to reference upstream output</div>
        </div>
      )

    // ── AI ─────────────────────────────────────────────────────────────────

    case 'summarize':
      return (
        <>
          <div>
            <CfgLabel colors={colors}>Summary Style</CfgLabel>
            <CfgSelect value={cfg.style || 'paragraph'} onChange={v => upd('style', v)}
              options={[
                { value: 'paragraph', label: 'Paragraph' },
                { value: 'bullet',    label: 'Bullet Points' },
                { value: 'tldr',      label: 'TL;DR (2-3 sentences)' },
              ]}
              colors={colors} nodeColor={nodeColor}
            />
          </div>
          <AiCommon />
        </>
      )

    case 'classify':
      return (
        <>
          <div>
            <CfgLabel colors={colors}>Categories</CfgLabel>
            <CfgInput value={cfg.categories || 'positive, negative, neutral'}
              onChange={v => upd('categories', v)}
              placeholder="comma separated list" colors={colors} nodeColor={nodeColor} />
            <div className="mt-1 text-xs" style={{ color: colors.text4 }}>Separate with commas</div>
          </div>
          <AiCommon />
        </>
      )

    case 'extract_fields':
      return (
        <>
          <div>
            <CfgLabel colors={colors}>Fields to Extract</CfgLabel>
            <CfgInput value={cfg.fields || 'name, date, amount, summary'}
              onChange={v => upd('fields', v)}
              placeholder="name, date, amount, email…" colors={colors} nodeColor={nodeColor} />
            <div className="mt-1 text-xs" style={{ color: colors.text4 }}>Comma-separated field names</div>
          </div>
          <AiCommon />
        </>
      )

    case 'qa':
      return (
        <>
          <CfgSlider label="Number of Q&A Pairs" value={cfg.count ?? 5}
            onChange={v => upd('count', v)} min={1} max={20} step={1}
            colors={colors} nodeColor={nodeColor} />
          <AiCommon />
        </>
      )

    case 'embedding':
      return (
        <>
          <div className="rounded-lg p-3 text-xs" style={{ background: nodeColor.bg, border: `1px solid ${nodeColor.border}20`, color: nodeColor.text }}>
            ⚠️ Grok/xAI doesn't expose an embeddings API yet. Connect OpenAI or use chunks directly into a vector store.
          </div>
          <div>
            <CfgLabel colors={colors}>Model (when available)</CfgLabel>
            <CfgInput value={cfg.model || 'text-embedding-3-small'}
              onChange={v => upd('model', v)}
              placeholder="text-embedding-3-small" colors={colors} nodeColor={nodeColor} />
          </div>
        </>
      )

    // ── Output ─────────────────────────────────────────────────────────────

    case 'store':
      return (
        <div>
          <CfgLabel colors={colors}>Target Table</CfgLabel>
          <CfgInput value={cfg.table || 'results'} onChange={v => upd('table', v)}
            placeholder="results" colors={colors} nodeColor={nodeColor} />
        </div>
      )

    case 'vector_store':
      return (
        <>
          <div>
            <CfgLabel colors={colors}>Collection / Index Name</CfgLabel>
            <CfgInput value={cfg.collection || 'documents'} onChange={v => upd('collection', v)}
              placeholder="documents" colors={colors} nodeColor={nodeColor} />
          </div>
          <div>
            <CfgLabel colors={colors}>Provider</CfgLabel>
            <CfgSelect value={cfg.provider || 'pinecone'} onChange={v => upd('provider', v)}
              options={[
                { value: 'pinecone',  label: 'Pinecone' },
                { value: 'weaviate', label: 'Weaviate' },
                { value: 'pgvector', label: 'pgvector (local)' },
              ]}
              colors={colors} nodeColor={nodeColor}
            />
          </div>
        </>
      )

    case 'notify':
      return (
        <>
          <div>
            <CfgLabel colors={colors}>To</CfgLabel>
            <CfgInput value={cfg.to || ''} onChange={v => upd('to', v)}
              placeholder="recipient@example.com" type="email" colors={colors} nodeColor={nodeColor} />
          </div>
          <div>
            <CfgLabel colors={colors}>Subject</CfgLabel>
            <CfgInput value={cfg.subject || ''} onChange={v => upd('subject', v)}
              placeholder="Workflow Complete" colors={colors} nodeColor={nodeColor} />
          </div>
          <div>
            <CfgLabel colors={colors}>Body</CfgLabel>
            <CfgTextarea value={cfg.body || 'Your workflow has finished.\n\n{{output}}'} onChange={v => upd('body', v)}
              placeholder="Use {{output}} to include upstream data"
              rows={4} colors={colors} nodeColor={nodeColor} />
            <div className="mt-1 text-xs" style={{ color: colors.text4 }}>{'{{output}}'} injects upstream node result</div>
          </div>
          <div className="rounded-lg p-2.5 text-xs" style={{ background: colors.bgHover, border: `1px solid ${colors.borderSubtle}`, color: colors.text3 }}>
            Set <code>EMAIL_USER</code> + <code>EMAIL_PASS</code> (Gmail app password) in your <code>.env</code>
          </div>
        </>
      )

    case 'webhook_out':
      return (
        <>
          <div>
            <CfgLabel colors={colors}>URL</CfgLabel>
            <CfgInput value={cfg.url || ''} onChange={v => upd('url', v)}
              placeholder="https://hooks.example.com/…" colors={colors} nodeColor={nodeColor} />
          </div>
          <div>
            <CfgLabel colors={colors}>Method</CfgLabel>
            <CfgSelect value={cfg.method || 'POST'} onChange={v => upd('method', v)}
              options={[
                { value: 'POST',  label: 'POST' },
                { value: 'PUT',   label: 'PUT' },
                { value: 'PATCH', label: 'PATCH' },
              ]}
              colors={colors} nodeColor={nodeColor}
            />
          </div>
          <div>
            <CfgLabel colors={colors}>Auth Header (optional)</CfgLabel>
            <CfgInput value={cfg.authHeader || ''} onChange={v => upd('authHeader', v)}
              placeholder="Bearer <token>" colors={colors} nodeColor={nodeColor} />
          </div>
        </>
      )

    default:
      return (
        <div className="rounded-lg p-3 text-xs" style={{ background: nodeColor.bg, border: `1px solid ${nodeColor.border}20`, color: nodeColor.text }}>
          No configurable fields for this node type.
        </div>
      )
  }
}

// ── Node Config Panel ─────────────────────────────────────────────────────────

function NodeConfigPanel({ node, onClose, onUpdate, colors }) {
  const stepType  = getStepType(node.data.nodeType)
  const nodeColor = colors.nodeColors[node.data.category] || colors.nodeColors.default

  const onUpdateConfig = (newConfig) => onUpdate({ config: newConfig })

  return (
    <div
      className="absolute top-0 right-0 h-full flex flex-col animate-slide-in"
      style={{
        width:      300,
        background: colors.bgRaised,
        borderLeft: `1px solid ${colors.border}`,
        boxShadow:  colors.shadowLg,
        zIndex:     20,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: colors.borderSubtle }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: nodeColor.bg, border: `1px solid ${nodeColor.border}30` }}>
            {node.data.icon || '⚡'}
          </div>
          <div>
            <div className="text-xs" style={{ color: colors.text, fontWeight: 600 }}>{node.data.label}</div>
            <div style={{ color: nodeColor.text + 'bb', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {node.data.category}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ color: colors.text3 }}
          onMouseEnter={e => e.currentTarget.style.color = colors.text}
          onMouseLeave={e => e.currentTarget.style.color = colors.text3}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Label */}
        <div>
          <CfgLabel colors={colors}>Label</CfgLabel>
          <CfgInput
            value={node.data.label}
            onChange={v => onUpdate({ label: v })}
            placeholder="Node name"
            colors={colors} nodeColor={nodeColor}
          />
        </div>

        <CfgDivider colors={colors} />

        {/* Per-node fields */}
        <NodeConfigFields
          node={node}
          onUpdateConfig={onUpdateConfig}
          colors={colors}
          nodeColor={nodeColor}
        />

        {/* Node ID (debug) */}
        <CfgDivider colors={colors} />
        <div className="px-3 py-2 rounded-lg text-xs font-mono"
          style={{ background: colors.bgHover, border: `1px solid ${colors.borderSubtle}`, color: colors.text4 }}>
          id: {node.id}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: colors.borderSubtle }}>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
          style={{ background: nodeColor.bg, border: `1px solid ${nodeColor.border}30`, color: nodeColor.text }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ── Run Results Panel ─────────────────────────────────────────────────────────

function RunResultsPanel({ result, onClose, colors }) {
  const [activeStep, setActiveStep] = useState(0)
  const [width, setWidth]           = useState(340)
  const dragging                    = useRef(false)
  const startX                      = useRef(0)
  const startW                      = useRef(0)

  const onMouseDown = (e) => {
    dragging.current = true
    startX.current   = e.clientX
    startW.current   = width
    document.body.style.cursor    = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const delta = startX.current - e.clientX          // drag left = wider
      const next  = Math.min(600, Math.max(260, startW.current + delta))
      setWidth(next)
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor    = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const steps = result?.steps || []
  const log   = result?.log   || []
  const getLog = (stepName) => log.find(l => l.label === stepName)

  const entry      = getLog(steps[activeStep])
  const isError    = entry?.status === 'error'
  const accentCol  = isError ? '#ef4444' : colors.accent

  const renderOutput = (output) => {
    if (!output) return <div className="text-xs" style={{ color: colors.text4 }}>No output.</div>

    const summary = output.summary
    const text    = output.text
    const cat     = output.category
    const pairs   = output.pairs
    const fields  = output.fields
    const chunks  = output.chunks
    const errMsg  = output.error

    return (
      <div className="space-y-3">

        {/* Error */}
        {errMsg && (
          <div className="rounded-lg p-3 text-xs leading-relaxed"
            style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
            {errMsg}
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div>
            <div className="text-xs mb-1.5 font-semibold" style={{ color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</div>
            <div className="rounded-lg p-3 text-xs leading-relaxed"
              style={{ background: colors.bgHover, color: colors.text, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {summary}
            </div>
          </div>
        )}

        {/* Extracted text */}
        {text && !summary && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-semibold" style={{ color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Extracted Text</div>
              {output.pages && <div className="text-xs" style={{ color: colors.text4 }}>{output.pages} pages</div>}
            </div>
            <div className="rounded-lg p-3 text-xs leading-relaxed"
              style={{ background: colors.bgHover, color: colors.text2, whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto', lineHeight: 1.6 }}>
              {text.slice(0, 1200)}{text.length > 1200 ? `\n\n… (${text.length.toLocaleString()} chars total)` : ''}
            </div>
          </div>
        )}

        {/* Classification */}
        {cat && (
          <div>
            <div className="text-xs mb-1.5 font-semibold" style={{ color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Classification</div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: accentCol + '15', border: `1px solid ${accentCol}30`, color: accentCol }}>
                {cat}
              </span>
              {output.confidence != null && (
                <span className="text-xs" style={{ color: colors.text3 }}>
                  {Math.round(output.confidence * 100)}% confidence
                </span>
              )}
            </div>
            {output.reason && (
              <div className="mt-2 text-xs" style={{ color: colors.text3 }}>{output.reason}</div>
            )}
          </div>
        )}

        {/* Extracted fields */}
        {fields && Object.keys(fields).length > 0 && (
          <div>
            <div className="text-xs mb-1.5 font-semibold" style={{ color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Extracted Fields</div>
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.borderSubtle}` }}>
              {Object.entries(fields).map(([k, v], i) => (
                <div key={k} className="flex gap-3 px-3 py-2 text-xs"
                  style={{ background: i % 2 === 0 ? colors.bgHover : 'transparent', borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <span className="font-semibold flex-shrink-0" style={{ color: accentCol, minWidth: 80 }}>{k}</span>
                  <span style={{ color: colors.text2 }}>{String(v ?? '—')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Q&A pairs */}
        {pairs && pairs.length > 0 && (
          <div>
            <div className="text-xs mb-1.5 font-semibold" style={{ color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Q&A Pairs ({pairs.length})</div>
            <div className="space-y-2">
              {pairs.map((p, i) => (
                <div key={i} className="rounded-lg p-3 text-xs" style={{ background: colors.bgHover, border: `1px solid ${colors.borderSubtle}` }}>
                  <div className="font-semibold mb-1" style={{ color: accentCol }}>Q: {p.question}</div>
                  <div style={{ color: colors.text2, lineHeight: 1.6 }}>A: {p.answer}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chunks */}
        {chunks && chunks.length > 0 && (
          <div>
            <div className="text-xs mb-1.5 font-semibold" style={{ color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Text Chunks ({chunks.length})
            </div>
            <div className="space-y-1.5">
              {chunks.slice(0, 3).map((c, i) => (
                <div key={i} className="rounded-lg px-3 py-2 text-xs"
                  style={{ background: colors.bgHover, color: colors.text2, border: `1px solid ${colors.borderSubtle}` }}>
                  <span className="font-mono text-xs" style={{ color: colors.text4 }}>#{i + 1} </span>
                  {c.slice(0, 120)}{c.length > 120 ? '…' : ''}
                </div>
              ))}
              {chunks.length > 3 && (
                <div className="text-xs text-center py-1" style={{ color: colors.text4 }}>
                  +{chunks.length - 3} more chunks
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status info */}
        <div className="flex items-center gap-3 pt-1">
          {entry?.durationMs != null && (
            <span className="text-xs" style={{ color: colors.text4 }}>⏱ {entry.durationMs}ms</span>
          )}
          {output.model && (
            <span className="text-xs font-mono" style={{ color: colors.text4 }}>🤖 {output.model}</span>
          )}
          {output.pages && (
            <span className="text-xs" style={{ color: colors.text4 }}>📄 {output.pages} pages</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute top-0 right-0 h-full flex flex-col animate-slide-in"
      style={{
        width,
        background: colors.bgRaised,
        borderLeft: `1px solid ${colors.border}`,
        boxShadow:  colors.shadowLg,
        zIndex:     25,
      }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position:  'absolute',
          left:      -4,
          top:       0,
          bottom:    0,
          width:     8,
          cursor:    'ew-resize',
          zIndex:    10,
          display:   'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{
          width:        3,
          height:       32,
          borderRadius: 999,
          background:   colors.borderStrong,
          opacity:      0.4,
          transition:   'opacity 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
        />
      </div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: colors.borderSubtle, background: colors.accentBg }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: colors.accent }} />
          <span className="text-sm font-semibold" style={{ color: colors.accent }}>
            Run Results
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md"
            style={{ background: colors.accentBg, border: `1px solid ${colors.accentBorder}`, color: colors.accent }}>
            {steps.length} steps
          </span>
        </div>
        <button onClick={onClose} style={{ color: colors.text3 }}
          onMouseEnter={e => e.currentTarget.style.color = colors.text}
          onMouseLeave={e => e.currentTarget.style.color = colors.text3}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Step tabs */}
      <div className="flex border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: colors.borderSubtle }}>
        {steps.map((step, i) => {
          const e       = getLog(step)
          const isErr   = e?.status === 'error'
          const isActive = activeStep === i
          return (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs flex-shrink-0 transition-all relative"
              style={{
                color:       isActive ? colors.accent : colors.text3,
                fontWeight:  isActive ? 600 : 400,
                borderBottom: isActive ? `2px solid ${colors.accent}` : '2px solid transparent',
                background:  isActive ? colors.accentBg : 'transparent',
              }}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                style={{
                  background: isErr ? '#ef444420' : (isActive ? colors.accentBg : colors.bgHover),
                  color:      isErr ? '#ef4444' : (isActive ? colors.accent : colors.text4),
                  fontWeight: 700, fontSize: '10px',
                }}>
                {isErr ? '✕' : i + 1}
              </span>
              <span className="max-w-16 truncate">{step}</span>
            </button>
          )
        })}
      </div>

      {/* Output body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {steps.length === 0 ? (
          <div className="text-xs text-center mt-8" style={{ color: colors.text4 }}>No results yet.</div>
        ) : (
          <>
            {/* Step header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: accentCol + '20', color: accentCol }}>
                {isError ? '✕' : activeStep + 1}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: colors.text }}>{steps[activeStep]}</div>
                <div className="text-xs" style={{ color: colors.text4 }}>
                  {entry?.type} {entry?.durationMs != null ? `· ${entry.durationMs}ms` : ''}
                </div>
              </div>
            </div>

            {renderOutput(entry?.output)}
          </>
        )}
      </div>

      {/* Footer nav */}
      <div className="px-4 py-3 border-t flex items-center justify-between flex-shrink-0"
        style={{ borderColor: colors.borderSubtle }}>
        <button
          onClick={() => setActiveStep(s => Math.max(0, s - 1))}
          disabled={activeStep === 0}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: activeStep === 0 ? 'transparent' : colors.bgHover,
            color:      activeStep === 0 ? colors.text4 : colors.text2,
            border:     `1px solid ${colors.borderSubtle}`,
            cursor:     activeStep === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Prev
        </button>

        <span className="text-xs" style={{ color: colors.text4 }}>
          {activeStep + 1} / {steps.length}
        </span>

        <button
          onClick={() => setActiveStep(s => Math.min(steps.length - 1, s + 1))}
          disabled={activeStep === steps.length - 1}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: activeStep === steps.length - 1 ? 'transparent' : colors.bgHover,
            color:      activeStep === steps.length - 1 ? colors.text4 : colors.text2,
            border:     `1px solid ${colors.borderSubtle}`,
            cursor:     activeStep === steps.length - 1 ? 'not-allowed' : 'pointer',
          }}
        >
          Next
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Editor Inner ──────────────────────────────────────────────────────────────

let nodeIdCounter = 100

function EditorInner() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { colors } = useTheme()
  const reactFlowWrapper = useRef(null)
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [menu, setMenu]             = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState(null) // 'saving' | 'saved' | null
  const [running, setRunning]       = useState(false)
  const [runResult, setRunResult]   = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [workflowName, setWorkflowName] = useState('Untitled Workflow')
  const [loaded, setLoaded]         = useState(false)  // don't auto-save before initial load
  const { toasts, addToast, removeToast } = useToast()
  const autoSaveTimer = useRef(null)

  // Auto-save: 2s debounce after any nodes/edges change
  useEffect(() => {
    if (!loaded || nodes.length === 0) return
    clearTimeout(autoSaveTimer.current)
    setAutoSaveStatus('saving')
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await axios.post(`${API}/api/graph/save/${id}`, { nodes, edges })
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus(null), 2000)
      } catch {
        setAutoSaveStatus(null)
      }
    }, 2000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [nodes, edges, loaded])

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge(
      {
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed, color: colors.borderStrong },
        style:     { stroke: colors.borderStrong, strokeWidth: 1.5 },
      },
      eds
    )),
    [colors]
  )

  // Load
  useEffect(() => {
    const load = async () => {
      try {
        try {
          const metaRes = await axios.get(`${API}/api/workflows`)
          const wf = metaRes.data.find(w => String(w.id) === String(id))
          if (wf) setWorkflowName(wf.name)
        } catch (_) {}

        const res = await axios.get(`${API}/api/graph/load/${id}`)
        if (res.data.nodes?.length > 0) {
          setNodes(res.data.nodes.map(n => ({
            ...n,
            type: 'workflowNode',
            data: { ...n.data, icon: n.data.icon || '⚡', category: n.data.category || 'default' },
          })))
          setEdges(res.data.edges)
        }
        setLoaded(true)
      } catch (err) {
        console.error('Load failed', err)
        addToast('error', 'Load failed', 'Could not load workflow data')
      }
    }
    load()
  }, [id])

  useEffect(() => {
    const h = () => setMenu(null)
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const saveWorkflow = async () => {
    setSaving(true)
    try {
      await axios.post(`${API}/api/graph/save/${id}`, { nodes, edges })
      addToast('success', 'Workflow saved', 'All changes have been persisted')
    } catch (err) {
      addToast('error', 'Save failed', 'Could not save workflow')
    } finally {
      setSaving(false)
    }
  }

  const runWorkflow = async () => {
    if (nodes.length === 0) {
      addToast('error', 'No nodes', 'Add at least one node to run the workflow')
      return
    }

    // Validation: find disconnected nodes
    const connectedIds = new Set()
    edges.forEach(e => { connectedIds.add(e.source); connectedIds.add(e.target) })
    const isolated = nodes.filter(n => !connectedIds.has(n.id))
    if (isolated.length > 0 && nodes.length > 1) {
      addToast('error', 'Disconnected nodes',
        `"${isolated[0].data.label}"${isolated.length > 1 ? ` +${isolated.length - 1} more` : ''} not connected`)
      return
    }

    // Validation: warn if no edges at all on a multi-node workflow
    if (nodes.length > 1 && edges.length === 0) {
      addToast('error', 'No connections', 'Connect your nodes before running')
      return
    }

  setRunning(true)
  setRunResult(null)

  try {
    const res = await axios.post(`${API}/api/graph/run/${id}`)
    const steps = res.data.steps

    // Reset all nodes and edges
    setNodes(nds =>
      nds.map(n => ({
        ...n,
        className: '',
        style: { opacity: 0.4, transition: 'all 0.3s ease' }
      }))
    )

    setEdges(eds =>
      eds.map(e => ({
        ...e,
        animated: false,
        className: '',
        style: { stroke: colors.borderStrong, strokeWidth: 1.5, markerEnd: 'url(#arrowhead)' }
      }))
    )

    // Sequential animation
    for (let i = 0; i < steps.length; i++) {
      const stepName = steps[i]

      // Find the node corresponding to this step
      const node = nodes.find(
        n => n.data.label === stepName || n.data.nodeType === stepName
      )
      if (!node) continue
      const stepId = node.id

      // Highlight current node & remove glow from others
      setNodes(nds =>
        nds.map(n => ({
          ...n,
          className: n.id === stepId ? 'node-running' : '',
          style: { opacity: n.id === stepId ? 1 : 0.4, transition: 'all 0.3s ease' }
        }))
      )

      // Animate outgoing edges with moving dot
      setEdges(eds =>
        eds.map(e =>
          e.source === stepId
            ? {
                ...e,
                animated: true,
                className: 'edge-energy',
                style: { stroke: '#22c55e', strokeWidth: 2, markerEnd: 'url(#arrowhead)' }
              }
            : {
                ...e,
                animated: false,
                className: '',
                style: { stroke: colors.borderStrong, strokeWidth: 1.5, markerEnd: 'url(#arrowhead)' }
              }
        )
      )

      // Wait before moving to next step
      await new Promise(r => setTimeout(r, 800))
    }

    // Restore all nodes and edges to normal after run
    setNodes(nds =>
      nds.map(n => ({ ...n, className: '', style: { opacity: 1 } }))
    )

    setEdges(eds =>
      eds.map(e => ({
        ...e,
        animated: false,
        className: '',
        style: { stroke: colors.borderStrong, strokeWidth: 1.5, markerEnd: 'url(#arrowhead)' }
      }))
    )

    setRunResult(res.data)
    setLastResult(res.data)
    addToast('success', 'Execution complete', `${steps.length} steps ran`)
  } catch (err) {
    addToast('error', 'Execution failed', err.response?.data?.error || 'Unknown error')
  } finally {
    setRunning(false)
  }
}

  const onDragOver = e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  const onDrop = e => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/reactflow')
    if (!raw) return
    let data
    try { data = JSON.parse(raw) } catch { return }

    const position = screenToFlowPosition
      ? screenToFlowPosition({ x: e.clientX, y: e.clientY })
      : (() => {
          const bounds = reactFlowWrapper.current.getBoundingClientRect()
          return { x: e.clientX - bounds.left, y: e.clientY - bounds.top }
        })()

    setNodes(nds => [...nds, {
      id:       String(++nodeIdCounter),
      position,
      type:     'workflowNode',
      data: {
        label:    data.label,
        nodeType: data.nodeType,
        category: data.category || 'default',
        icon:     data.icon || '⚡',
        config:   data.config || {},
      },
    }])
  }

  const onNodeContextMenu = (e, node) => {
    e.preventDefault()
    const bounds = reactFlowWrapper.current.getBoundingClientRect()
    setMenu({ nodeId: node.id, x: e.clientX - bounds.left, y: e.clientY - bounds.top })
  }

  const deleteNode = () => {
    setNodes(nds => nds.filter(n => n.id !== menu.nodeId))
    setEdges(eds => eds.filter(e => e.source !== menu.nodeId && e.target !== menu.nodeId))
    if (selectedNode?.id === menu.nodeId) setSelectedNode(null)
    setMenu(null)
  }

  const onNodeClick = (_, node) => { setSelectedNode(node); setMenu(null) }

  const updateSelectedNode = updates => {
    setNodes(nds => nds.map(n =>
      n.id === selectedNode.id
        ? { ...n, data: { ...n.data, ...updates, config: { ...(n.data.config || {}), ...(updates.config || {}) } } }
        : n
    ))
    setSelectedNode(prev => ({
      ...prev,
      data: { ...prev.data, ...updates, config: { ...(prev.data.config || {}), ...(updates.config || {}) } }
    }))
  }

  // ── Editor layout ────────────────────────────────────────────────────────

  const edgeSt = { stroke: colors.borderStrong, strokeWidth: 1.5 }
  const defaultEdgeOptions = {
    markerEnd: { type: MarkerType.ArrowClosed, color: colors.borderStrong },
    style: edgeSt,
  }

  return (
    <div className="flex h-full" style={{ background: colors.bg }}>
      <NodeSidebar />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Editor Topbar */}
        <div
          className="h-12 flex items-center justify-between px-4 border-b flex-shrink-0"
          style={{ background: colors.bgRaised, borderColor: colors.borderSubtle }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/workflows')}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: colors.text3 }}
              onMouseEnter={e => e.currentTarget.style.color = colors.text}
              onMouseLeave={e => e.currentTarget.style.color = colors.text3}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Workflows
            </button>
            <div style={{ color: colors.border, fontSize: 16 }}>/</div>
            <span className="text-sm" style={{ color: colors.text, fontWeight: 600 }}>
              {workflowName}
            </span>
            <div
              className="px-2 py-0.5 rounded-md text-xs"
              style={{
                background:  colors.accentBg,
                border:      `1px solid ${colors.accentBorder}`,
                color:       colors.accent,
                fontSize:    '10px',
              }}
            >
              {nodes.length} node{nodes.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Last Run — only shows after first run */}
            {lastResult && !runResult && (
              <button
                onClick={() => setRunResult(lastResult)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: colors.bgHover,
                  border:     `1px solid ${colors.borderSubtle}`,
                  color:      colors.text3,
                  fontWeight: 500,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = colors.accentBorder; e.currentTarget.style.color = colors.accent }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.borderSubtle; e.currentTarget.style.color = colors.text3 }}
                title="View last run results"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Last Run
              </button>
            )}

            {/* Run */}
            <button
              onClick={runWorkflow}
              disabled={running}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background:  colors.accentBg,
                border:      `1px solid ${colors.accentBorder}`,
                color:       colors.accent,
                fontWeight:  600,
                cursor:      running ? 'not-allowed' : 'pointer',
                opacity:     running ? 0.7 : 1,
              }}
            >
              {running ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: colors.accent + '40', borderTopColor: colors.accent }} />
                  Running...
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Run
                </>
              )}
            </button>

            {/* Auto-save indicator */}
            {autoSaveStatus && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: colors.text4 }}>
                {autoSaveStatus === 'saving' ? (
                  <><div className="w-2.5 h-2.5 rounded-full border border-t-transparent animate-spin"
                    style={{ borderColor: colors.text4, borderTopColor: 'transparent' }} />Saving…</>
                ) : (
                  <><span style={{ color: colors.accent }}>✓</span> Saved</>
                )}
              </div>
            )}

            {/* Save */}
            <button
              onClick={saveWorkflow}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background:  colors.bgCard,
                border:      `1px solid ${colors.border}`,
                color:       colors.text2,
                fontWeight:  600,
                cursor:      saving ? 'not-allowed' : 'pointer',
                opacity:     saving ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!saving) { e.currentTarget.style.borderColor = colors.accentBorder; e.currentTarget.style.color = colors.accent } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.text2 }}
            >
              {saving ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: colors.accent + '40', borderTopColor: colors.accent }} />
                  Saving...
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save
                </>
              )}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 relative"
          ref={reactFlowWrapper}
          onDragOver={onDragOver}
          onDrop={onDrop}
          style={{ background: colors.canvasBg, transition: 'background 0.25s ease' }}
        >

          {/* SVG marker for edge arrowheads */}
          <svg style={{ height: 0 }}>
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#22c55e" />
              </marker>
            </defs>
          </svg>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeContextMenu={onNodeContextMenu}
            onNodeClick={onNodeClick}
            onPaneClick={() => { setSelectedNode(null); setMenu(null) }}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode={['Backspace', 'Delete']}
            style={{ background: colors.canvasBg, transition: 'background 0.25s ease' }}
          >
            {/* Background color set both via CSS vars AND directly here */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color={colors.canvasDot}
              style={{ backgroundColor: colors.canvasBg }}
            />
            <Controls position="bottom-left" />
            <MiniMap
              position="bottom-right"
              nodeColor={n => colors.nodeColors[n.data?.category]?.border || colors.border}
              style={{ background: colors.bgRaised, border: `1px solid ${colors.border}`, borderRadius: 10 }}
            />
          </ReactFlow>

          {/* Empty hint */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
              <div className="text-center">
                <div className="text-4xl mb-3" style={{ opacity: 0.15 }}>⚡</div>
                <div className="text-sm mb-1" style={{ color: colors.text3, opacity: 0.6, fontWeight: 500 }}>
                  Drag nodes from the sidebar
                </div>
                <div className="text-xs" style={{ color: colors.text4, opacity: 0.5 }}>
                  Connect them to build your workflow
                </div>
              </div>
            </div>
          )}

          {menu && (
            <ContextMenu menu={menu} onDelete={deleteNode} onClose={() => setMenu(null)} colors={colors} />
          )}

          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onUpdate={updateSelectedNode}
              colors={colors}
            />
          )}

          {runResult && (
            <RunResultsPanel result={runResult} onClose={() => setRunResult(null)} colors={colors} />
          )}
        </div>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

// ── Wrapper ───────────────────────────────────────────────────────────────────

function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  )
}

export default WorkflowEditor