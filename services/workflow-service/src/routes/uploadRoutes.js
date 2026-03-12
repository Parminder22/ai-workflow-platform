import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = express.Router()

const UPLOAD_DIR = path.join(__dirname, '../../uploads')

// Disk storage — keep original extension, prefix with timestamp
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}-${safe}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error(`File type not allowed. Accepted: ${allowed.join(', ')}`))
  },
})

// POST /api/upload
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  res.json({
    fileId:    req.file.filename,
    filename:  req.file.originalname,
    mimetype:  req.file.mimetype,
    size:      req.file.size,
    path:      req.file.path,
    url:       `/uploads/${req.file.filename}`,
  })
})

// DELETE /api/upload/:fileId
router.delete('/upload/:fileId', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.fileId)
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: 'Could not delete file' })
  }
})

export default router