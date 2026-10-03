import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDatabasePool } from './db.js'
import { createAuthRouter } from './auth.js'
import { createContentRouter } from './content-router.js'
import { MySQLSessionStore } from './session-store.js'
import { startBirthdayEmailScheduler } from './birthday-mailer.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(currentDirectory, '..')

async function startServer() {
  const pool = await createDatabasePool()
  startBirthdayEmailScheduler(pool)
  const app = express()
  const port = Number(process.env.PORT || 3001)
  const sessionStore = new MySQLSessionStore(pool)

  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '2mb' }))
  app.use(session({
    name: 'birthday.sid',
    secret: process.env.SESSION_SECRET || randomBytes(48).toString('hex'),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    },
  }))

  app.get('/api/health', async (_request, response) => {
    try {
      await pool.query('SELECT 1')
      response.json({ ok: true })
    } catch {
      response.status(503).json({ ok: false })
    }
  })
  app.use('/api', createAuthRouter())
  app.use('/api', createContentRouter(pool))
  app.get('/uploads/:filename', (request, response, next) => {
    if (!/^[a-z0-9_-]+\.(?:mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(request.params.filename)) {
      return response.status(404).end()
    }
    response.set('X-Content-Type-Options', 'nosniff')
    response.sendFile(request.params.filename, { root: path.join(currentDirectory, 'uploads'), dotfiles: 'deny' }, error => {
      if (!error) return
      if (response.headersSent) return next(error)
      if (error.status === 404) return response.status(404).end()
      next(error)
    })
  })

  const buildDirectory = path.join(projectDirectory, 'dist')
  if (existsSync(buildDirectory)) {
    app.use(express.static(buildDirectory))
    app.get('*splat', (request, response, next) => {
      if (request.path.startsWith('/api/') || request.path.startsWith('/uploads/')) return next()
      response.sendFile(path.join(buildDirectory, 'index.html'))
    })
  }

  app.use((error, _request, response, _next) => {
    console.error(error)
    const status = Number(error.status) || (error instanceof SyntaxError ? 400 : 500)
    response.status(status).json({ error: status === 500 ? 'The server could not complete that request.' : error.message })
  })

  app.listen(port, () => console.log(`Birthday API listening on http://localhost:${port}`))
}

startServer().catch(error => {
  console.error('Birthday backend could not start:', error.message)
  process.exitCode = 1
})
