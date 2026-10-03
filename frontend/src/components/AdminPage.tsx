import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Album as AlbumIcon, ArrowDown, ArrowLeft, ArrowUp, AudioLines, BarChart3, CalendarDays, Check, ChevronDown, ChevronRight, CirclePlus, Clock3, Heart, ImagePlus, Images, LayoutDashboard, LockKeyhole, LogIn, MessageCircle, MoreHorizontal, Pencil, Search, Settings2, Sparkles, Star, Trash2, Upload, X } from 'lucide-react'
import { seedData } from '../data/seed'
import type { Album, BirthdayData, Memory, Message, Photo, Settings, Song, TimelineEvent } from '../types'
import './AdminLogin.css'

type AdminPageProps = { data: BirthdayData; setData: React.Dispatch<React.SetStateAction<BirthdayData>>; onBack: () => void }
type Section = 'dashboard' | 'photos' | 'albums' | 'memories' | 'messages' | 'timeline' | 'songs' | 'settings'
type CollectionSection = Exclude<Section, 'dashboard' | 'settings'>
type ItemRecord = Photo | Album | Memory | Message | TimelineEvent | Song
type Field = { name: string; label: string; type?: 'text' | 'url' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'checkbox'; options?: { value: string; label: string }[]; required?: boolean }

const navigation: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'photos', label: 'Photos', icon: Images },
  { id: 'albums', label: 'Albums', icon: AlbumIcon },
  { id: 'memories', label: 'Memories', icon: Heart },
  { id: 'messages', label: 'Birthday messages', icon: MessageCircle },
  { id: 'timeline', label: 'Timeline', icon: Clock3 },
  { id: 'songs', label: 'Songs', icon: AudioLines },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]

const labels: Record<CollectionSection, { singular: string; plural: string; description: string }> = {
  photos: { singular: 'photo', plural: 'Photos', description: 'Every little moment worth keeping.' },
  albums: { singular: 'album', plural: 'Albums', description: 'Give all those lovely moments a home.' },
  memories: { singular: 'memory', plural: 'Memories', description: 'The stories behind the photographs.' },
  messages: { singular: 'message', plural: 'Birthday messages', description: 'A few words from the people who matter.' },
  timeline: { singular: 'event', plural: 'Timeline', description: 'The chapters that made this year yours.' },
  songs: { singular: 'song', plural: 'Songs', description: 'Choose the soundtrack visitors can play.' },
}

function collection(data: BirthdayData, section: CollectionSection): ItemRecord[] {
  switch (section) {
    case 'photos': return data.photos
    case 'albums': return data.albums
    case 'memories': return data.memories
    case 'messages': return data.messages
    case 'timeline': return data.timeline
    case 'songs': return data.songs
  }
}

function getFields(section: CollectionSection, data: BirthdayData): Field[] {
  const imageChoices = data.photos.map(photo => ({ value: photo.url, label: photo.title || photo.caption }))
  switch (section) {
    case 'photos': return [
      { name: 'url', label: 'Image URL or uploaded file', type: 'text', required: false }, { name: 'title', label: 'Internal title', required: false },
      { name: 'caption', label: 'Caption', type: 'textarea' }, { name: 'date', label: 'Date', type: 'date' },
      { name: 'albumId', label: 'Album', type: 'select', options: [{ value: '', label: 'Unsorted' }, ...data.albums.map(album => ({ value: album.id, label: album.name }))] },
      { name: 'featured', label: 'Feature this photo', type: 'checkbox' }, { name: 'visible', label: 'Show on birthday page', type: 'checkbox' },
    ]
    case 'albums': return [
      { name: 'name', label: 'Album name', required: true }, { name: 'description', label: 'Short description', type: 'textarea' },
      { name: 'coverPhoto', label: 'Cover photo', type: 'select', options: [{ value: '', label: 'No cover selected' }, ...data.photos.map(photo => ({ value: photo.id, label: photo.title }))] },
      { name: 'visible', label: 'Show on birthday page', type: 'checkbox' },
    ]
    case 'memories': return [
      { name: 'title', label: 'Memory title', required: true }, { name: 'description', label: 'The story', type: 'textarea' },
      { name: 'date', label: 'Date', type: 'date' }, { name: 'image', label: 'Photo', type: 'select', options: imageChoices },
      { name: 'category', label: 'Category' }, { name: 'location', label: 'Location' }, { name: 'featured', label: 'Feature this memory', type: 'checkbox' },
      { name: 'visible', label: 'Show on birthday page', type: 'checkbox' },
    ]
    case 'messages': return [
      { name: 'author', label: 'From', required: true }, { name: 'message', label: 'Birthday message', type: 'textarea', required: true },
      { name: 'date', label: 'Date', type: 'date' }, { name: 'featured', label: 'Feature this message', type: 'checkbox' },
      { name: 'visible', label: 'Show on birthday page', type: 'checkbox' },
    ]
    case 'timeline': return [
      { name: 'year', label: 'Year or date', required: true }, { name: 'title', label: 'Chapter title', required: true },
      { name: 'description', label: 'Description', type: 'textarea' }, { name: 'image', label: 'Photo', type: 'select', options: imageChoices },
      { name: 'visible', label: 'Show on birthday page', type: 'checkbox' },
    ]
    case 'songs': return [
      { name: 'title', label: 'Song title', required: true }, { name: 'artist', label: 'Artist' },
      { name: 'url', label: 'Audio URL or uploaded file', type: 'text', required: true }, { name: 'visible', label: 'Show on birthday page', type: 'checkbox' },
    ]
  }
}

