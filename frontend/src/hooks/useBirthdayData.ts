import { useEffect, useState } from 'react'
import { seedData } from '../data/seed'
import type { BirthdayData } from '../types'

export function useBirthdayData(isAdminRoute = false) {
  const [data, setData] = useState<BirthdayData>(seedData)

  // Public clients periodically reload published content so admin changes appear without a refresh.
  useEffect(() => {
    if (isAdminRoute) return
    let active = true
    const loadPublishedContent = async () => {
      try {
        const response = await fetch('/api/content')
        if (!response.ok) return
        const result = await response.json() as { initialized: boolean; data: BirthdayData | null }
        if (active && result.initialized && result.data) setData(result.data)
      } catch {
        // Keep the starter content visible while the API is unavailable.
      }
    }
    void loadPublishedContent()
    const interval = window.setInterval(() => void loadPublishedContent(), 5000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [isAdminRoute])

  return [data, setData] as const
}
