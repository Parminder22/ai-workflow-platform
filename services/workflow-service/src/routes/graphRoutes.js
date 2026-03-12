import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import pool from '../config/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router    = express.Router()

// ── Grok client (OpenAI-compatible) ──────────────────────────────────────────

let grok = null

async function getGrok() {
  if (grok) return grok
  if (!process.env.GROQ_API_KEY) return null
  try {
    const { default: OpenAI } = await import('openai')
    grok = new OpenAI({
      apiKey:  process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
    return grok
  } catch {
    return null
  }
}

const GROK_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

// ── Text helpers ──────────────────────────────────────────────────────────────

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.pdf') {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const data     = new Uint8Array(fs.readFileSync(filePath))
    const doc      = await pdfjsLib.getDocument({ data }).promise
    let fullText   = ''
    for (let i = 1; i <= doc.numPages; i++) {
      const page    = await doc.getPage(i)
      const content = await page.getTextContent()
      fullText += content.items.map(item => item.str).join(' ') + '\n'
    }
    return { text: fullText.trim(), pages: doc.numPages, type: 'pdf' }
  }

  if (ext === '.docx' || ext === '.doc') {
    const { default: mammoth } = await import('mammoth')
    const result = await mammoth.extractRawText({ path: filePath })
    return { text: result.value, type: 'docx' }
  }

  const text = fs.readFileSync(filePath, 'utf8')
  return { text, type: 'text' }
}

function chunkText(text, chunkSize = 512, overlap = 64) {
  const words  = text.split(/\s+/).filter(Boolean)
  const chunks = []
  const step   = Math.max(1, chunkSize - overlap)
  let i = 0
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
    i += step
  }
  return chunks
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')  // remove non-printable
    .trim()
}

// ── Grok AI call helper ───────────────────────────────────────────────────────

async function grokChat(systemPrompt, userContent, config = {}) {
  const client = await getGrok()
  if (!client) {
    return '[Groq not configured — add GROQ_API_KEY to .env]'
  }

  // Reject any non-groq model name (e.g. old gpt-4o-mini saved in node configs)
  const validPrefixes = ['llama', 'mixtral', 'gemma', 'whisper', 'deepseek']
  const rawModel = config.model || GROK_MODEL
  const model    = validPrefixes.some(p => rawModel.startsWith(p)) ? rawModel : GROK_MODEL

  const maxTokens   = config.maxTokens  || 1024
  const temperature = config.temperature != null ? Number(config.temperature) : 0.7

  const response = await client.chat.completions.create({
    model,
    max_tokens:  maxTokens,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
  })

  return response.choices[0]?.message?.content || ''
}

// ── SAVE ─────────────────────────────────────────────────────────────────────

router.post('/save/:workflowId', async (req, res) => {
  const { workflowId } = req.params
  const { nodes, edges } = req.body

  if (!nodes || !edges) {
    return res.status(400).json({ error: 'nodes and edges are required' })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query('DELETE FROM workflow_nodes WHERE workflow_id=$1', [workflowId])
    await client.query('DELETE FROM workflow_edges WHERE workflow_id=$1', [workflowId])

    for (const node of nodes) {
      await client.query(
        `INSERT INTO workflow_nodes
          (workflow_id, node_id, label, node_type, category, icon, position_x, position_y, config)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          workflowId,
          node.id,
          node.data?.label     || 'Unnamed',
          node.data?.nodeType  || 'default',
          node.data?.category  || 'default',
          node.data?.icon      || '',
          node.position?.x     || 0,
          node.position?.y     || 0,
          JSON.stringify(node.data?.config || {}),
        ]
      )
    }

    for (const edge of edges) {
      await client.query(
        `INSERT INTO workflow_edges (workflow_id, edge_id, source, target, label)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          workflowId,
          edge.id || `${edge.source}-${edge.target}`,
          edge.source,
          edge.target,
          edge.label || null,
        ]
      )
    }

    await client.query('COMMIT')
    res.json({ message: 'Saved', nodeCount: nodes.length, edgeCount: edges.length })

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[save]', err.message)
    res.status(500).json({ error: 'Save failed', detail: err.message })
  } finally {
    client.release()
  }
})

