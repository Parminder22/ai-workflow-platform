import pool from '../config/db.js'

export async function createWorkflow(req, res) {
  try {
    const { name } = req.body
    const result = await pool.query(
      'INSERT INTO workflows(name) VALUES($1) RETURNING *',
      [name]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function getWorkflows(req, res) {
  try {
    // Include run count per workflow
    const result = await pool.query(`
      SELECT w.*,
        (SELECT COUNT(*) FROM workflow_runs r WHERE r.workflow_id = w.id) AS run_count,
        (SELECT COUNT(*) FROM workflow_nodes n WHERE n.workflow_id = w.id) AS node_count
      FROM workflows w
      ORDER BY w.id DESC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function deleteWorkflow(req, res) {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM workflows WHERE id=$1', [id])
    res.json({ deleted: true, id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function addStep(req, res) {
  try {
    const { id } = req.params
    const { step_type, position } = req.body
    const result = await pool.query(
      `INSERT INTO workflow_steps(workflow_id,step_type,position)
       VALUES($1,$2,$3) RETURNING *`,
      [id, step_type, position]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

// ── Run History ───────────────────────────────────────────────────────────────

export async function getWorkflowRuns(req, res) {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT r.*, w.name as workflow_name
       FROM workflow_runs r
       JOIN workflows w ON w.id = r.workflow_id
       WHERE r.workflow_id = $1
       ORDER BY r.started_at DESC
       LIMIT 50`,
      [id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function getAllRuns(req, res) {
  try {
    const result = await pool.query(`
      SELECT r.*, w.name as workflow_name
      FROM workflow_runs r
      JOIN workflows w ON w.id = r.workflow_id
      ORDER BY r.started_at DESC
      LIMIT 100
    `)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}