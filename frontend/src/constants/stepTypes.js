// Node category color palette
export const CATEGORY_COLORS = {
  input:   { bg: 'rgba(59,130,246,0.12)',  border: '#3b82f6', accent: '#3b82f6',  text: '#93c5fd' },
  process: { bg: 'rgba(139,92,246,0.12)', border: '#8b5cf6', accent: '#8b5cf6', text: '#c4b5fd' },
  ai:      { bg: 'rgba(20,241,149,0.10)', border: '#14f195', accent: '#14f195', text: '#6ee7b7' },
  output:  { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', accent: '#f59e0b', text: '#fcd34d' },
}

export const STEP_TYPES = [
  // ── Input ──────────────────────────────────────────
  {
    id: 'upload',
    label: 'Upload Document',
    icon: '⬆',
    category: 'input',
    description: 'Upload a PDF, DOCX, or TXT file to begin processing',
    config: { accept: '.pdf,.docx,.txt', maxSizeMB: 50 }
  },
  {
    id: 'webhook',
    label: 'Webhook Trigger',
    icon: '🔗',
    category: 'input',
    description: 'Trigger workflow via HTTP webhook',
    config: { method: 'POST', path: '/webhook' }
  },
  {
    id: 'schedule',
    label: 'Schedule Trigger',
    icon: '⏰',
    category: 'input',
    description: 'Run workflow on a cron schedule',
    config: { cron: '0 9 * * 1-5' }
  },

  // ── Process ────────────────────────────────────────
  {
    id: 'extract_text',
    label: 'Extract Text',
    icon: '📄',
    category: 'process',
    description: 'Extract raw text content from uploaded document',
    config: {}
  },
  {
    id: 'chunk',
    label: 'Chunk Text',
    icon: '✂',
    category: 'process',
    description: 'Split text into overlapping segments for processing',
    config: { chunkSize: 512, overlap: 64 }
  },
  {
    id: 'clean',
    label: 'Clean Text',
    icon: '🧹',
    category: 'process',
    description: 'Remove noise, whitespace, and formatting artifacts',
    config: {}
  },
  {
    id: 'transform',
    label: 'Transform Data',
    icon: '⚡',
    category: 'process',
    description: 'Apply custom transformation logic to data',
    config: { template: '' }
  },

  // ── AI ─────────────────────────────────────────────
  {
    id: 'summarize',
    label: 'AI Summarize',
    icon: '✨',
    category: 'ai',
    description: 'Generate a concise summary using an LLM',
    config: { model: 'gpt-4o-mini', maxTokens: 512, style: 'bullet' }
  },
  {
    id: 'embedding',
    label: 'Generate Embeddings',
    icon: '🧠',
    category: 'ai',
    description: 'Create vector embeddings for semantic search',
    config: { model: 'text-embedding-3-small', dimensions: 1536 }
  },
  {
    id: 'classify',
    label: 'AI Classify',
    icon: '🏷',
    category: 'ai',
    description: 'Classify document into predefined categories',
    config: { categories: [], model: 'gpt-4o-mini' }
  },
  {
    id: 'extract_fields',
    label: 'Extract Fields',
    icon: '🔍',
    category: 'ai',
    description: 'Extract structured fields using AI parsing',
    config: { fields: [], model: 'gpt-4o-mini' }
  },
  {
    id: 'qa',
    label: 'Q&A Generation',
    icon: '💬',
    category: 'ai',
    description: 'Generate question-answer pairs from document',
    config: { count: 5, model: 'gpt-4o-mini' }
  },

  // ── Output ─────────────────────────────────────────
  {
    id: 'store',
    label: 'Save to Database',
    icon: '💾',
    category: 'output',
    description: 'Persist processed results to PostgreSQL',
    config: { table: 'results' }
  },
  {
    id: 'vector_store',
    label: 'Vector Store',
    icon: '🗄',
    category: 'output',
    description: 'Upsert embeddings into a vector database',
    config: { collection: 'documents' }
  },
  {
    id: 'notify',
    label: 'Send Email',
    icon: '📧',
    category: 'output',
    description: 'Send results via email notification',
    config: { to: '', subject: 'Workflow Complete' }
  },
  {
    id: 'webhook_out',
    label: 'HTTP Request',
    icon: '📡',
    category: 'output',
    description: 'POST results to an external endpoint',
    config: { url: '', method: 'POST', headers: {} }
  },
]

// Helper to find step type by id
export const getStepType = (id) =>
  STEP_TYPES.find(s => s.id === id) || null

// Group by category
export const STEP_TYPES_BY_CATEGORY = STEP_TYPES.reduce((acc, step) => {
  if (!acc[step.category]) acc[step.category] = []
  acc[step.category].push(step)
  return acc
}, {})

export const CATEGORY_LABELS = {
  input:   'Inputs & Triggers',
  process: 'Processing',
  ai:      'AI & Intelligence',
  output:  'Outputs & Actions',
}