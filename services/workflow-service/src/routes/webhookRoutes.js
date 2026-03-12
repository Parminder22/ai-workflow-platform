/**
 * Webhook IN — trigger a workflow from an external HTTP call
 *
 * Usage:
 *   POST http://localhost:4001/webhook/:workflowId
 *   Header: x-webhook-secret: <your_secret>   (optional if WEBHOOK_SECRET not set)
 *   Body:   any JSON — passed as input to the workflow's first node
 *
 * The workflow must have a "Webhook Trigger" node as its entry point.
 */

import express from 'express'
import pool    from '../config/db.js'
import axios   from 'axios'

const router = express.Router()

router.post('/:workflowId', async (req, res) => {
  const { workflowId } = req.params
  const secret         = req.headers['x-webhook-secret']
  const payload        = req.body

  // Optional secret check
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' })
  }

  try {
    // Check workflow exists
    const wf = await pool.query('SELECT id, name FROM workflows WHERE id=$1', [workflowId])
    if (wf.rows.length === 0) {
      return res.status(404).json({ error: `Workflow ${workflowId} not found` })
    }

    // Fire and respond immediately (non-blocking run)
    const runUrl = `http://localhost:${process.env.PORT || 4001}/api/graph/run/${workflowId}`

    // Store incoming payload as webhook_payload in request context
    // by passing it as a query param hint (the run engine will pick it up)
    axios.post(runUrl, { webhookPayload: payload }).catch(err => {
      console.error(`[webhook-in] Background run failed for workflow ${workflowId}:`, err.message)
    })

    res.json({
      accepted:    true,
      workflowId:  Number(workflowId),
      workflow:    wf.rows[0].name,
      message:     'Workflow triggered — running in background',
      triggeredAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('[webhook-in]', err.message)
    res.status(500).json({ error: 'Webhook trigger failed', detail: err.message })
  }
})

// GET — health check / confirm the webhook URL is live
router.get('/:workflowId', async (req, res) => {
  const { workflowId } = req.params
  try {
    const wf = await pool.query('SELECT id, name, last_run FROM workflows WHERE id=$1', [workflowId])
    if (wf.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json({
      active:     true,
      workflowId: Number(workflowId),
      workflow:   wf.rows[0].name,
      lastRun:    wf.rows[0].last_run,
      endpoint:   `POST http://localhost:${process.env.PORT || 4001}/webhook/${workflowId}`,
      headers:    process.env.WEBHOOK_SECRET ? { 'x-webhook-secret': '<your secret>' } : {},
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router