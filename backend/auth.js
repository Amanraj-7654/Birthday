import { Router } from 'express'
import { timingSafeEqual } from 'node:crypto'

function matches(value, expected) {
  const supplied = Buffer.from(String(value ?? ''))
  const configured = Buffer.from(String(expected ?? ''))
  return supplied.length === configured.length && timingSafeEqual(supplied, configured)
}

export function requireAdmin(request, response, next) {
  if (request.session?.isAdmin) return next()
  response.status(401).json({ error: 'Admin sign-in required.' })
}

export function requireGalleryAccess(request, response, next) {
  if (request.session?.isAdmin || request.session?.galleryUnlocked) return next()
  response.status(401).json({ error: 'Gallery access required.' })
}

export function createAuthRouter() {
  const router = Router()
  const attempts = new Map()
  const galleryAttempts = new Map()

  router.get('/gallery/status', (request, response) => {
    response.set('Cache-Control', 'no-store')
    response.json({
      configured: Boolean(process.env.GALLERY_PASSWORD),
      authenticated: Boolean(request.session?.isAdmin || request.session?.galleryUnlocked),
    })
  })

  router.post('/gallery/unlock', (request, response) => {
    const password = process.env.GALLERY_PASSWORD
    if (!password) return response.status(503).json({ error: 'Gallery password is not configured on the server.' })

    const now = Date.now()
    const address = request.ip
    const previous = galleryAttempts.get(address)
    if (previous && now - previous.startedAt < 15 * 60 * 1000 && previous.count >= 10) {
      return response.status(429).json({ error: 'Too many attempts. Try again later.' })
    }
    if (!matches(request.body?.password, password)) {
      const state = previous && now - previous.startedAt < 15 * 60 * 1000
        ? { startedAt: previous.startedAt, count: previous.count + 1 }
        : { startedAt: now, count: 1 }
      galleryAttempts.set(address, state)
      return response.status(401).json({ error: 'That passcode is not correct.' })
    }

    galleryAttempts.delete(address)
    request.session.regenerate(error => {
      if (error) return response.status(500).json({ error: 'Unable to start a gallery session.' })
      request.session.galleryUnlocked = true
      request.session.save(saveError => {
        if (saveError) return response.status(500).json({ error: 'Unable to save the gallery session.' })
        response.json({ authenticated: true })
      })
    })
  })

  router.post('/login', (request, response) => {
    const now = Date.now()
    const address = request.ip
    const previous = attempts.get(address)
    if (previous && now - previous.startedAt < 15 * 60 * 1000 && previous.count >= 10) {
      return response.status(429).json({ error: 'Too many sign-in attempts. Try again later.' })
    }

    const username = process.env.ADMIN_USERNAME
    const password = process.env.ADMIN_PASSWORD
    if (!username || !password || !matches(request.body?.username, username) || !matches(request.body?.password, password)) {
      const state = previous && now - previous.startedAt < 15 * 60 * 1000
        ? { startedAt: previous.startedAt, count: previous.count + 1 }
        : { startedAt: now, count: 1 }
      attempts.set(address, state)
      return response.status(401).json({ error: 'That username or password is incorrect.' })
    }

    attempts.delete(address)
    request.session.regenerate(error => {
      if (error) return response.status(500).json({ error: 'Unable to start an admin session.' })
      request.session.isAdmin = true
      request.session.save(saveError => {
        if (saveError) return response.status(500).json({ error: 'Unable to save the admin session.' })
        response.json({ authenticated: true })
      })
    })
  })

  router.post('/logout', (request, response) => {
    request.session.destroy(() => {
      response.clearCookie('birthday.sid')
      response.status(204).end()
    })
  })

  return router
}
