import type { BirthdayData } from '../types'

const images = [
  'photo-1530103862676-de8c9debad1d', 'photo-1513151233558-d860c5398176', 'photo-1464366400600-7168b8af9bc3',
  'photo-1531058020387-3be344556be6', 'photo-1511795409834-ef04bbd61622', 'photo-1527529482837-4698179dc6ce',
  'photo-1469334031218-e382a71b716b', 'photo-1511988617509-a57c8a288659', 'photo-1529636798458-92182e662485',
  'photo-1519741497674-611481863552', 'photo-1523438885200-e635ba2c371e', 'photo-1519671482749-fd09be7ccebf',
  'photo-1492684223066-81342ee5ff30', 'photo-1511578314322-379afb476865', 'photo-1507504031003-b417219a0fde',
  'photo-1502635385003-ee1e6a1a742d', 'photo-1520857014576-2c4f4c972b57', 'photo-1511795409834-ef04bbd61622',
]
const captions = [
  ['The kind of night you wish would last forever', 'Birthday', '2026-09-27'],
  ['A little sparkle, a lot of love', 'Birthday', '2026-09-27'],
  ['Made a wish, kept the people', 'Family', '2025-08-14'],
  ['All dressed up and nowhere to be but here', 'Friends', '2025-06-21'],
  ['The happiest little corner of the room', 'Birthday', '2024-09-27'],
  ['Somewhere between the candles and the laughter', 'Special Moments', '2024-09-27'],
  ['Golden hour with my favorite people', 'Adventures', '2024-07-13'],
  ['Proof that we were having a good time', 'Friends', '2023-11-04'],
  ['The softest Sunday, the loudest laughs', 'Family', '2023-05-22'],
  ['A day wrapped in flowers and happy tears', 'Special Moments', '2022-10-08'],
  ['Save me the last slice', 'Birthday', '2022-09-27'],
  ['Every great story has a group photo', 'Friends', '2022-04-19'],
  ['Confetti in our hair, joy everywhere', 'Adventures', '2021-12-31'],
  ['The beginning of something lovely', 'Childhood', '2021-09-27'],
  ['Just one more photo, promise', 'Friends', '2021-07-02'],
  ['Small moments, big feelings', 'Childhood', '2020-06-12'],
  ['A table full of stories', 'Family', '2019-12-25'],
  ['And then there was cake', 'Birthday', '2018-09-27'],
]

