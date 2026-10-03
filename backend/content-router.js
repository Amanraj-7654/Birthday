import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { readContent, writeContent } from './content.js'
import { requireAdmin, requireGalleryAccess } from './auth.js'

const uploadDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'uploads')
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp'])
const imageFilenamePattern = /^[a-z0-9_-]+\.(?:jpe?g|png|gif|webp|avif|bmp)$/i
await mkdir(uploadDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadDirectory),
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase().slice(0, 12)
    callback(null, `${randomUUID()}${extension}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const isImage = file.mimetype.startsWith('image/') && imageExtensions.has(path.extname(file.originalname).toLowerCase())
    const isAudio = file.mimetype.startsWith('audio/')
    const allowed = isImage || isAudio
    callback(allowed ? null : new Error('Upload a JPEG, PNG, GIF, WebP, AVIF, BMP, or audio file.'), allowed)
  },
})
const photoUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 50 },
  fileFilter: (_request, file, callback) => {
    const allowed = file.mimetype.startsWith('image/') && imageExtensions.has(path.extname(file.originalname).toLowerCase())
    callback(allowed ? null : new Error('Upload JPEG, PNG, GIF, WebP, AVIF, or BMP images.'), allowed)
  },
})

function protectImageUrls(result) {
  if (!result.data) return result
  const data = { ...result.data }
  for (const [collection, field] of [['photos', 'url'], ['memories', 'image'], ['timeline', 'image']]) {
    if (!Array.isArray(data[collection])) continue
    data[collection] = data[collection].map(item => {
      if (!item || typeof item[field] !== 'string') return item
      const match = item[field].match(/^\/uploads\/([a-z0-9_-]+\.(?:jpe?g|png|gif|webp|avif|bmp))$/i)
      return match ? { ...item, [field]: `/api/media/${match[1]}` } : item
    })
  }
  return { ...result, data }
}

export function createContentRouter(pool) {
  const router = Router()
  const wishSubmissions = new Map()

  router.get('/content', async (_request, response, next) => {
    try {
      const result = protectImageUrls(await readContent(pool, true))
      response.set('Cache-Control', 'no-store')
      response.json(result)
    } catch (error) { next(error) }
  })

  router.get('/admin/content', requireAdmin, async (_request, response, next) => {
    try {
      response.set('Cache-Control', 'no-store')
      response.json(protectImageUrls(await readContent(pool)))
    } catch (error) { next(error) }
  })

  router.get('/admin/email-notifications', requireAdmin, async (_request, response, next) => {
    try {
      const [rows] = await pool.query('SELECT recipients FROM birthday_email_notifications WHERE id = 1')
      const recipients = rows.length
        ? (typeof rows[0].recipients === 'string' ? JSON.parse(rows[0].recipients) : rows[0].recipients)
        : []
      response.set('Cache-Control', 'no-store')
      response.json({ recipients })
    } catch (error) { next(error) }
  })

  router.put('/admin/email-notifications', requireAdmin, async (request, response, next) => {
    try {
      const submitted = request.body?.recipients
      if (!Array.isArray(submitted) || submitted.length > 100 || submitted.some(address => typeof address !== 'string')) {
        return response.status(400).json({ error: 'Enter up to 100 recipient email addresses.' })
      }
      const recipients = [...new Set(submitted.map(address => address.trim().toLowerCase()).filter(Boolean))]
      if (recipients.some(address => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))) {
        return response.status(400).json({ error: 'One or more recipient email addresses are invalid.' })
      }
      await pool.execute(
        'INSERT INTO birthday_email_notifications (id, recipients) VALUES (1, ?) ON DUPLICATE KEY UPDATE recipients = VALUES(recipients)',
        [JSON.stringify(recipients)],
      )
      response.json({ saved: true, recipients })
    } catch (error) { next(error) }
  })

  router.get('/media/:filename', requireGalleryAccess, (request, response, next) => {
    const { filename } = request.params
    if (!imageFilenamePattern.test(filename)) return response.status(404).end()
    response.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    })
    response.sendFile(filename, { root: uploadDirectory, dotfiles: 'deny' }, error => {
      if (!error) return
      if (response.headersSent) return next(error)
      if (error.status === 404) return response.status(404).end()
      next(error)
    })
  })

  router.post('/wishes', requireGalleryAccess, async (request, response, next) => {
    const author = typeof request.body?.author === 'string' ? request.body.author.trim() : ''
    const message = typeof request.body?.message === 'string' ? request.body.message.trim() : ''
    if (!author || author.length > 80 || message.length < 2 || message.length > 1000) {
      return response.status(400).json({ error: 'Add your name and a message of up to 1,000 characters.' })
    }

    const now = Date.now()
    const previousSubmission = wishSubmissions.get(request.sessionID)
    if (previousSubmission && now - previousSubmission < 30_000) {
      return response.status(429).json({ error: 'Please wait a moment before sending another wish.' })
    }

    try {
      const [settings] = await pool.query('SELECT id FROM birthday_settings WHERE id = 1')
      if (!settings.length) return response.status(503).json({ error: 'Wishes are not open yet. Please try again later.' })
      const [orderRows] = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM messages')
      const id = `message-${randomUUID()}`
      const order = Number(orderRows[0].next_order)
      const payload = { id, author, message, date: new Date().toISOString().slice(0, 10), featured: false, order, visible: false }
      await pool.execute(
        'INSERT INTO messages (id, payload, is_visible, sort_order) VALUES (?, ?, FALSE, ?)',
        [id, JSON.stringify(payload), order],
      )
      wishSubmissions.set(request.sessionID, now)
      response.status(201).json({ submitted: true, message: 'Thanks for sharing a wish. It will appear here after review.' })
    } catch (error) { next(error) }
  })

  router.put('/admin/content', requireAdmin, async (request, response, next) => {
    try {
      await writeContent(pool, request.body)
      response.json({ saved: true })
    } catch (error) { next(error) }
  })

  router.post('/admin/uploads', requireAdmin, upload.single('file'), (request, response) => {
    if (!request.file) return response.status(400).json({ error: 'Choose an image or audio file.' })
    const url = request.file.mimetype.startsWith('image/')
      ? `/api/media/${request.file.filename}`
      : `/uploads/${request.file.filename}`
    response.status(201).json({ url, mimeType: request.file.mimetype })
  })

  router.post('/admin/uploads/photos', requireAdmin, photoUpload.array('files', 50), (request, response) => {
    const files = request.files ?? []
    if (!files.length) return response.status(400).json({ error: 'Choose at least one photo to upload.' })
    response.status(201).json({
      files: files.map(file => ({ url: `/api/media/${file.filename}`, mimeType: file.mimetype })),
    })
  })

  return router
}
