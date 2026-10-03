import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { AdminPage } from './components/AdminPage'
import { BirthdayIntro } from './components/BirthdayIntro'
import { VisitorGate } from './components/VisitorGate'
import { PublicSite } from './components/PublicSite'
import { useBirthdayData } from './hooks/useBirthdayData'
import './styles.css'
import './memory.css'
import './intro.css'
import './intro-overrides.css'
import './responsive-overrides.css'

const BIRTHDAY_INTRO_DURATION_MS = 10000

function App() {
  // Track browser history so direct navigation and back/forward update the view.
  const [route, setRoute] = useState(window.location.pathname)
  // Shared content keeps the public site and admin dashboard in sync.
  const [data, setData] = useBirthdayData(route.startsWith('/admin'))
  const [galleryUnlocked, setGalleryUnlocked] = useState(false)
  // The admin route skips the public-only opening splash.
  const [introVisible, setIntroVisible] = useState(!window.location.pathname.startsWith('/admin'))

  // Keep the rendered route aligned with browser back/forward navigation.
  useEffect(() => {
    const onPopState = () => {
      setGalleryUnlocked(false)
      setRoute(window.location.pathname)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Keep this just beyond the 2s CSS outro in intro.css; adjust here to control its display time.
  useEffect(() => {
    if (!introVisible || !galleryUnlocked) return
    const introTimer = window.setTimeout(() => setIntroVisible(false), BIRTHDAY_INTRO_DURATION_MS)
    return () => window.clearTimeout(introTimer)
  }, [introVisible, galleryUnlocked])

  function navigate(path: string) {
    if (path.startsWith('/admin')) setGalleryUnlocked(false)
    window.history.pushState({}, '', path)
    setRoute(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`app-frame theme-${data.settings.theme} background-${data.settings.backgroundStyle} ${data.settings.animations ? '' : 'animations-disabled'}`}>
      <MotionConfig reducedMotion={data.settings.animations ? 'user' : 'always'}>
        {route.startsWith('/admin')
          ? <AdminPage data={data} setData={setData} onBack={() => navigate('/')} />
          : galleryUnlocked
            ? <PublicSite data={data} onAdmin={() => navigate('/admin')} />
            : <VisitorGate name={data.settings.name} onAccessGranted={() => setGalleryUnlocked(true)} />}
      </MotionConfig>
      {introVisible && galleryUnlocked && !route.startsWith('/admin') && !data.settings.countdownEnabled && <BirthdayIntro name={data.settings.name} animations={data.settings.animations} />}
    </div>
  )
}

export default App