export const seedData: BirthdayData = {
  photos: images.map((image, index) => ({
    id: `photo-${index + 1}`,
    url: `https://images.unsplash.com/${image}?auto=format&fit=crop&w=1000&q=85`,
    title: `Memory ${String(index + 1).padStart(2, '0')}`,
    caption: captions[index][0],
    date: captions[index][2],
    albumId: ['album-birthday', 'album-friends', 'album-birthday', 'album-friends', 'album-family', 'album-special'][index % 6],
    featured: index < 5,
    order: index,
  })),
  albums: [
    { id: 'album-birthday', name: 'Birthday', description: 'Candles, cake & the best kind of chaos.', coverPhoto: 'photo-1', order: 0 },
    { id: 'album-childhood', name: 'Childhood', description: 'The little years that made us.', coverPhoto: 'photo-14', order: 1 },
    { id: 'album-family', name: 'Family', description: 'Home is a whole lot of people.', coverPhoto: 'photo-9', order: 2 },
    { id: 'album-friends', name: 'Friends', description: 'Our chosen kind of family.', coverPhoto: 'photo-4', order: 3 },
    { id: 'album-adventures', name: 'Adventures', description: 'A collection of beautiful detours.', coverPhoto: 'photo-7', order: 4 },
    { id: 'album-special', name: 'Special Moments', description: 'The days we keep coming back to.', coverPhoto: 'photo-6', order: 5 },
  ],
  memories: [
    { id: 'memory-1', title: 'A wish at midnight', description: 'The room went quiet, the candles flickered, and everyone we love was right there.', date: '2026-09-27', image: `https://images.unsplash.com/${images[0]}?auto=format&fit=crop&w=1000&q=85`, category: 'Birthday', location: 'Home', featured: true, order: 0 },
    { id: 'memory-2', title: 'The long way home', description: 'A little road trip that turned into our favorite story of the summer.', date: '2024-07-13', image: `https://images.unsplash.com/${images[6]}?auto=format&fit=crop&w=1000&q=85`, category: 'Adventure', location: 'Big Sur, California', featured: true, order: 1 },
    { id: 'memory-3', title: 'The whole gang', description: 'No occasion needed. Just good food, familiar faces, and a table that got louder by the hour.', date: '2023-11-04', image: `https://images.unsplash.com/${images[7]}?auto=format&fit=crop&w=1000&q=85`, category: 'Friends', location: 'Brooklyn, New York', featured: false, order: 2 },
  ],
  timeline: [
    { id: 'event-1', year: '2021', title: 'A beautiful beginning', description: 'New faces, a fresh chapter, and a little more room for joy.', image: `https://images.unsplash.com/${images[13]}?auto=format&fit=crop&w=900&q=85`, order: 0 },
    { id: 'event-2', year: '2022', title: 'More adventures', description: 'We said yes to the detours, the late nights, and every little celebration.', image: `https://images.unsplash.com/${images[9]}?auto=format&fit=crop&w=900&q=85`, order: 1 },
    { id: 'event-3', year: '2023', title: 'Unforgettable moments', description: 'A year measured in belly laughs and people who feel like home.', image: `https://images.unsplash.com/${images[7]}?auto=format&fit=crop&w=900&q=85`, order: 2 },
    { id: 'event-4', year: '2024', title: 'Another amazing year', description: 'Big skies, little rituals, and a thousand reasons to be grateful.', image: `https://images.unsplash.com/${images[6]}?auto=format&fit=crop&w=900&q=85`, order: 3 },
    { id: 'event-5', year: '2025', title: 'New memories', description: 'The story kept getting better, one ordinary-perfect day at a time.', image: `https://images.unsplash.com/${images[4]}?auto=format&fit=crop&w=900&q=85`, order: 4 },
    { id: 'event-6', year: '2026', title: 'The celebration continues', description: 'Here is to everything still waiting around the corner.', image: `https://images.unsplash.com/${images[2]}?auto=format&fit=crop&w=900&q=85`, order: 5 },
  ],
  messages: [
    { id: 'message-1', author: 'Mom & Dad', message: 'May your life always be filled with happiness, love and beautiful memories. We love you more than all the candles on this cake.', date: '2026-09-27', featured: true, order: 0 },
    { id: 'message-2', author: 'Jamie', message: "Here's to another year of adventures, laughter and unforgettable moments! The best days are always the ones with you.", date: '2026-09-27', featured: true, order: 1 },
    { id: 'message-3', author: 'Taylor', message: 'You make every room a little brighter just by being in it. Keep being exactly, wonderfully you.', date: '2026-09-27', featured: true, order: 2 },
    { id: 'message-4', author: 'The Cousins', message: 'Same time next year? Same cake, bigger candles, and at least one more embarrassing story.', date: '2026-09-27', featured: false, order: 3 },
    { id: 'message-5', author: 'Morgan', message: 'To the person who turns random Tuesdays into stories we tell for years. Happy birthday!', date: '2026-09-27', featured: false, order: 4 },
    { id: 'message-6', author: 'Riley', message: 'A whole new year of you. We are all so lucky.', date: '2026-09-27', featured: false, order: 5 },
    { id: 'message-7', author: 'Avery', message: 'May the next chapter bring big skies, soft landings, and all the good things you deserve.', date: '2026-09-27', featured: false, order: 6 },
    { id: 'message-8', author: 'Your favorite people', message: 'We will always show up for cake. And for you. Mostly for you.', date: '2026-09-27', featured: false, order: 7 },
  ],
  songs: [
    { id: 'song-1', title: 'A song for your new year', artist: 'Birthday soundtrack', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', visible: true, order: 0 },
  ],
  settings: {
    name: 'Alex', birthday: 'September 27', countdownEnabled: false, countdownTarget: '', heroTitle: 'Happy Birthday, Alex!',
    heroSubtitle: 'A collection of beautiful memories, moments & smiles.', theme: 'rose', backgroundStyle: 'starlight',
    musicUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', animations: true, confetti: true,
    socialInstagram: '', socialWebsite: '', footerText: 'Made with all the love in the world.',
  },
}
