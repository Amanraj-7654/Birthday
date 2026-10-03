import { useEffect, useState } from 'react'
import { CakeSlice, Sparkles } from 'lucide-react'

type BirthdayIntroProps = { name: string; animations: boolean }

const petalTypes = ['heart', 'rose', 'petal', 'star']

export function BirthdayIntro({ name, animations }: BirthdayIntroProps) {
  // Start the brief confetti burst during the splash's final half-second.
  const [celebrating, setCelebrating] = useState(false)

  // Schedule the burst once when the intro first appears.
  useEffect(() => {
    const burstTimer = window.setTimeout(() => setCelebrating(true), 1500)
    return () => window.clearTimeout(burstTimer)
  }, [])

  return (
    <div className={`birthday-intro ${animations ? '' : 'intro-reduced'}`} aria-label={`Happy birthday, ${name}`}>
      {/* Birthday intro overlay */}
      <div className="intro-glow intro-glow-left" />
      <div className="intro-glow intro-glow-right" />
      <div className="intro-stars" aria-hidden="true">✦ <span>✧</span> ✦ <span>·</span> ✧</div>
      <div className="intro-balloons" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="intro-petals" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <i key={index}
         className={`falling-petal petal-${petalTypes[index % petalTypes.length]}`}
          style={{ '--index': index, '--left': `${(index * 41 + 7) % 100}%`, '--fall-duration': `${1.55 + (index % 5) * 0.11}s`, '--fall-delay': `${(index % 9) * 0.09}s`, '--drift': index % 2 ? '25px' : '-25px' } as React.CSSProperties}>
            {petalTypes[index % petalTypes.length] === 'heart' ? '♥' : petalTypes[index % petalTypes.length] === 'rose' ? '✿' : petalTypes[index % petalTypes.length] === 'star' ? '✦' : ''}</i>)}
      </div>
      <div className="intro-content">
        <span className="intro-eyebrow"><Sparkles size={12} /> TODAY IS ALL ABOUT YOU <Sparkles size={12} /></span>
        <h1>HAPPY BIRTHDAY,<br /><em>{name.toUpperCase()}</em> <span className="intro-cake-emoji">🎂🎉</span></h1>
        <div className="intro-cake"><CakeSlice size={38} strokeWidth={1.2} /><span className="intro-candle">✦</span></div>
        <span className="intro-subtitle">a little more love, just for you</span>
      </div>
      {celebrating && <div className="intro-burst" aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ '--index': index, '--burst-x': `${Math.cos(index * 47 * Math.PI / 180) * 190}px`, '--burst-y': `${Math.sin(index * 47 * Math.PI / 180) * 150}px` } as React.CSSProperties} />)}</div>}
      <div className="intro-bottom-line">MADE OF MEMORIES <span>·</span> MADE WITH LOVE</div>
  </div>
  )
}
