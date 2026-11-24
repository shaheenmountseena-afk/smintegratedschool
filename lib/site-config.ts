/**
 * Single source of truth for all school constants.
 * Update values here and they change everywhere on the site.
 */

export const INSTAGRAM_LINK =
  'https://www.instagram.com/neet_shaheen_mountseena?utm_source=qr&rpxt=aG4wd25zcXQ0NjIz'

export const SITE = {
  name: 'Shaheen – Mount Seena',
  logoText: 'SHAHEEN – MOUNT SEENA',
  tagline: 'Integrated Residential NEET/JEE School',
  footerTagline: 'Integrated Residential NEET/JEE Coaching School',
  // TODO: replace with the production domain once it is live
  url: 'https://shaheenmountseena.in',
  address: {
    line: 'Mount Seena Campus, Pathiripala',
    city: 'Palakkad',
    state: 'Kerala',
    postalCode: '678642',
    full: 'Mount Seena Campus, Pathiripala, Palakkad, Kerala – 678642',
  },
  phones: ['9074617747', '8921679813', '7907674901'],
  // TODO: confirm the official admissions email address
  email: 'admissions@shaheenmountseena.in',
  socials: [
    {
      label: 'Instagram',
      href: INSTAGRAM_LINK,
    },
    { label: 'Facebook', href: '#' },
    { label: 'YouTube', href: '#' },
  ],
  management: 'Learn & Lead Edu.Hub LLP',
  mapQuery: 'Mount Seena Campus, Pathiripala, Palakkad',
} as const

// Primary admissions WhatsApp number: 9074617747
export const WHATSAPP_NUMBER = '919074617747'

export const WHATSAPP_MESSAGE =
  'Hello, I would like to know more about admissions at Shaheen – Mount Seena'

export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Academics', href: '/academics' },
  { label: 'Coaching', href: '/coaching-programmes' },
  { label: 'Campus & Facilities', href: '/facilities' },
  { label: 'Faculty', href: '/faculty' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Results', href: '/results' },
  { label: 'Contact', href: '/contact' },
] as const

export function formatPhone(phone: string) {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
}
