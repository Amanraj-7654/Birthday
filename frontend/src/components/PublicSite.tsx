import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, CakeSlice, ChevronDown, Heart, Music2, Pause, Play, Send, Sparkles, Volume2, X } from 'lucide-react'
import type { BirthdayData } from '../types'
import './SongSelect.css'
import './Countdown.css'

type PublicSiteProps = {
  data: BirthdayData
  onAdmin: () => void
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.16 }}>{children}</motion.div>
}

export function PublicSite({ data, onAdmin }: PublicSiteProps) {
  // Keep the selected album filter local to this visitor's current view.
  const [album, setAlbum] = useState('all')
  // The selected index drives the accessible photo lightbox.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  // Separate wish state controls the candle and confirmation message.
  const [wishMade, setWishMade] = useState(false)
  // Track the brief celebration burst triggered by a wish.
  const [celebrating, setCelebrating] = useState(false)
  // Mirror the audio element's manual play/pause state.
  const [playing, setPlaying] = useState(false)
  // Store current audio time for the player progress bar.
  const [progress, setProgress] = useState(0)
  // Store audio duration once browser metadata is available.
  const [duration, setDuration] = useState(0)
  // Keep the audio element volume in sync with its slider.
  const [volume, setVolume] = useState(0.65)
  const [selectedSongId, setSelectedSongId] = useState('')
  // Advance the soundtrack artwork independently of the photo gallery.
  const [soundtrackPhotoIndex, setSoundtrackPhotoIndex] = useState(0)
  // Control the compact navigation menu on mobile screens.
  const [mobileMenu, setMobileMenu] = useState(false)
  const [wishAuthor, setWishAuthor] = useState('')
  const [wishMessage, setWishMessage] = useState('')
  const [wishSubmitting, setWishSubmitting] = useState(false)
  const [wishFeedback, setWishFeedback] = useState<{ message: string; error: boolean } | null>(null)
  // Access native audio playback and seeking without rerendering the element.
  const audioRef = useRef<HTMLAudioElement>(null)
  const [clock, setClock] = useState(() => Date.now())
  const countdownTarget = data.settings.countdownTarget ? new Date(data.settings.countdownTarget).getTime() : Number.NaN
  const countdownPending = Boolean(data.settings.countdownEnabled) && (!Number.isFinite(countdownTarget) || clock < countdownTarget)

  useEffect(() => {
    if (!countdownPending) return
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [countdownPending])

  // Derive the gallery contents from the selected album and saved photo order.
  const photos = useMemo(() => data.photos.filter(photo => photo.visible !== false && (!photo.albumId || data.albums.some(item => item.id === photo.albumId && item.visible !== false)) && (album === 'all' || photo.albumId === album)).sort((a, b) => a.order - b.order), [data.photos, data.albums, album])
  const messages = data.messages.filter(message => message.visible !== false).sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.order - b.order)
  const songs = data.songs.filter(song => song.visible !== false)
  const currentSong = songs.find(song => song.id === selectedSongId) ?? songs[0]
  const activePhoto = lightboxIndex === null ? null : photos[lightboxIndex]
  const headingLead = data.settings.heroTitle.replace(/\[name\]/gi, '').replace(data.settings.name, '').replace(/[!, .\s]+$/, '').trim() || 'Happy Birthday'

  // Apply the page-load entrance marker only when motion is enabled.
  useEffect(() => {
    if (!data.settings.animations) return
    const timer = window.setTimeout(() => document.body.classList.add('page-ready'), 80)
    return () => window.clearTimeout(timer)
  }, [data.settings.animations])

  // Update native audio volume whenever the visitor changes the control.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current?.load()
  }, [currentSong?.url])

  // Rotate artwork at a quick cadence unless motion is reduced or disabled.
  useEffect(() => {
    if (data.photos.length < 2 || !data.settings.animations || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const carouselTimer = window.setInterval(() => setSoundtrackPhotoIndex(index => (index + 1) % data.photos.length), 500)
    return () => window.clearInterval(carouselTimer)
  }, [data.photos.length, data.settings.animations])

  // Support keyboard dismissal and previous/next navigation in the lightbox.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightboxIndex(null)
      if (event.key === 'ArrowRight') setLightboxIndex(index => index === null ? null : (index + 1) % photos.length)
      if (event.key === 'ArrowLeft') setLightboxIndex(index => index === null ? null : (index - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [photos.length])

  function changePhoto(direction: number) {
    setLightboxIndex(index => index === null ? null : (index + direction + photos.length) % photos.length)
  }

  function makeWish() {
    setWishMade(false)
    setCelebrating(true)
    window.setTimeout(() => setWishMade(true), 1150)
    window.setTimeout(() => setCelebrating(false), 3400)
  }

  async function toggleMusic() {
    if (!audioRef.current) return
    try {
      if (playing) audioRef.current.pause()
      else await audioRef.current.play()
      setPlaying(!playing)
    } catch {
      setPlaying(false)
    }
  }

  function seekMusic(value: number) {
    if (audioRef.current && duration) audioRef.current.currentTime = value
    setProgress(value)
  }

  async function submitWish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWishSubmitting(true)
    setWishFeedback(null)
    try {
      const response = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: wishAuthor, message: wishMessage }),
      })
      const result = await response.json() as { error?: string; message?: string }
      if (!response.ok) throw new Error(result.error || 'Your wish could not be sent.')
      setWishAuthor('')
      setWishMessage('')
      setWishFeedback({ message: result.message || 'Your wish has been sent for review.', error: false })
    } catch (error) {
      setWishFeedback({ message: error instanceof Error ? error.message : 'Your wish could not be sent.', error: true })
    } finally {
      setWishSubmitting(false)
    }
  }

  if (countdownPending) {
    const remaining = Number.isFinite(countdownTarget) ? Math.max(0, countdownTarget - clock) : 0
    const days = Math.floor(remaining / 86_400_000)
    const hours = Math.floor((remaining % 86_400_000) / 3_600_000)
    const minutes = Math.floor((remaining % 3_600_000) / 60_000)
    const seconds = Math.floor((remaining % 60_000) / 1000)
    const targetDate = Number.isFinite(countdownTarget) ? new Date(countdownTarget) : null

    return <main className="birthday-countdown" aria-live="polite">
      {/* Public countdown screen */}
      <div className="countdown-content">
        <span className="countdown-kicker">A MOMENT WORTH WAITING FOR</span>
        <p className="countdown-name">For {data.settings.name}</p>
        <h1>The celebration<br /><em>starts soon.</em></h1>
        {targetDate
          ? <p className="countdown-date">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(targetDate)}</p>
          : <p className="countdown-date">The date and time are being set.</p>}
        {targetDate && <div className="countdown-units" aria-label={`${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds remaining`}>
          {[['Days', days], ['Hours', hours], ['Minutes', minutes], ['Seconds', seconds]].map(([label, value]) => <div className="countdown-unit" key={label}><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span></div>)}
        </div>}
        <span className="countdown-year">{targetDate?.getFullYear() ?? '♥'}</span>
      </div>
    </main>
  }

  return (
    <div className="public-site">
      {/* Public birthday celebration screen */}
      <header className="site-header">
        <a className="wordmark" href="#home" aria-label="A little more love, home"><span className="wordmark-icon"><Sparkles size={17} /></span><span>a little more <i>love</i></span></a>
        <nav className={`main-nav ${mobileMenu ? 'is-open' : ''}`} aria-label="Main navigation">
          <a href="#memories" onClick={() => setMobileMenu(false)}>Memories</a>
          <a href="#story" onClick={() => setMobileMenu(false)}>Our story</a>
          <a href="#wishes" onClick={() => setMobileMenu(false)}>Birthday wishes</a>
          {songs.length > 0 && <a href="#music" onClick={() => setMobileMenu(false)}>The soundtrack</a>}
        </nav>
        <button className="header-admin" type="button" onClick={onAdmin}>The little details <ArrowUpRight size={14} /></button>
        <button className="mobile-menu-button" aria-label="Toggle navigation" onClick={() => setMobileMenu(!mobileMenu)}><span /><span /></button>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
          <div className="hero-grain" />
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> {data.settings.birthday.toUpperCase()} <span className="eyebrow-line" /></div>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}>
              {headingLead}<br /><span>{data.settings.name}<span className="hero-period">.</span></span>
            </motion.h1>
            <motion.p className="hero-subtitle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}>{data.settings.heroSubtitle}</motion.p>
            <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <a className="button button-dark" href="#memories">Explore memories <ArrowDown size={15} /></a>
              <button className="button button-outline" type="button" onClick={makeWish}><CakeSlice size={16} /> Make a wish</button>
            </motion.div>
            <div className="hero-note"><Heart size={14} fill="currentColor" /> A little love note, from all of us</div>
          </div>

          <motion.div className={`cake-scene ${celebrating ? 'is-celebrating' : ''} ${wishMade ? 'wish-made' : ''}`} initial={{ opacity: 0, scale: 0.88, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1, delay: 0.25, ease: 'easeOut' }} onClick={makeWish} role="button" tabIndex={0} aria-label="Click to make a birthday wish" onKeyDown={event => { if (event.key === 'Enter') makeWish() }}>
            <div className="cake-halo" />
            <div className="balloon balloon-pink"><span /></div><div className="balloon balloon-blue"><span /></div><div className="balloon balloon-gold"><span /></div><div className="balloon balloon-lilac"><span /></div>
            <div className="floating-star star-a">✦</div><div className="floating-star star-b">✧</div><div className="floating-star star-c">✴</div>
            <div className="cake-sparkle cake-sparkle-a" /><div className="cake-sparkle cake-sparkle-b" /><div className="cake-sparkle cake-sparkle-c" />
            <div className="cake">
              <div className="cake-candle candle-one"><span className="candle-flame" /><span className="candle-stick" /></div>
              <div className="cake-candle candle-two"><span className="candle-flame" /><span className="candle-stick" /></div>
              <div className="cake-candle candle-three"><span className="candle-flame" /><span className="candle-stick" /></div>
              <div className="cake-top"><div className="icing-drip drip-one" /><div className="icing-drip drip-two" /><div className="icing-drip drip-three" /><span className="cake-berry berry-one" /><span className="cake-berry berry-two" /><span className="cake-berry berry-three" /></div>
              <div className="cake-layer cake-layer-top"><span className="layer-piping" /></div>
              <div className="cake-layer cake-layer-bottom"><span className="layer-piping" /><span className="cake-plaque">for you</span></div>
              <div className="cake-plate" />
            </div>
            <div className="cake-shadow" />
            <div className="cake-hint"><span>{wishMade ? 'wish sent into the universe' : 'tap the cake to make a wish'}</span><Sparkles size={12} /></div>
            {celebrating && data.settings.confetti && <div className="confetti-burst" aria-hidden="true">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>}
          </motion.div>
          <div className="hero-bottom"><span>THE BEST IS YET TO COME</span><span className="bottom-dash" /><span>01 / 06</span></div>
        </section>

        <section className="memory-section section-wrap" id="memories">
          <Reveal className="section-heading-row"><div><p className="section-kicker">LITTLE MOMENTS, KEPT</p><h2>A life in <em>lovely</em> frames.</h2></div><p className="section-aside">The blurry ones are usually<br />the best ones.</p></Reveal>
          <div className="album-filter" role="group" aria-label="Filter memories by album">
            <button className={album === 'all' ? 'active' : ''} onClick={() => { setAlbum('all'); setLightboxIndex(null) }}>All the good bits <span>{data.photos.filter(photo => photo.visible !== false).length}</span></button>
            {data.albums.filter(item => item.visible !== false).slice().sort((a, b) => a.order - b.order).map(item => <button key={item.id} className={album === item.id ? 'active' : ''} onClick={() => { setAlbum(item.id); setLightboxIndex(null) }}>{item.name}<span>{data.photos.filter(photo => photo.visible !== false && photo.albumId === item.id).length}</span></button>)}
          </div>
          {photos.length ? <div className="photo-masonry">
            {photos.map((photo, index) => <motion.button className={`memory-photo photo-shape-${(index % 5) + 1}`} key={photo.id} layout initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.48, delay: (index % 4) * 0.06 }} whileHover={{ y: -6, rotate: index % 2 ? -0.5 : 0.5 }} onClick={() => setLightboxIndex(index)} aria-label={`Open photo: ${photo.caption}`}>
              <img src={photo.url} alt={photo.caption} loading="lazy" />
              <span className="photo-overlay"><span className="photo-caption">{photo.caption}</span><span className="photo-date">{formatDate(photo.date)}</span></span>
              {photo.featured && <span className="photo-heart"><Heart size={14} fill="currentColor" /></span>}
            </motion.button>)}
          </div> : <div className="empty-gallery"><Sparkles /><p>No photos in this album just yet.</p></div>}
          <div className="gallery-endmark"><span /> <Heart size={14} fill="currentColor" /> <span /></div>
        </section>

        <section className="memory-notes-section section-wrap">
          <Reveal className="memory-notes-heading"><div><p className="section-kicker">THE STORIES BEHIND THE SMILES</p><h2>Little things we <em>remember.</em></h2></div><p>Some moments deserve<br />a few extra words.</p></Reveal>
          {data.memories.filter(memory => memory.visible !== false).length ? <div className="memory-notes-grid">{data.memories.filter(memory => memory.visible !== false).slice().sort((a, b) => a.order - b.order).map((memory, index) => <Reveal className={`memory-note memory-note-${(index % 3) + 1}`} key={memory.id}><div className="memory-note-image"><img src={memory.image} alt="" loading="lazy" /><span>{memory.category || 'A little memory'}</span></div><div className="memory-note-copy"><div><span>{formatDate(memory.date)}</span>{memory.location && <span>{memory.location}</span>}</div><h3>{memory.title}</h3><p>{memory.description}</p></div></Reveal>)}</div> : <p className="empty-copy">A new little story is waiting to be added.</p>}
        </section>

        <section className="story-section" id="story">
          <div className="story-inner section-wrap">
            <Reveal className="story-heading"><p className="section-kicker">THEN, NOW & ALWAYS</p><h2>Look how far<br />we've <em>glowed.</em></h2><p className="story-intro">A few chapters from a story we're pretty happy to be part of.</p><div className="story-stamp"><span>GROWING<br />WITH LOVE</span><Heart size={18} fill="currentColor" /></div></Reveal>
            <div className="timeline-list">
              {data.timeline.filter(event => event.visible !== false).slice().sort((a, b) => a.order - b.order).map((event, index) => <Reveal key={event.id} className={`timeline-item ${index % 2 ? 'timeline-right' : ''}`}>
                <div className="timeline-year">{event.year}<span /></div>
                <div className="timeline-card"><div className="timeline-image"><img src={event.image} alt="" loading="lazy" /></div><div className="timeline-copy"><span className="timeline-index">CHAPTER {String(index + 1).padStart(2, '0')}</span><h3>{event.title}</h3><p>{event.description}</p></div></div>
              </Reveal>)}
              {!data.timeline.some(event => event.visible !== false) && <p className="empty-copy">The next chapter is waiting to be added.</p>}
            </div>
          </div>
        </section>

        <section className="wishes-section section-wrap" id="wishes">
          <Reveal className="wishes-heading"><p className="section-kicker">A FEW WORDS FOR YOU</p><h2>All the <em>love</em> in one place.</h2><p>Little notes from the people who make every year better.</p></Reveal>
          <div className="wishes-grid">
            {messages.slice(0, 6).map((message, index) => <Reveal className={`wish-card wish-card-${(index % 3) + 1}`} key={message.id}><div className="wish-ornament">“</div><p>{message.message}</p><div className="wish-byline"><span className="wish-avatar">{message.author.charAt(0)}</span><span><strong>{message.author}</strong><small>WITH LOVE, ALWAYS</small></span><Heart size={15} fill="currentColor" /></div></Reveal>)}
            {!messages.length && <p className="empty-copy">The first birthday note is ready to be written.</p>}
          </div>
          <form className="wish-submit" onSubmit={submitWish}>
            <div className="wish-submit-heading"><Heart size={16} /><div><h3>Leave a little love</h3><p>Your wish will be shared here after a quick review.</p></div></div>
            <div className="wish-submit-fields">
              <label>Name<input value={wishAuthor} onChange={event => setWishAuthor(event.target.value)} maxLength={80} autoComplete="name" required /></label>
              <label>Your birthday wish<textarea value={wishMessage} onChange={event => setWishMessage(event.target.value)} maxLength={1000} rows={3} required /></label>
            </div>
            <div className="wish-submit-footer">
              <p className={wishFeedback?.error ? 'wish-submit-feedback is-error' : 'wish-submit-feedback'} role={wishFeedback?.error ? 'alert' : 'status'}>{wishFeedback?.message ?? ''}</p>
              <button type="submit" disabled={wishSubmitting || !wishAuthor.trim() || !wishMessage.trim()}><Send size={14} />{wishSubmitting ? 'Sending…' : 'Send wish'}</button>
            </div>
          </form>
        </section>

        {/* Soundtrack section starts here. */}
        {currentSong && <section className="music-section section-wrap" id="music">
          <div className="music-orbit music-orbit-a" /><div className="music-orbit music-orbit-b" />
          <Reveal className="music-intro"><p className="section-kicker">PRESS PLAY, STAY AWHILE</p><h2>Every good day<br />deserves a <em>soundtrack.</em></h2><p>A little something to play while you wander through the memories.</p></Reveal>
          <div className="music-player">
            <div className={`soundtrack-frame ${playing ? 'is-playing' : ''}`} aria-label={`Soundtrack photo ${soundtrackPhotoIndex + 1} of ${data.photos.length}`}>
              {data.photos.length ? <>
                <div className="soundtrack-photo-stack">
                  <img className="soundtrack-photo-back" src={data.photos[(soundtrackPhotoIndex + 1) % data.photos.length].url} alt="" />
                  <img key={data.photos[soundtrackPhotoIndex].id} className="soundtrack-photo-active" src={data.photos[soundtrackPhotoIndex].url} alt={data.photos[soundtrackPhotoIndex].caption || 'A birthday memory'} />
                </div>
                <span className="soundtrack-photo-count">{String(soundtrackPhotoIndex + 1).padStart(2, '0')} <i>/</i> {String(data.photos.length).padStart(2, '0')}</span>
              </> : <div className="soundtrack-empty"><Music2 size={24} /></div>}
              <span className="soundtrack-frame-sparkle">✦</span>
            </div>
            <div className="track-details"><span className="track-kicker">TODAY'S LITTLE SOUNDTRACK</span>
            <strong>{currentSong.title}</strong><small>{currentSong.artist || `${data.settings.name}, with love`}</small>
            {songs.length > 1 && <select className="soundtrack-select" aria-label="Choose a song" value={currentSong.id} 
            onChange={event => { setProgress(0); setDuration(0); setSelectedSongId(event.target.value) }}>
              {songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select>}
              <div className="waveform" aria-label={playing ? 'Music playing' : 'Music paused'}>
                {Array.from({ length: 36 }, (_, index) => <span key={index} style={{ '--bar': index } as React.CSSProperties} />)}</div>
              <div className="track-progress"><span>{formatTime(progress)}</span><input type="range" aria-label="Music progress" min="0" max={duration || 100} value={Math.min(progress, duration || 100)} onChange={event => seekMusic(Number(event.target.value))} /><span>{duration ? formatTime(duration) : '—:——'}</span></div>
              <div className="track-controls"><button className="play-button" onClick={toggleMusic} aria-label={playing ? 'Pause music' : 'Play music'}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><span>{playing ? 'NOW PLAYING' : 'LISTEN WHEN YOU’RE READY'}</span><label className="volume-control" aria-label="Volume"><Volume2 size={15} /><input type="range" min="0" max="1" step="0.01" value={volume} onChange={event => setVolume(Number(event.target.value))} /></label></div>
            </div>
            <audio ref={audioRef} src={currentSong.url} preload="none" onTimeUpdate={event => setProgress(event.currentTarget.currentTime)} onLoadedMetadata={event => { setProgress(0); setDuration(event.currentTarget.duration) }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setPlaying(false)} />
          </div>
        </section>}

        <section className="last-note">
          <div className="last-note-stars">✦ &nbsp; ✧ &nbsp; ✦</div><p>Here's to all the beautiful things<br />that haven't happened <em>yet.</em></p><span>HAPPY BIRTHDAY, {data.settings.name.toUpperCase()}</span>
          <a href="#home" className="back-to-top" aria-label="Back to top"><ChevronDown size={18} /></a>
        </section>
      </main>

      <footer className="site-footer"><a className="wordmark" href="#home"><span className="wordmark-icon"><Sparkles size={16} /></span><span>a little more <i>love</i></span></a><p>{data.settings.footerText}</p><div className="footer-links">{data.settings.socialInstagram && <a href={data.settings.socialInstagram} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={12} /></a>}{data.settings.socialWebsite && <a href={data.settings.socialWebsite} target="_blank" rel="noreferrer">Website <ArrowUpRight size={12} /></a>}<span>MADE FOR {data.settings.name.toUpperCase()} · {data.settings.birthday.toUpperCase()}</span></div></footer>

      <AnimatePresence>{activePhoto && lightboxIndex !== null && <motion.div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightboxIndex(null)}>
        <button className="lightbox-close" aria-label="Close photo" onClick={() => setLightboxIndex(null)}><X size={22} /></button><button className="lightbox-arrow lightbox-prev" aria-label="Previous photo" onClick={event => { event.stopPropagation(); changePhoto(-1) }}><ArrowLeft size={20} /></button>
        <motion.div className="lightbox-content" key={activePhoto.id} initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} onClick={event => event.stopPropagation()}><img src={activePhoto.url} alt={activePhoto.caption} /><div className="lightbox-caption"><span>{activePhoto.caption}</span><small>{formatDate(activePhoto.date)} · {data.albums.find(item => item.id === activePhoto.albumId)?.name ?? 'Memory'}</small></div></motion.div>
        <button className="lightbox-arrow lightbox-next" aria-label="Next photo" onClick={event => { event.stopPropagation(); changePhoto(1) }}><ArrowRight size={20} /></button><span className="lightbox-counter">{String(lightboxIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span>
      </motion.div>}</AnimatePresence>
    </div>
  )
}

function formatDate(value: string) {
  if (!value) return 'A little while ago'
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date).toUpperCase()
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}