// ── LOAD ─────────────────────────────────────────────────────────────────────

router.get('/load/:workflowId', async (req, res) => {
  const { workflowId } = req.params

  try {
    const nodesResult = await pool.query(
      'SELECT * FROM workflow_nodes WHERE workflow_id=$1 ORDER BY id ASC',
      [workflowId]
    )
    const edgesResult = await pool.query(
      'SELECT * FROM workflow_edges WHERE workflow_id=$1',
      [workflowId]
    )

    const nodes = nodesResult.rows.map(row => {
      let config = {}
      try { config = typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {}) } catch {}

      return {
        id:       row.node_id,
        type:     'workflowNode',
        position: { x: Number(row.position_x || 0), y: Number(row.position_y || 0) },
        data: {
          label:    row.label    || 'Unnamed',
          nodeType: row.node_type  || 'default',
          category: row.category   || 'default',
          icon:     row.icon       || '⚡',
          config,
        },
      }
    })

    const edges = edgesResult.rows.map(row => ({
      id:     row.edge_id || `${row.source}-${row.target}`,
      source: row.source,
      target: row.target,
      label:  row.label || null,
      markerEnd: { type: 'arrowclosed', color: '#363660' },
      style:  { stroke: '#363660', strokeWidth: 1.5 },
    }))

    res.json({ nodes, edges })

  } catch (err) {
    console.error('[load]', err.message)
    res.status(500).json({ error: 'Load failed', detail: err.message })
  }
})

// ── OUTPUTS (saved by Save to Database node) ─────────────────────────────────

