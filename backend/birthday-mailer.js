import nodemailer from 'nodemailer'

const POLL_INTERVAL_MS = 15_000
const RETRY_INTERVAL_MS = 60_000

function decodeJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

export function startBirthdayEmailScheduler(pool) {
  let running = false
  const retryAfter = new Map()

  async function checkDeadline() {
    if (running) return
    running = true
    try {
      const [settingsRows] = await pool.query('SELECT payload FROM birthday_settings WHERE id = 1')
      if (!settingsRows.length) return
      const settings = decodeJson(settingsRows[0].payload)
      const target = settings.countdownTarget
      const targetTime = target ? new Date(target).getTime() : Number.NaN
      if (!settings.countdownEnabled || !Number.isFinite(targetTime) || Date.now() < targetTime) return

      const [notificationRows] = await pool.query('SELECT recipients, sent_for_target FROM birthday_email_notifications WHERE id = 1')
      if (!notificationRows.length) return
      const notification = notificationRows[0]
      if (notification.sent_for_target === target) return
      const recipients = decodeJson(notification.recipients)
      if (!Array.isArray(recipients) || recipients.length === 0) return
      if ((retryAfter.get(target) ?? 0) > Date.now()) return

      const username = process.env.MAIL_USERNAME
      const password = process.env.MAIL_PASSWORD
      const galleryPassword = process.env.GALLERY_PASSWORD
      const siteUrl = process.env.PUBLIC_SITE_URL
      if (!username || !password || !galleryPassword || !siteUrl) {
        throw new Error('Set MAIL_USERNAME, MAIL_PASSWORD, GALLERY_PASSWORD, and PUBLIC_SITE_URL to send birthday notifications.')
      }
      const parsedSiteUrl = new URL(siteUrl)
      if (!['http:', 'https:'].includes(parsedSiteUrl.protocol)) throw new Error('PUBLIC_SITE_URL must use HTTP or HTTPS.')

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: username, pass: password },
      })
      const name = settings.name || 'there'
      const greetingName = escapeHtml(name)
      const safeUrl = escapeHtml(parsedSiteUrl.toString())
      const safePassword = escapeHtml(galleryPassword)
      const subject = `Happy Birthday, ${name}!`
      const text = `Happy Birthday, ${name}!\n\nYour birthday celebration is ready. Visit ${parsedSiteUrl.toString()} and use this website password: ${galleryPassword}\n\nWith love.`
      const html = `<div style="font-family:Georgia,serif;color:#382b30;line-height:1.7;max-width:560px;margin:24px auto;padding:32px;border:1px solid #eadfd9"><p style="color:#b7505a;letter-spacing:2px;font:700 11px Arial,sans-serif">A DAY MADE FOR YOU</p><h1 style="font-weight:400">Happy Birthday, ${greetingName}!</h1><p>Your birthday celebration is ready. We hope it brings a little extra joy to your day.</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#b7505a;color:#fff;text-decoration:none">Open your birthday website</a></p><p><strong>Website password:</strong> ${safePassword}</p><p>With love.</p></div>`

      await transporter.sendMail({
        from: username,
        bcc: recipients,
        to: username,
        subject,
        text,
        html,
      })
      await pool.execute(
        'UPDATE birthday_email_notifications SET sent_for_target = ? WHERE id = 1',
        [target],
      )
      retryAfter.delete(target)
      console.log(`Birthday email sent for countdown deadline ${target}.`)
    } catch (error) {
      console.error('Birthday email delivery failed:', error.message)
      try {
        const [settingsRows] = await pool.query('SELECT payload FROM birthday_settings WHERE id = 1')
        const target = settingsRows.length ? decodeJson(settingsRows[0].payload).countdownTarget : null
        if (target) retryAfter.set(target, Date.now() + RETRY_INTERVAL_MS)
      } catch {
        // The next scheduled check will retry after a temporary database error.
      }
    } finally {
      running = false
    }
  }

  void checkDeadline()
  const timer = setInterval(() => void checkDeadline(), POLL_INTERVAL_MS)
  timer.unref()
}