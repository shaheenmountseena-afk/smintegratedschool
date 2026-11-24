/**
 * Admin-managed: home page hero slides and campus media.
 * TODO: replace these arrays with API calls once the admin panel is ready.
 */

export type MediaItem = {
  id: string
  type: 'video' | 'poster'
  title: string
  /** For videos: a YouTube embed URL. For posters: the full-size image URL. */
  url: string
  thumbnail: string
}

export type HeroSlide = {
  id: string
  image: string
  alt: string
  eyebrow: string
  title: string
  description: string
}

// TODO: replace dummy campus photos with real photography
export const heroSlides: HeroSlide[] = [
  {
    id: 'slide-1',
    image: '/images/campus.JPG',
    alt: 'Mount Seena campus building surrounded by palm trees (dummy photo)',
    eyebrow: 'Integrated NEET/JEE School',
    title: 'Empowering Aspiring Medical Professionals',
    description:
      'An integrated residential NEET/JEE school in Palakkad, built around focused learning and genuine care.',
  },
  {
    id: 'slide-2',
    image: '/images/classroom.jpeg',
    alt: 'Students in a smart digital classroom (dummy photo)',
    eyebrow: 'Smart classrooms',
    title: 'Learning that keeps pace with ambition',
    description: 'Digital classrooms and experienced faculty, every single day.',
  },
  {
    id: 'slide-3',
    image: '/images/lab.jpeg',
    alt: 'Students conducting an experiment in the science lab (dummy photo)',
    eyebrow: 'Hands-on science',
    title: 'Concepts you can see and touch',
    description: 'Well-equipped science and computer laboratories.',
  },
  {
    id: 'slide-4',
    image: '/images/night-study.png',
    alt: 'Students in a supervised evening study session (dummy photo)',
    eyebrow: 'Supervised night study',
    title: 'Support that continues after class',
    description: 'Faculty-guided study hours and dedicated hostel mentors.',
  },
  {
    id: 'slide-5',
    image: '/images/hostel.png',
    alt: 'Air-conditioned hostel room with study desks (dummy photo)',
    eyebrow: 'Residential life',
    title: 'A safe, disciplined second home',
    description: 'Air-conditioned hostel, homely food and round-the-clock care.',
  },
]

export const admissionsMedia: MediaItem[] = [
 
]
