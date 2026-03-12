import pool from './db.js'

export async function initDB() {
  try {
    // Workflows table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'active',
        last_run   TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Nodes table — extended with node_type, category, icon
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_nodes (
        id          SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        node_id     TEXT NOT NULL,
        label       TEXT NOT NULL,
        node_type   TEXT NOT NULL DEFAULT 'default',
        category    TEXT NOT NULL DEFAULT 'default',
        icon        TEXT DEFAULT '',
        position_x  FLOAT NOT NULL DEFAULT 0,
        position_y  FLOAT NOT NULL DEFAULT 0,
        config      JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (workflow_id, node_id)
      )
    `)

    // Edges table — extended with edge_id and label
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_edges (
        id          SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        edge_id     TEXT,
        source      TEXT NOT NULL,
        target      TEXT NOT NULL,
        label       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Workflow steps (legacy — keep for compatibility)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_steps (
        id          SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        step_type   TEXT NOT NULL,
        position    INTEGER NOT NULL DEFAULT 0,
        config      JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Run logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id          SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        status      TEXT NOT NULL DEFAULT 'pending',
        steps_log   JSONB DEFAULT '[]',
        error       TEXT,
        started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ
      )
    `)

    // Pipeline outputs — saved by "Save to Database" node
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_outputs (
        id          SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        node_label  TEXT NOT NULL,
        output_type TEXT NOT NULL DEFAULT 'generic',
        content     TEXT,
        data        JSONB DEFAULT '{}',
        saved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Add missing columns to existing tables (safe migrations)
    const safeAlters = [
      `ALTER TABLE workflow_nodes ADD COLUMN IF NOT EXISTS node_type  TEXT NOT NULL DEFAULT 'default'`,
      `ALTER TABLE workflow_nodes ADD COLUMN IF NOT EXISTS category   TEXT NOT NULL DEFAULT 'default'`,
      `ALTER TABLE workflow_nodes ADD COLUMN IF NOT EXISTS icon       TEXT DEFAULT ''`,
      `ALTER TABLE workflow_nodes ADD COLUMN IF NOT EXISTS config     JSONB DEFAULT '{}'`,
      `ALTER TABLE workflow_edges ADD COLUMN IF NOT EXISTS edge_id    TEXT`,
      `ALTER TABLE workflow_edges ADD COLUMN IF NOT EXISTS label      TEXT`,
      `ALTER TABLE workflows      ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'active'`,
      `ALTER TABLE workflows      ADD COLUMN IF NOT EXISTS last_run   TIMESTAMPTZ`,
      `ALTER TABLE workflows      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    ]

    for (const sql of safeAlters) {
      try {
        await pool.query(sql)
      } catch (_) {
        // Ignore if column already exists or type mismatch
      }
    }

    console.log('[initDB] Database schema ready ✓')

  } catch (err) {
    console.error('[initDB] Error:', err)
    throw err
  }
}