function recordTitle(section: CollectionSection, item: ItemRecord) {
  if (section === 'photos') return (item as Photo).title || (item as Photo).caption || 'Untitled photo'
  if (section === 'albums') return (item as Album).name
  if (section === 'messages') return (item as Message).author
  if (section === 'timeline') return `${(item as TimelineEvent).year} · ${(item as TimelineEvent).title}`
  if (section === 'songs') return (item as Song).title
  return (item as Memory).title
}

export function AdminPage({ data, setData, onBack }: AdminPageProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  // Select the active dashboard or content-management section.
  const [active, setActive] = useState<Section>('dashboard')
  // Control the off-canvas sidebar on narrow screens.
  const [mobileNav, setMobileNav] = useState(false)
  // Hold the current photo search query.
  const [search, setSearch] = useState('')
  // Restrict the photo grid to one album when selected.
  const [filterAlbum, setFilterAlbum] = useState('all')
  // Toggle the featured-only photo filter.
  const [filterFeatured, setFilterFeatured] = useState(false)
  // Identify which content editor is open, if any.
  const [editor, setEditor] = useState<{ section: CollectionSection; id?: string } | null>(null)
  // Store editable form fields while a content dialog is open.
  const [draft, setDraft] = useState<Record<string, string | boolean>>({})
  // Keep unsaved settings changes separate until the owner saves them.
  const [settingsDraft, setSettingsDraft] = useState<Settings>(data.settings)
  const [emailRecipients, setEmailRecipients] = useState('')
  const [emailSaveStatus, setEmailSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  // Display short success or validation feedback after admin actions.
  const [toast, setToast] = useState('')
  // Trigger native file selection without rendering a visible file input.
  const fileInput = useRef<HTMLInputElement>(null)
  const bulkPhotoInput = useRef<HTMLInputElement>(null)
  const audioFileInput = useRef<HTMLInputElement>(null)
  // Focus the photo search field from the command-key shortcut.
  const searchInput = useRef<HTMLInputElement>(null)
  // Remember which photo should receive an uploaded replacement image.
  const replacementId = useRef<string | null>(null)

  // Remove transient feedback after it has been visible briefly.
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Register the photo-search shortcut once for this admin view.
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInput.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const timer = window.setTimeout(async () => {
      setSaveStatus('saving')
      try {
        const response = await fetch('/api/admin/content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Save failed')
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [data, isAuthenticated])

  const currentItems = active !== 'dashboard' && active !== 'settings' ? collection(data, active) : []
  // Build the visible photo list from the current search and filters.
  const visiblePhotos = useMemo(() => {
    if (active !== 'photos') return []
    return data.photos.filter(photo => {
      const query = search.toLowerCase()
      const matchesSearch = !query || `${photo.title} ${photo.caption} ${photo.date}`.toLowerCase().includes(query)
      return matchesSearch && (filterAlbum === 'all' || photo.albumId === filterAlbum) && (!filterFeatured || photo.featured)
    }).sort((a, b) => a.order - b.order)
  }, [active, data.photos, search, filterAlbum, filterFeatured])

  function showToast(message: string) { setToast(message) }

  function updateCollection(section: CollectionSection, updater: (items: ItemRecord[]) => ItemRecord[]) {
    setData(previous => {
      const updated = updater(collection(previous, section))
      switch (section) {
        case 'photos': return { ...previous, photos: updated as Photo[] }
        case 'albums': return { ...previous, albums: updated as Album[] }
        case 'memories': return { ...previous, memories: updated as Memory[] }
        case 'messages': return { ...previous, messages: updated as Message[] }
        case 'timeline': return { ...previous, timeline: updated as TimelineEvent[] }
        case 'songs': return { ...previous, songs: updated as Song[] }
      }
    })
  }

  function openEditor(section: CollectionSection, id?: string) {
    const found = id ? collection(data, section).find(item => item.id === id) : undefined
    const values = found ? { ...found } as unknown as Record<string, string | boolean> : {}
    if (!found) {
      for (const field of getFields(section, data)) values[field.name] = field.type === 'checkbox' ? field.name === 'visible' : ''
      if (section === 'photos') values.date = new Date().toISOString().slice(0, 10)
      if (section === 'messages') values.date = new Date().toISOString().slice(0, 10)
      if (section === 'albums' && data.photos.length) values.coverPhoto = data.photos[0].id
      if ((section === 'memories' || section === 'timeline') && data.photos.length) values.image = data.photos[0].url
    } else {
      values.visible = found.visible !== false
    }
    setDraft(values)
    setEditor({ section, id })
  }

  function saveItem(event: FormEvent) {
    event.preventDefault()
    if (!editor) return
    const required = getFields(editor.section, data).filter(field => field.required)
    if (required.some(field => !String(draft[field.name] ?? '').trim())) {
      showToast('Please fill in the required fields.')
      return
    }
    const old = editor.id ? collection(data, editor.section).find(item => item.id === editor.id) : undefined
    const record = { ...draft, id: editor.id ?? `${editor.section}-${Date.now()}`, order: old?.order ?? collection(data, editor.section).length } as unknown as ItemRecord
    updateCollection(editor.section, items => editor.id ? items.map(item => item.id === editor.id ? record : item) : [...items, record])
    setEditor(null)
    showToast(`${labels[editor.section].singular[0].toUpperCase()}${labels[editor.section].singular.slice(1)} saved.`)
  }

  function deleteItem(section: CollectionSection, id: string) {
    const item = collection(data, section).find(record => record.id === id)
    if (!item || !window.confirm(`Delete “${recordTitle(section, item)}”? This cannot be undone.`)) return
    updateCollection(section, items => items.filter(record => record.id !== id))
    if (section === 'albums') {
      const fallback = data.albums.find(album => album.id !== id)?.id ?? ''
      setData(previous => ({ ...previous, photos: previous.photos.map(photo => photo.albumId === id ? { ...photo, albumId: fallback } : photo) }))
    }
    showToast(`${labels[section].singular[0].toUpperCase()}${labels[section].singular.slice(1)} deleted.`)
  }

  function toggleFeatured(photo: Photo) {
    updateCollection('photos', items => items.map(item => item.id === photo.id ? { ...photo, featured: !photo.featured } : item))
    showToast(photo.featured ? 'Removed from featured.' : 'Added to featured.')
  }

  function moveItem(section: CollectionSection, id: string, direction: -1 | 1) {
    updateCollection(section, items => {
      const sorted = [...items].sort((a, b) => a.order - b.order)
      const index = sorted.findIndex(item => item.id === id)
      const next = index + direction
      if (index < 0 || next < 0 || next >= sorted.length) return items
      ;[sorted[index], sorted[next]] = [sorted[next], sorted[index]]
      return sorted.map((item, order) => ({ ...item, order }))
    })
  }

  async function readImage(file: File, replaceId: string | null) {
    if (!file.type.startsWith('image/')) { showToast('Choose an image file to upload.'); return }
    try {
      const formData = new FormData()
      formData.set('file', file)
      const response = await fetch('/api/admin/uploads', { method: 'POST', body: formData })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error || 'Photo upload failed.')
      if (replaceId) {
        updateCollection('photos', items => items.map(item => item.id === replaceId ? { ...item, url: result.url! } : item))
        showToast('Photo replaced.')
      } else {
        const id = `photo-${result.url.split('/').pop()}`
        const photo: Photo = { id, url: result.url, title: file.name.replace(/\.[^.]+$/, ''), caption: '', date: new Date().toISOString().slice(0, 10), albumId: '', featured: false, visible: true, order: data.photos.length }
        updateCollection('photos', items => [...items, photo])
        showToast('Photo uploaded. Add a caption whenever you like.')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'That image could not be uploaded.')
    }
  }

  async function handleAudioFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('audio/')) { showToast('Choose an audio file to upload.'); return }
    try {
      const formData = new FormData()
      formData.set('file', file)
      const response = await fetch('/api/admin/uploads', { method: 'POST', body: formData })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error || 'Audio upload failed.')
      setDraft(previous => ({ ...previous, url: result.url! }))
      showToast('Audio uploaded.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'That audio could not be uploaded.')
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void readImage(file, replacementId.current)
    replacementId.current = null
    event.target.value = ''
  }

  async function handleBulkPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    if (files.length > 50) { showToast('Choose no more than 50 photos at a time.'); return }
    if (files.some(file => !file.type.startsWith('image/'))) { showToast('Choose image files only.'); return }

    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    try {
      const response = await fetch('/api/admin/uploads/photos', { method: 'POST', body: formData })
      const result = await response.json() as { files?: { url: string }[]; error?: string }
      if (!response.ok || !result.files || result.files.length !== files.length) {
        throw new Error(result.error || 'Some photos could not be uploaded.')
      }
      const uploadedPhotos: Photo[] = result.files.map((uploaded, index) => ({
        id: `photo-${uploaded.url.split('/').pop()}`,
        url: uploaded.url,
        title: files[index].name.replace(/\.[^.]+$/, ''),
        caption: '',
        date: new Date().toISOString().slice(0, 10),
        albumId: '',
        featured: false,
        visible: true,
        order: 0,
      }))
      setData(previous => ({
        ...previous,
        photos: uploadedPhotos.map((photo, index) => ({ ...photo, order: previous.photos.length + index })).concat(previous.photos),
      }))
      showToast(`${uploadedPhotos.length} photos uploaded.`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Photo upload failed.')
    }
  }

  function saveSettings(event: FormEvent) {
    event.preventDefault()
    if (!settingsDraft.name.trim() || !settingsDraft.heroTitle.trim()) { showToast('Name and hero heading are required.'); return }
    setData(previous => ({ ...previous, settings: settingsDraft }))
    showToast('Birthday settings updated.')
  }

  async function saveEmailRecipients() {
    setEmailSaveStatus('saving')
    try {
      const recipients = emailRecipients.split(/[\n,;]/).map(address => address.trim()).filter(Boolean)
      const response = await fetch('/api/admin/email-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients }),
      })
      const result = await response.json() as { error?: string; recipients?: string[] }
      if (!response.ok) throw new Error(result.error || 'Could not save email recipients.')
      setEmailRecipients((result.recipients ?? []).join('\n'))
      setEmailSaveStatus('saved')
      showToast('Email recipients saved.')
    } catch (error) {
      setEmailSaveStatus('error')
      showToast(error instanceof Error ? error.message : 'Could not save email recipients.')
    }
  }

  function selectSection(section: Section) { setActive(section); setMobileNav(false); setSearch('') }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoginError('')
    try {
      const loginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const loginResult = await loginResponse.json().catch(() => ({})) as { error?: string }
      if (!loginResponse.ok) throw new Error(loginResult.error || 'Unable to sign in.')

      const contentResponse = await fetch('/api/admin/content')
      if (!contentResponse.ok) throw new Error('Unable to load admin content.')
      const result = await contentResponse.json() as { initialized: boolean; data: BirthdayData | null }
      const notificationsResponse = await fetch('/api/admin/email-notifications')
      if (!notificationsResponse.ok) throw new Error('Unable to load email notification settings.')
      const notifications = await notificationsResponse.json() as { recipients: string[] }
      setEmailRecipients((notifications.recipients ?? []).join('\n'))
      if (result.initialized && result.data) {
        const loadedData = { ...seedData, ...result.data, songs: result.data.songs ?? [] }
        setData(loadedData)
        setSettingsDraft(loadedData.settings)
      } else {
        setData(seedData)
        setSettingsDraft(seedData.settings)
        const initializeResponse = await fetch('/api/admin/content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(seedData),
        })
        if (!initializeResponse.ok) throw new Error('Unable to initialize the birthday database.')
      }
      setIsAuthenticated(true)
      setPassword('')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to sign in.')
    }
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' }).catch(() => undefined)
    setIsAuthenticated(false)
    onBack()
  }

  if (!isAuthenticated) {
    return (
      <main className="admin-login-screen">
        {/* Admin sign-in screen */}
        <motion.section className="admin-login-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <button className="admin-brand admin-login-brand" onClick={onBack}>
            <span className="admin-brand-mark"><Sparkles size={17} /></span>
            <span>little more <i>love</i><small>CELEBRATION STUDIO</small></span>
          </button>
          <span className="admin-login-icon"><LockKeyhole size={19} /></span>
          <span className="admin-overline">PRIVATE WORKSPACE</span>
          <h1>Welcome <em>back.</em></h1>
          <p>Sign in to manage the celebration.</p>
          <form className="admin-login-form" onSubmit={handleLogin}>
            <label className="editor-field"><span>Username</span><input autoFocus autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} /></label>
            <label className="editor-field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
            {loginError && <p className="admin-login-error" role="alert">{loginError}</p>}
            <button className="admin-primary" type="submit"><LogIn size={15} /> Sign in</button>
          </form>
          <button className="admin-login-back" onClick={onBack}><ArrowLeft size={14} /> Back to celebration</button>
        </motion.section>
      </main>
    )
  }

  return (
    <div className="admin-shell">
      {/* Admin studio screen */}
      <aside className={`admin-sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <button className="admin-brand" onClick={handleLogout}><span className="admin-brand-mark"><Sparkles size={17} /></span><span>little more <i>love</i><small>CELEBRATION STUDIO</small></span></button>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="admin-navigation" aria-label="Admin navigation">
          {navigation.map(item => <button key={item.id} className={active === item.id ? 'selected' : ''} onClick={() => selectSection(item.id)}><item.icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'photos' && <small>{data.photos.length}</small>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="admin-sidebar-note"><span className="tiny-heart"><Heart size={13} fill="currentColor" /></span><span>Curated with love<br /><strong>{data.settings.name}'s birthday</strong></span></div><button className="back-public" onClick={handleLogout}><ArrowLeft size={15} /> Back to celebration</button></div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><button className="admin-mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle admin menu"><MoreHorizontal size={22} /></button><div className="admin-breadcrumb"><span>Studio</span><ChevronRight size={14} /><strong>{active === 'messages' ? 'Birthday messages' : active[0].toUpperCase() + active.slice(1)}</strong></div><div className="admin-topbar-right"><span className={`saved-indicator ${saveStatus === 'error' ? 'save-error' : ''}`}><i />{saveStatus === 'saving' ? 'Saving changes…' : saveStatus === 'error' ? 'Save failed' : 'All changes saved'}</span><button className="admin-view-site" onClick={handleLogout}>View birthday page <ArrowUpRightIcon /></button><div className="admin-avatar">{data.settings.name.charAt(0)}</div></div></header>
        <div className="admin-content">
          <AnimatePresence mode="wait">
            {active === 'dashboard' && <motion.section key="dashboard" className="admin-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
              <div className="admin-page-heading"><div><span className="admin-overline">SUNDAY, SEPTEMBER 27, 2026</span><h1>Good things, <em>growing.</em></h1><p>Your little corner of the internet is looking lovely.</p></div><button className="admin-primary" onClick={() => { setActive('photos'); openEditor('photos') }}><CirclePlus size={16} /> Add a photo</button></div>
              <div className="stat-grid">
                <StatCard icon={Images} label="Total photos" value={data.photos.length} note="Little moments, kept" tone="rose" onClick={() => setActive('photos')} />
                <StatCard icon={AlbumIcon} label="Total albums" value={data.albums.length} note="All in their place" tone="yellow" onClick={() => setActive('albums')} />
                <StatCard icon={Heart} label="Total memories" value={data.memories.length} note="Stories worth telling" tone="blue" onClick={() => setActive('memories')} />
                <StatCard icon={MessageCircle} label="Birthday wishes" value={data.messages.length} note="Love, in every form" tone="green" onClick={() => setActive('messages')} />
              </div>
              <div className="dashboard-grid"><section className="admin-panel recent-panel"><div className="panel-heading"><div><span className="admin-overline">JUST ADDED</span><h2>Recent photos</h2></div><button className="quiet-link" onClick={() => setActive('photos')}>See all <ChevronRight size={14} /></button></div><div className="recent-photos">{data.photos.slice().sort((a, b) => b.order - a.order).slice(0, 4).map(photo => <button key={photo.id} onClick={() => { setActive('photos'); openEditor('photos', photo.id) }}><img src={photo.url} alt="" /><span><strong>{photo.title || photo.caption || 'Untitled photo'}</strong><small>{photo.date || 'No date added'}</small></span></button>)}</div></section>
                <section className="admin-panel activity-panel"><div className="panel-heading"><div><span className="admin-overline">AT A GLANCE</span><h2>Your celebration</h2></div><BarChart3 size={18} /></div><div className="activity-rows"><div><span className="activity-icon"><Star size={15} /></span><span><strong>{data.photos.filter(photo => photo.featured).length} featured photos</strong><small>Making the first impression</small></span></div><div><span className="activity-icon activity-icon-coral"><CalendarDays size={15} /></span><span><strong>{data.timeline.length} timeline chapters</strong><small>A story still being written</small></span></div><div><span className="activity-icon activity-icon-mint"><MessageCircle size={15} /></span><span><strong>{data.messages.filter(message => message.featured).length} wishes on display</strong><small>Visible on the birthday page</small></span></div></div><button className="settings-shortcut" onClick={() => setActive('settings')}><Settings2 size={15} /> Personalize your page <ArrowUpRightIcon /></button></section></div>
              <div className="admin-tip"><Sparkles size={16} /><p><strong>A little tip:</strong> Featured photos and birthday messages are the ones visitors see first.</p><button onClick={() => setActive('photos')}>Curate yours <ArrowUpRightIcon /></button></div>
            </motion.section>}

            {active === 'photos' && <motion.section key="photos" className="admin-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
              <CollectionHeading section="photos" count={data.photos.length} onAdd={() => openEditor('photos')} onUpload={() => bulkPhotoInput.current?.click()} />
              <div className="photo-toolbar"><label className="admin-search"><Search size={16} /><input ref={searchInput} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search photos or captions" /><kbd>⌘ K</kbd></label><label className="select-wrap"><select value={filterAlbum} onChange={event => setFilterAlbum(event.target.value)}><option value="all">Every album</option>{data.albums.map(album => <option key={album.id} value={album.id}>{album.name}</option>)}</select><ChevronDown size={14} /></label><button className={`filter-toggle ${filterFeatured ? 'filter-on' : ''}`} onClick={() => setFilterFeatured(!filterFeatured)}><Star size={14} /> Featured</button></div>
              {visiblePhotos.length ? <div className="admin-photo-grid">{visiblePhotos.map(photo => <AdminPhotoCard key={photo.id} photo={photo} album={data.albums.find(album => album.id === photo.albumId)?.name ?? 'Unsorted'} index={data.photos.slice().sort((a, b) => a.order - b.order).findIndex(item => item.id === photo.id)} count={data.photos.length} onMove={direction => moveItem('photos', photo.id, direction)} onEdit={() => openEditor('photos', photo.id)} onReplace={() => { replacementId.current = photo.id; fileInput.current?.click() }} onDelete={() => deleteItem('photos', photo.id)} onFeature={() => toggleFeatured(photo)} />)}</div> : <EmptyState icon={ImagePlus} title="No photos found" copy={search || filterAlbum !== 'all' || filterFeatured ? 'Try a different search or filter.' : 'Start collecting the moments that make this story yours.'} actionLabel="Add a photo" onAction={() => openEditor('photos')} />}
            </motion.section>}

            {active === 'albums' && <motion.section key="albums" className="admin-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
              <CollectionHeading section="albums" count={data.albums.length} onAdd={() => openEditor('albums')} />
              {data.albums.length ? <div className="admin-album-grid">{data.albums.slice().sort((a, b) => a.order - b.order).map((album, index) => <article className="admin-album-card" key={album.id}><div className="album-cover"><img src={data.photos.find(photo => photo.id === album.coverPhoto)?.url ?? data.photos.find(photo => photo.albumId === album.id)?.url ?? 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=700&q=80'} alt="" /><span>{String(data.photos.filter(photo => photo.albumId === album.id).length).padStart(2, '0')} PHOTOS</span></div><div className="album-card-copy"><div className="album-card-title"><h3>{album.name}</h3><span>0{index + 1}</span></div><p>{album.description || 'A collection of favorite moments.'}</p><div className="album-card-actions"><button onClick={() => { setActive('photos'); setFilterAlbum(album.id) }}><Images size={14} /> View photos</button><div><button aria-label="Move album up" disabled={index === 0} onClick={() => moveItem('albums', album.id, -1)}><ArrowUp size={14} /></button><button aria-label="Move album down" disabled={index === data.albums.length - 1} onClick={() => moveItem('albums', album.id, 1)}><ArrowDown size={14} /></button><button aria-label={`Edit ${album.name}`} onClick={() => openEditor('albums', album.id)}><Pencil size={14} /></button><button aria-label={`Delete ${album.name}`} onClick={() => deleteItem('albums', album.id)}><Trash2 size={14} /></button></div></div></div></article>)}</div> : <EmptyState icon={AlbumIcon} title="No albums yet" copy="Give your favorite memories a place to belong." actionLabel="Create an album" onAction={() => openEditor('albums')} />}
              <p className="admin-helper"><Images size={14} /> Add photos to an album by editing a photo and choosing its album.</p>
            </motion.section>}

            {active === 'memories' && <motion.section key="memories" className="admin-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}><CollectionHeading section="memories" count={data.memories.length} onAdd={() => openEditor('memories')} />
              <RecordList section="memories" items={currentItems} photos={data.photos} onEdit={id => openEditor('memories', id)} onDelete={id => deleteItem('memories', id)} onMove={(id, direction) => moveItem('memories', id, direction)} />
            </motion.section>}

            {active === 'messages' && <motion.section key="messages" className="admin-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}><CollectionHeading section="messages" count={data.messages.length} onAdd={() => openEditor('messages')} />
              <RecordList section="messages" items={currentItems} photos={data.photos} onEdit={id => openEditor('messages', id)} onDelete={id => deleteItem('messages', id)} onMove={(id, direction) => moveItem('messages', id, direction)} />
            </motion.section>}

            {active === 'timeline' && <motion.section key="timeline" className="admin-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}><CollectionHeading section="timeline" count={data.timeline.length} onAdd={() => openEditor('timeline')} />
              <RecordList section="timeline" items={currentItems} photos={data.photos} onEdit={id => openEditor('timeline', id)} onDelete={id => deleteItem('timeline', id)} onMove={(id, direction) => moveItem('timeline', id, direction)} />
            </motion.section>}

            {active === 'songs' && <motion.section key="songs" className="admin-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}><CollectionHeading section="songs" count={data.songs.length} onAdd={() => openEditor('songs')} />
              <RecordList section="songs" items={currentItems} photos={data.photos} onEdit={id => openEditor('songs', id)} onDelete={id => deleteItem('songs', id)} onMove={(id, direction) => moveItem('songs', id, direction)} />
            </motion.section>}

            {active === 'settings' && <motion.section key="settings" className="admin-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}><div className="admin-page-heading"><div><span className="admin-overline">MAKE IT YOURS</span><h1>Page <em>settings.</em></h1><p>The little details that make this feel like your celebration.</p></div></div>
              <form className="settings-form" onSubmit={saveSettings}><div className="settings-form-heading"><Sparkles size={17} /><div><h2>Birthday details</h2><p>These appear throughout your celebration.</p></div></div><div className="settings-fields"><AdminField field={{ name: 'name', label: "Birthday person's name", required: true }} value={settingsDraft.name} onChange={value => setSettingsDraft(previous => ({ ...previous, name: String(value), heroTitle: previous.heroTitle.replace(previous.name, String(value)) }))}
                /><AdminField field={{ name: 'birthday', label: 'Birthday date' }} value={settingsDraft.birthday} onChange={value => setSettingsDraft(previous => ({ ...previous, birthday: String(value) }))}
                /><AdminField field={{ name: 'heroTitle', label: 'Hero heading', required: true }} value={settingsDraft.heroTitle} onChange={value => setSettingsDraft(previous => ({ ...previous, heroTitle: String(value) }))}
                /><AdminField field={{ name: 'heroSubtitle', label: 'Hero subtitle', type: 'textarea' }} value={settingsDraft.heroSubtitle} onChange={value => setSettingsDraft(previous => ({ ...previous, heroSubtitle: String(value) }))}
                />
              </div>
              <div className="settings-form-heading settings-heading-spaced"><Clock3 size={17} /><div><h2>Countdown</h2><p>Keep the celebration private until its moment arrives.</p></div></div>
              <div className="toggle-fields"><label><span><strong>Hide the birthday page until the countdown ends</strong><small>Visitors will only see the countdown before the date and time.</small></span><input type="checkbox" checked={Boolean(settingsDraft.countdownEnabled)} onChange={event => setSettingsDraft(previous => ({ ...previous, countdownEnabled: event.target.checked }))} /><i /></label></div>
              <div className="settings-fields"><AdminField field={{ name: 'countdownTarget', label: 'Reveal date and time', type: 'datetime-local' }} value={toLocalDateTimeInput(settingsDraft.countdownTarget ?? '')} onChange={value => setSettingsDraft(previous => ({ ...previous, countdownTarget: value ? new Date(String(value)).toISOString() : '' }))} /></div>
              <div className="settings-form-heading settings-heading-spaced"><MessageCircle size={17} /><div><h2>Birthday email</h2><p>Send a greeting when the countdown reaches its reveal time.</p></div></div>
              <div className="settings-fields"><label className="editor-field"><span>Recipient email addresses</span><textarea rows={4} value={emailRecipients} onChange={event => setEmailRecipients(event.target.value)} placeholder="friend@example.com, family@example.com" /></label></div>
              <div className="settings-save"><span>{emailSaveStatus === 'saving' ? 'Saving recipients…' : emailSaveStatus === 'error' ? 'Recipients could not be saved.' : 'Recipients are private and only used for this notification.'}</span><button className="admin-primary" type="button" onClick={() => void saveEmailRecipients()} disabled={emailSaveStatus === 'saving'}><Check size={16} /> Save recipients</button></div>
              <div className="settings-form-heading settings-heading-spaced"><Sparkles size={17} /><div><h2>Look & feel</h2><p>Set the mood for the memories.</p></div></div>
              <div className="settings-fields"><AdminField field={{ name: 'theme', label: 'Accent theme', type: 'select', options: [{ value: 'rose', label: 'Rose & gold' }, { value: 'blue', label: 'Sky & coral' }, { value: 'garden', label: 'Garden party' }] }} value={settingsDraft.theme} onChange={value => setSettingsDraft(previous => ({ ...previous, theme: String(value) }))}
                /><AdminField field={{ name: 'backgroundStyle', label: 'Background style', type: 'select', options: [{ value: 'starlight', label: 'Starlight' }, { value: 'confetti', label: 'Confetti' }, { value: 'soft', label: 'Soft color wash' }] }} value={settingsDraft.backgroundStyle} onChange={value => setSettingsDraft(previous => ({ ...previous, backgroundStyle: String(value) }))}
                /><AdminField field={{ name: 'footerText', label: 'Footer note' }} value={settingsDraft.footerText} onChange={value => setSettingsDraft(previous => ({ ...previous, footerText: String(value) }))}
                />
              </div>
              <div className="settings-form-heading settings-heading-spaced"><AudioLines size={17} /><div><h2>Little extras</h2><p>Keep or quiet the celebrations.</p></div></div>
              <div className="toggle-fields"><label><span><strong>Motion & entrance animations</strong><small>Animate the little details as the page opens.</small></span><input type="checkbox" checked={settingsDraft.animations} onChange={event => setSettingsDraft(previous => ({ ...previous, animations: event.target.checked }))} /><i /></label>
                <label><span><strong>Confetti & celebration</strong><small>Let the wish button send a little sparkle.</small></span><input type="checkbox" checked={settingsDraft.confetti} onChange={event => setSettingsDraft(previous => ({ ...previous, confetti: event.target.checked }))} /><i /></label></div>
              <div className="settings-form-heading settings-heading-spaced"><Heart size={17} /><div><h2>Find us elsewhere</h2><p>Optional links for the footer.</p></div></div>
              <div className="settings-fields"><AdminField field={{ name: 'socialInstagram', label: 'Instagram URL', type: 'url' }} value={settingsDraft.socialInstagram} onChange={value => setSettingsDraft(previous => ({ ...previous, socialInstagram: String(value) }))}
                /><AdminField field={{ name: 'socialWebsite', label: 'Website URL', type: 'url' }} value={settingsDraft.socialWebsite} onChange={value => setSettingsDraft(previous => ({ ...previous, socialWebsite: String(value) }))}
                />
              </div>
              <div className="settings-save"><span>Your public birthday page updates when you save.</span><button className="admin-primary" type="submit"><Check size={16} /> Save settings</button></div></form>
            </motion.section>}
          </AnimatePresence>
        </div>
      </main>
      <input className="visually-hidden" ref={fileInput} type="file" accept="image/*" onChange={handleFileChange} />
      <input className="visually-hidden" ref={bulkPhotoInput} type="file" accept="image/*" multiple onChange={handleBulkPhotoChange} />
      <input className="visually-hidden" ref={audioFileInput} type="file" accept="audio/*" onChange={handleAudioFileChange} />
      <AnimatePresence>{editor && <motion.div className="admin-modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) setEditor(null) }}><motion.form className="admin-modal" onSubmit={saveItem} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}><div className="modal-title-row"><div><span className="admin-overline">{editor.id ? 'MAKE A LITTLE CHANGE' : 'ADD SOMETHING LOVELY'}</span><h2>{editor.id ? 'Edit' : 'Add'} {labels[editor.section].singular}</h2></div><button type="button" aria-label="Close editor" className="modal-close" onClick={() => setEditor(null)}><X size={19} /></button></div>
        {editor.section === 'photos' && draft.url && <div className="editor-photo-preview"><img src={String(draft.url)} alt="Photo preview" /><span>PHOTO PREVIEW</span></div>}
        {editor.section === 'photos' && <div className="upload-inline"><button type="button" onClick={() => { replacementId.current = editor.id ?? null; fileInput.current?.click() }}><Upload size={15} /> Upload from device</button><span>or add an image URL below</span></div>}
        {editor.section === 'songs' && <div className="upload-inline"><button type="button" onClick={() => audioFileInput.current?.click()}><Upload size={15} /> Upload audio</button><span>or add an audio URL below</span></div>}
        <div className="editor-fields">{getFields(editor.section, data).map(field => <AdminField key={field.name} field={field} value={draft[field.name] ?? ''} onChange={value => setDraft(previous => ({ ...previous, [field.name]: value }))} />)}</div><div className="modal-footer"><span>Changes save to this browser automatically.</span><button className="admin-primary" type="submit"><Check size={15} /> Save {labels[editor.section].singular}</button></div></motion.form></motion.div>}</AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="admin-toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><span><Check size={14} /></span>{toast}</motion.div>}</AnimatePresence>
    </div>
  )
}

function ArrowUpRightIcon() { return <ChevronRight size={14} /> }

function CollectionHeading({ section, count, onAdd, onUpload }: { section: CollectionSection; count: number; onAdd: () => void; onUpload?: () => void }) {
  return <div className="admin-page-heading"><div><span className="admin-overline">YOUR CELEBRATION, YOUR WAY · {String(count).padStart(2, '0')} ITEMS</span><h1>{labels[section].plural}<em>.</em></h1><p>{labels[section].description}</p></div><div className="heading-actions">{onUpload && <button className="admin-secondary" onClick={onUpload}><Upload size={15} /> Upload up to 50 photos</button>}<button className="admin-primary" onClick={onAdd}><CirclePlus size={16} /> Add {labels[section].singular}</button></div></div>
}

function StatCard({ icon: Icon, label, value, note, tone, onClick }: { icon: typeof Images; label: string; value: number; note: string; tone: string; onClick: () => void }) {
  return <button className="stat-card" onClick={onClick}><span className={`stat-icon stat-${tone}`}><Icon size={17} /></span><span className="stat-label">{label}</span><strong>{String(value).padStart(2, '0')}</strong><small>{note}</small><ChevronRight className="stat-arrow" size={15} /></button>
}

function AdminPhotoCard({ photo, album, index, count, onMove, onEdit, onReplace, onDelete, onFeature }: { photo: Photo; album: string; index: number; count: number; onMove: (direction: -1 | 1) => void; onEdit: () => void; onReplace: () => void; onDelete: () => void; onFeature: () => void }) {
  return <article className="admin-photo-card"><div className="admin-photo-image"><img src={photo.url} alt={photo.caption || photo.title} loading="lazy" /><button className={`photo-feature-toggle ${photo.featured ? 'is-featured' : ''}`} onClick={onFeature} aria-label={photo.featured ? 'Remove featured status' : 'Feature photo'}><Star size={15} fill={photo.featured ? 'currentColor' : 'none'} /></button><button className="photo-preview" onClick={onEdit} aria-label={`Preview and edit ${photo.title}`}><Pencil size={15} /></button></div><div className="admin-photo-details"><div><strong>{photo.title || 'Untitled photo'}</strong><small>{photo.date || 'No date'} · {album}</small></div><p>{photo.caption || 'No caption yet'}</p><div className="admin-photo-actions"><button onClick={onEdit}><Pencil size={13} /> Edit</button><button onClick={onReplace}><Upload size={13} /> Replace</button><button aria-label="Move photo up" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={13} /></button><button aria-label="Move photo down" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={13} /></button><button aria-label="Delete photo" onClick={onDelete}><Trash2 size={14} /></button></div></div></article>
}

function toLocalDateTimeInput(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function AdminField({ field, value, onChange }: { field: Field; value: string | boolean; onChange: (value: string | boolean) => void }) {
  if (field.type === 'checkbox') return <label className="editor-checkbox"><input type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.target.checked)} /><span className="check-box"><Check size={12} /></span><span>{field.label}</span></label>
  if (field.type === 'textarea') return <label className="editor-field"><span>{field.label}{field.required && <i> *</i>}</span><textarea required={field.required} value={String(value)} onChange={event => onChange(event.target.value)} rows={3} placeholder="Write something lovely…" /></label>
  if (field.type === 'select') return <label className="editor-field"><span>{field.label}{field.required && <i> *</i>}</span><select required={field.required} value={String(value)} onChange={event => onChange(event.target.value)}>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={14} /></label>
  return <label className="editor-field"><span>{field.label}{field.required && <i> *</i>}</span><input type={field.type ?? 'text'} required={field.required} value={String(value)} onChange={event => onChange(event.target.value)} placeholder={field.type === 'url' ? 'https://…' : ''} /></label>
}

function RecordList({ section, items, photos, onEdit, onDelete, onMove }: { section: CollectionSection; items: ItemRecord[]; photos: Photo[]; onEdit: (id: string) => void; onDelete: (id: string) => void; onMove: (id: string, direction: -1 | 1) => void }) {
  if (!items.length) return <EmptyState icon={section === 'messages' ? MessageCircle : section === 'timeline' ? CalendarDays : Heart} title={`No ${labels[section].plural.toLowerCase()} yet`} copy="Add the first one to start filling in this story." actionLabel={`Add ${labels[section].singular}`} onAction={() => onEdit('')} />
  return <div className="record-list">{items.slice().sort((a, b) => a.order - b.order).map((item, index) => {
    const memory = item as Memory
    const message = item as Message
    const event = item as TimelineEvent
    const image = section === 'memories' ? memory.image : section === 'timeline' ? event.image : ''
    const title = recordTitle(section, item)
    const song = item as Song
    const subtitle = section === 'memories' ? `${memory.date || 'No date'} · ${memory.location || memory.category || 'No location'}` : section === 'messages' ? `${message.date || 'No date'}${message.visible === false ? ' · Pending review' : message.featured ? ' · Featured on page' : ''}` : section === 'songs' ? song.artist : event.year
    const description = section === 'messages' ? message.message : section === 'timeline' ? event.description : section === 'songs' ? song.url : memory.description
    return <article className="record-row" key={item.id}><div className="record-order"><span>{String(index + 1).padStart(2, '0')}</span><div><button aria-label="Move up" disabled={index === 0} onClick={() => onMove(item.id, -1)}><ArrowUp size={12} /></button><button aria-label="Move down" disabled={index === items.length - 1} onClick={() => onMove(item.id, 1)}><ArrowDown size={12} /></button></div></div>{image ? <img className="record-image" src={photos.find(photo => photo.url === image)?.url ?? image} alt="" /> : <span className={`record-initial record-${section}`}>{section === 'messages' ? message.author.charAt(0) : section === 'songs' ? <AudioLines size={16} /> : <Heart size={16} />}</span>}<div className="record-copy"><strong>{title}</strong><small>{subtitle}</small><p>{description}</p></div><div className="record-row-actions"><button aria-label={`Edit ${title}`} onClick={() => onEdit(item.id)}><Pencil size={15} /></button><button aria-label={`Delete ${title}`} onClick={() => onDelete(item.id)}><Trash2 size={15} /></button></div></article>
  })}</div>
}

function EmptyState({ icon: Icon, title, copy, actionLabel, onAction }: { icon: typeof Images; title: string; copy: string; actionLabel: string; onAction: () => void }) {
  return <div className="empty-admin"><span><Icon size={23} /></span><h2>{title}</h2><p>{copy}</p><button className="admin-primary" onClick={onAction}><CirclePlus size={15} /> {actionLabel}</button></div>
}
