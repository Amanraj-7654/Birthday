export type Photo = {
  id: string
  url: string
  title: string
  caption: string
  date: string
  albumId: string
  featured: boolean
  order: number
  visible?: boolean
}

export type Album = {
  id: string
  name: string
  description: string
  coverPhoto: string
  order: number
  visible?: boolean
}

export type Memory = {
  id: string
  title: string
  description: string
  date: string
  image: string
  category: string
  location: string
  featured: boolean
  order: number
  visible?: boolean
}

export type TimelineEvent = {
  id: string
  year: string
  title: string
  description: string
  image: string
  order: number
  visible?: boolean
}

export type Message = {
  id: string
  author: string
  message: string
  date: string
  featured: boolean
  order: number
  visible?: boolean
}

export type Song = {
  id: string
  title: string
  artist: string
  url: string
  order: number
  visible?: boolean
}

export type Settings = {
  name: string
  birthday: string
  countdownEnabled: boolean
  countdownTarget: string
  heroTitle: string
  heroSubtitle: string
  theme: string
  backgroundStyle: string
  musicUrl: string
  animations: boolean
  confetti: boolean
  socialInstagram: string
  socialWebsite: string
  footerText: string
}

export type BirthdayData = {
  photos: Photo[]
  albums: Album[]
  memories: Memory[]
  timeline: TimelineEvent[]
  messages: Message[]
  songs: Song[]
  settings: Settings
}
