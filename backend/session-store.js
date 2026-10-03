import session from 'express-session'

export class MySQLSessionStore extends session.Store {
  constructor(pool) {
    super()
    this.pool = pool
  }

  get(sessionId, callback) {
    this.pool.execute('SELECT data, expires FROM admin_sessions WHERE session_id = ?', [sessionId])
      .then(async ([rows]) => {
        if (!rows.length) return callback(null, null)
        if (Number(rows[0].expires) <= Date.now()) {
          await this.destroy(sessionId, () => undefined)
          return callback(null, null)
        }
        callback(null, JSON.parse(rows[0].data))
      })
      .catch(callback)
  }

  set(sessionId, sessionData, callback = () => undefined) {
    const expires = this.expiration(sessionData)
    this.pool.execute(
      'INSERT INTO admin_sessions (session_id, expires, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)',
      [sessionId, expires, JSON.stringify(sessionData)],
    ).then(() => callback(null)).catch(callback)
  }

  touch(sessionId, sessionData, callback = () => undefined) {
    this.pool.execute(
      'UPDATE admin_sessions SET expires = ?, data = ? WHERE session_id = ?',
      [this.expiration(sessionData), JSON.stringify(sessionData), sessionId],
    ).then(() => callback(null)).catch(callback)
  }

  destroy(sessionId, callback = () => undefined) {
    this.pool.execute('DELETE FROM admin_sessions WHERE session_id = ?', [sessionId])
      .then(() => callback(null)).catch(callback)
  }

  clear(callback = () => undefined) {
    this.pool.query('DELETE FROM admin_sessions')
      .then(() => callback(null)).catch(callback)
  }

  length(callback) {
    this.pool.query('SELECT COUNT(*) AS count FROM admin_sessions')
      .then(([rows]) => callback(null, Number(rows[0].count))).catch(callback)
  }

  expiration(sessionData) {
    const expiresAt = sessionData.cookie?.expires ? new Date(sessionData.cookie.expires).getTime() : NaN
    return Number.isFinite(expiresAt) ? expiresAt : Date.now() + 8 * 60 * 60 * 1000
  }
}
