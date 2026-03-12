import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { initDB } from './config/initDB.js'
import workflowRoutes from './routes/workflowRoutes.js'
import graphRoutes    from './routes/graphRoutes.js'
import uploadRoutes   from './routes/uploadRoutes.js'
import webhookRoutes  from './routes/webhookRoutes.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir))

app.use('/api', workflowRoutes)
app.use('/api/graph', graphRoutes)
app.use('/api', uploadRoutes)
app.use('/webhook', webhookRoutes)  // Webhook IN — trigger workflows externally

app.get('/health', (req, res) => {
  res.json({
    status: 'workflow-service running',
    groq:  !!process.env.GROQ_API_KEY,
    email: !!process.env.EMAIL_USER,
  })
})

const PORT = process.env.PORT || 4001

app.listen(PORT, async () => {
  console.log(`\n🚀 Workflow Service running on port ${PORT}`)
  console.log(`   Groq AI : ${process.env.GROQ_API_KEY ? '✓ configured' : '✗ GROQ_API_KEY not set'}`)
  console.log(`   Email   : ${process.env.EMAIL_USER  ? '✓ configured' : '✗ EMAIL_USER not set'}\n`)
  await initDB()
})