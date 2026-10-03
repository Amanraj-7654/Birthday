import { randomUUID } from 'node:crypto'

const collections = {
  photos: 'photos',
  albums: 'albums',
  memories: 'memories',
  timeline: 'timeline_events',
  messages: 'messages',
  songs: 'songs',
}

function decodePayload(payload) {
  return typeof payload === 'string' ? JSON.parse(payload) : payload
}

export async function readContent(pool, publicOnly = false) {
  const content = {}
  let initialized = false

  for (const [key, table] of Object.entries(collections)) {
    const where = publicOnly ? ' WHERE is_visible = TRUE' : ''
    const [rows] = await pool.query(`SELECT payload FROM ${table}${where} ORDER BY sort_order, id`)
    const records = rows.map(row => decodePayload(row.payload))
    content[key] = records
    if (rows.length) initialized = true
  }

  const [settingsRows] = await pool.query('SELECT payload FROM birthday_settings WHERE id = 1')
  content.settings = settingsRows.length ? decodePayload(settingsRows[0].payload) : null
  if (publicOnly && content.settings) content.settings = { ...content.settings, musicUrl: '' }
  initialized ||= settingsRows.length > 0
  return { initialized, data: initialized ? content : null }
}

export async function writeContent(pool, data) {
  if (!data || typeof data !== 'object' || !data.settings || typeof data.settings !== 'object') {
    const error = new Error('Content must include settings and collection arrays.')
    error.status = 400
    throw error
  }
  for (const key of Object.keys(collections)) {
    if (!Array.isArray(data[key])) {
      const error = new Error(`Content collection '${key}' must be an array.`)
      error.status = 400
      throw error
    }
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    for (const [key, table] of Object.entries(collections)) {
      await connection.query(`DELETE FROM ${table}`)
      for (const [index, entry] of data[key].entries()) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          const error = new Error(`Every ${key} item must be an object.`)
          error.status = 400
          throw error
        }
        const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `${key}-${randomUUID()}`
        const payload = { ...entry, id, visible: entry.visible !== false, order: Number(entry.order ?? index) }
        await connection.execute(
          `INSERT INTO ${table} (id, payload, is_visible, sort_order) VALUES (?, ?, ?, ?)`,
          [id, JSON.stringify(payload), payload.visible, payload.order],
        )
      }
    }
    await connection.execute(
      'INSERT INTO birthday_settings (id, payload) VALUES (1, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload)',
      [JSON.stringify(data.settings)],
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
