import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react'
import './VisitorGate.css'

type VisitorGateProps = {
  name: string
  onAccessGranted: () => void
}

type GateState = 'checking' | 'locked' | 'unconfigured' | 'unavailable'

export function VisitorGate({ name, onAccessGranted }: VisitorGateProps) {
  const [state, setState] = useState<GateState>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    fetch('/api/gallery/status', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Gallery access is unavailable.')
        return await response.json() as { configured: boolean; authenticated: boolean }
      })
      .then(result => {
        if (!active) return
        if (result.authenticated) onAccessGranted()
        else setState(result.configured ? 'locked' : 'unconfigured')
      })
      .catch(() => { if (active) setState('unavailable') })
    return () => { active = false }
  }, [onAccessGranted, retry])

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/gallery/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Unable to unlock the gallery.')
      onAccessGranted()
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : 'Unable to unlock the gallery.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="visitor-gate">
      <div className="visitor-gate-panel">
        <span className="visitor-gate-mark"><Sparkles size={17} /></span>
        <p className="visitor-gate-kicker">A PRIVATE COLLECTION</p>
        <h1>Made for <em>{name}.</em></h1>
        <p className="visitor-gate-copy">This little collection is just for the people invited in.</p>
        {state === 'checking' && <p className="visitor-gate-message" role="status">Checking gallery access…</p>}
        {state === 'locked' && <form className="visitor-gate-form" onSubmit={unlock}>
          <label htmlFor="gallery-password">Visitor passcode</label>
          <input id="gallery-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
          {error && <p className="visitor-gate-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting || !password}><LockKeyhole size={16} /> {submitting ? 'Checking…' : 'Open the collection'} <ArrowRight size={15} /></button>
        </form>}
        {state === 'unconfigured' && <p className="visitor-gate-message" role="status">Gallery access is not configured. Set <code>GALLERY_PASSWORD</code> in the server environment.</p>}
        {state === 'unavailable' && <div className="visitor-gate-message" role="alert"><p>Gallery access could not be checked.</p><button className="visitor-gate-retry" type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
      </div>
    </main>
  )
}