router.get('/outputs/:workflowId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, node_label, output_type, content, saved_at
       FROM workflow_outputs
       WHERE workflow_id = $1
       ORDER BY saved_at DESC
       LIMIT 100`,
      [req.params.workflowId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── RUN ───────────────────────────────────────────────────────────────────────

router.post('/run/:workflowId', async (req, res) => {
  const { workflowId } = req.params
  const startedAt = new Date()

  try {
    const nodesResult = await pool.query(
      'SELECT * FROM workflow_nodes WHERE workflow_id=$1', [workflowId]
    )
    const edgesResult = await pool.query(
      'SELECT * FROM workflow_edges WHERE workflow_id=$1', [workflowId]
    )

    const dbNodes = nodesResult.rows
    const dbEdges = edgesResult.rows

    if (dbNodes.length === 0) {
      return res.status(400).json({ error: 'Workflow has no nodes' })
    }

    // Parse configs
    dbNodes.forEach(n => {
      try { n.config = typeof n.config === 'string' ? JSON.parse(n.config) : (n.config || {}) }
      catch { n.config = {} }
    })

    // Build adjacency structures
    const nodeMap  = {}
    const inDegree = {}
    const adjList  = {}
    const inEdges  = {}

    for (const n of dbNodes) {
      nodeMap[n.node_id]  = n
      inDegree[n.node_id] = 0
      adjList[n.node_id]  = []
      inEdges[n.node_id]  = []
    }

    for (const e of dbEdges) {
      if (adjList[e.source] !== undefined) adjList[e.source].push(e.target)
      if (inDegree[e.target] !== undefined) {
        inDegree[e.target]++
        inEdges[e.target].push(e.source)
      }
    }

    // Kahn's topological sort
    const queue          = Object.keys(inDegree).filter(id => inDegree[id] === 0)
    const executionOrder = []
    const executionLog   = []
    const dataContext    = {}

    while (queue.length > 0) {
      const current = queue.shift()
      const node    = nodeMap[current]
      if (!node) continue

      executionOrder.push(current)

      const upstreamData = inEdges[current].map(srcId => dataContext[srcId]).filter(Boolean)
      const result = await executeNodeStep(node, upstreamData, workflowId)
      dataContext[current] = result.output
      executionLog.push(result)

      for (const neighbor of (adjList[current] || [])) {
        inDegree[neighbor]--
        if (inDegree[neighbor] === 0) queue.push(neighbor)
      }
    }

    if (executionOrder.length !== dbNodes.length) {
      return res.status(400).json({ error: 'Workflow contains a cycle' })
    }

    const hasError  = executionLog.some(l => l.status === 'error')
    const runStatus = hasError ? 'partial' : 'success'
    const payload   = {
      message:   'Workflow executed successfully',
      steps:     executionOrder.map(id => nodeMap[id]?.label || id),
      log:       executionLog,
      nodeCount: dbNodes.length,
      status:    runStatus,
    }

    // Persist run to DB
    try {
      await pool.query(
        `INSERT INTO workflow_runs (workflow_id, status, steps_log, finished_at)
         VALUES ($1, $2, $3, NOW())`,
        [workflowId, runStatus, JSON.stringify(executionLog)]
      )
      await pool.query('UPDATE workflows SET last_run=NOW() WHERE id=$1', [workflowId])
    } catch (dbErr) {
      console.error('[run] Failed to persist run log:', dbErr.message)
    }

    res.json(payload)

  } catch (err) {
    // Persist failed run
    try {
      await pool.query(
        `INSERT INTO workflow_runs (workflow_id, status, error, finished_at)
         VALUES ($1, 'failed', $2, NOW())`,
        [workflowId, err.message]
      )
    } catch {}
    console.error('[run]', err.message)
    res.status(500).json({ error: 'Execution failed', detail: err.message })
  }
})

// ── Node executor ─────────────────────────────────────────────────────────────
// upstreamData: array of outputs from connected upstream nodes

async function executeNodeStep(node, upstreamData = [], workflowId = null) {
  const start  = Date.now()
  const config = node.config || {}
  let output   = null
  let status   = 'ok'
  let error    = null

  // Helper: get the first text string from upstream
  const upstreamText = () => {
    for (const d of upstreamData) {
      if (d?.text)   return d.text
      if (d?.chunks) return d.chunks.join('\n\n')
    }
    return ''
  }

  try {
    switch (node.node_type) {

      // ── Input nodes ──────────────────────────────────────────────────────

      case 'upload': {
        const filePath = config.filePath
        if (!filePath || !fs.existsSync(filePath)) {
          output = { message: 'No file uploaded — use the config panel to upload a file', ready: false }
        } else {
          output = {
            message:  'File ready',
            ready:    true,
            filePath,
            filename: config.filename || path.basename(filePath),
            mimetype: config.mimetype || 'unknown',
            size:     config.size     || 0,
          }
        }
        break
      }

      case 'webhook':
        output = { triggered: true, payload: {} }
        break

      case 'schedule':
        output = { triggered: true, cron: config.cron || '0 9 * * 1-5' }
        break

      // ── Processing nodes ─────────────────────────────────────────────────

      case 'extract_text': {
        // Look for uploaded file from upstream upload node
        const fileInfo = upstreamData.find(d => d?.filePath)
        if (fileInfo?.filePath && fs.existsSync(fileInfo.filePath)) {
          const result = await extractTextFromFile(fileInfo.filePath)
          output = result
        } else if (upstreamText()) {
          // Already have text from upstream
          output = { text: upstreamText(), type: 'passthrough' }
        } else {
          output = { text: '', error: 'No file found — connect an Upload Document node first' }
        }
        break
      }

      case 'chunk': {
        const text      = upstreamText()
        const chunkSize = Number(config.chunkSize) || 512
        const overlap   = Number(config.overlap)   || 64
        if (!text) {
          output = { chunks: [], count: 0, error: 'No text to chunk — connect an Extract Text node first' }
        } else {
          const chunks = chunkText(text, chunkSize, overlap)
          output = { chunks, count: chunks.length, chunkSize, overlap }
        }
        break
      }

      case 'clean': {
        const text = upstreamText()
        output = { text: cleanText(text || ''), original_length: text.length, clean_length: cleanText(text || '').length }
        break
      }

      case 'transform': {
        const text     = upstreamText()
        const template = config.template || '{{text}}'
        output = { text: template.replace('{{text}}', text) }
        break
      }

      // ── AI nodes ─────────────────────────────────────────────────────────

      case 'summarize': {
        const text  = upstreamText()
        const style = config.style || 'paragraph'
        const styleInstructions = style === 'bullet'
          ? 'Respond with 5-7 clear bullet points.'
          : style === 'tldr'
          ? 'Respond with a 2-3 sentence TL;DR.'
          : 'Write a clear, concise paragraph summary.'

        const systemPrompt = config.systemPrompt ||
          `You are an expert document analyst. Summarize the provided text accurately and concisely. ${styleInstructions}`

        const summary = await grokChat(systemPrompt, `Summarize this text:\n\n${text}`, config)
        output = { summary, model: config.model || GROK_MODEL, style, input_length: text.length }
        break
      }

      case 'classify': {
        const text       = upstreamText()
        const categories = config.categories || 'positive, negative, neutral'
        const systemPrompt = `You are a document classifier. Classify the given text into exactly one of these categories: ${categories}. 
Respond ONLY with a JSON object like: {"category":"<name>","confidence":0.95,"reason":"brief reason"}`

        const raw    = await grokChat(systemPrompt, text, config)
        let parsed   = {}
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { category: raw.trim(), confidence: 1 }
        } catch { parsed = { category: raw.trim(), confidence: 1 } }

        output = { ...parsed, model: config.model || GROK_MODEL, categories }
        break
      }

      case 'extract_fields': {
        const text   = upstreamText()
        const fields = config.fields || 'name, date, amount, summary'
        const systemPrompt = `You are a data extraction expert. Extract the following fields from the text: ${fields}.
Respond ONLY with a valid JSON object where keys are the field names. If a field is not found, use null.`

        const raw  = await grokChat(systemPrompt, `Extract fields from:\n\n${text}`, config)
        let parsed = {}
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        } catch { parsed = { raw } }

        output = { fields: parsed, model: config.model || GROK_MODEL, requested: fields }
        break
      }

      case 'qa': {
        const text  = upstreamText()
        const count = Number(config.count) || 5
        const systemPrompt = `You are an expert at creating educational question-answer pairs. 
Generate exactly ${count} insightful Q&A pairs from the provided text.
Respond ONLY with a JSON array: [{"question":"...","answer":"..."}]`

        const raw  = await grokChat(systemPrompt, `Generate Q&A from:\n\n${text}`, config)
        let pairs  = []
        try {
          const jsonMatch = raw.match(/\[[\s\S]*\]/)
          pairs = jsonMatch ? JSON.parse(jsonMatch[0]) : []
        } catch { pairs = [] }

        output = { pairs, count: pairs.length, model: config.model || GROK_MODEL }
        break
      }

      case 'embedding': {
        const text   = upstreamText()
        const chunks = upstreamData.find(d => d?.chunks)?.chunks || [text]

        // Grok/xAI doesn't have embeddings yet — fallback message
        output = {
          message:  'Embedding generation noted. xAI Grok does not expose an embeddings endpoint yet. Use OpenAI text-embedding-3-small for production.',
          chunks:   chunks.length,
          model:    config.model || 'text-embedding-3-small',
          ready:    false,
        }
        break
      }

      // ── Output nodes ─────────────────────────────────────────────────────

      case 'vector_store': {
        const data = upstreamData.find(d => d?.vectors || d?.chunks) || {}
        output = {
          upserted:   0,
          collection: config.collection || 'documents',
          note:       'Wire up Pinecone/Weaviate/pgvector to complete this step',
          data_preview: JSON.stringify(data).slice(0, 100),
        }
        break
      }

          case 'notify': {
      const to      = config.to
      const subject = config.subject || 'Workflow Complete'
      const body    = config.body    || 'Your workflow has finished running.'

      if (!to) {
        output = { sent: false, reason: 'No recipient configured' }
        break
      }

      if (!process.env.RESEND_API_KEY) {
        output = { sent: false, reason: 'RESEND_API_KEY not set in environment' }
        break
      }

      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        const upstream = upstreamData[0]
        let upstreamText = '[no upstream data]'
        if (upstream) {
          if (typeof upstream === 'string') {
            upstreamText = upstream
          } else {
            upstreamText = upstream.summary
              || upstream.text
              || upstream.category
              || upstream.message
              || (upstream.pairs  ? upstream.pairs.map((p,i) => `Q${i+1}: ${p.question}\nA${i+1}: ${p.answer}`).join('\n\n') : null)
              || (upstream.fields ? Object.entries(upstream.fields).map(([k,v]) => `${k}: ${v}`).join('\n') : null)
              || (upstream.chunks ? `${upstream.chunks.length} chunks produced` : null)
              || JSON.stringify(upstream, null, 2)
          }
        }

        const resolvedBody = body.replace(/\{\{output\}\}/g, upstreamText)

        await resend.emails.send({
          from:    'FlowAI <onboarding@resend.dev>',
          to,
          subject,
          text:    resolvedBody,
        })

        output = { sent: true, to, subject }
      } catch (emailErr) {
        output = { sent: false, error: emailErr.message }
      }
      break
    }

      case 'webhook_out': {
        const url     = config.url
        const method  = (config.method || 'POST').toUpperCase()
        const payload = upstreamData[0] || {}

        if (!url) {
          output = { sent: false, reason: 'No URL configured in node settings' }
          break
        }

        try {
          const { default: axios } = await import('axios')
          const res = await axios({ method, url, data: payload, timeout: 10000 })
          output = { sent: true, url, status: res.status, response: res.data }
        } catch (httpErr) {
          output = { sent: false, url, error: httpErr.message }
        }
        break
      }

      case 'store':
      case 'save_db':
      case 'database': {
        const upstream = upstreamData[0]
        if (!upstream) {
          output = { saved: false, reason: 'No upstream data to save' }
          break
        }

        // Extract the best text content from upstream
        const content = upstream.summary
          || upstream.text
          || upstream.category
          || upstream.message
          || (upstream.pairs  ? JSON.stringify(upstream.pairs)  : null)
          || (upstream.fields ? JSON.stringify(upstream.fields) : null)
          || (upstream.chunks ? `${upstream.chunks.length} chunks` : null)
          || null

        // Detect output type
        const outputType = upstream.summary  ? 'summary'
          : upstream.pairs                   ? 'qa_pairs'
          : upstream.fields                  ? 'extracted_fields'
          : upstream.chunks                  ? 'chunks'
          : upstream.category                ? 'classification'
          : upstream.text                    ? 'extracted_text'
          : 'generic'

        const result = await pool.query(
          `INSERT INTO workflow_outputs
             (workflow_id, node_label, output_type, content, data)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, saved_at`,
          [
            workflowId || node.workflow_id,
            node.label,
            outputType,
            content,
            JSON.stringify(upstream),
          ]
        )

        output = {
          saved:      true,
          recordId:   result.rows[0].id,
          savedAt:    result.rows[0].saved_at,
          outputType,
          preview:    content?.slice(0, 120) || null,
        }
        break
      }

      default:
        output = { message: `Step "${node.label}" noted`, nodeType: node.node_type }
    }

  } catch (err) {
    status = 'error'
    error  = err.message
    output = { error: err.message }
    console.error(`[execute:${node.node_type}]`, err.message)
  }

  return {
    nodeId:     node.node_id,
    label:      node.label,
    type:       node.node_type,
    status,
    error,
    output,
    durationMs: Date.now() - start,
  }
}

export default router