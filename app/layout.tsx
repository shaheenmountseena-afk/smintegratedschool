import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Poppins } from 'next/font/google'
import { Footer } from '@/components/site/footer'
import { Header } from '@/components/site/header'
import { OrganizationJsonLd } from '@/components/site/json-ld'
import { WhatsAppButton } from '@/components/site/whatsapp-button'
import { SITE } from '@/lib/site-config'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | Residential NEET JEE School in Palakkad, Kerala`,
    template: `%s | ${SITE.name}`,
  },
  description:
    'Shaheen – Mount Seena is an integrated residential NEET/JEE school in Pathiripala, Palakkad. NEET coaching Palakkad with AC hostel, supervised night study and expert faculty.',
  keywords: [
    'NEET coaching Palakkad',
    'residential NEET JEE school Kerala',
    'JEE coaching Kerala',
    'KEAM coaching Palakkad',
    'integrated school NEET',
  ],
  generator: 'v0.app',
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_IN' },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="antialiased min-h-screen w-full min-w-0 overflow-x-clip">
        <a
          href="#main"
          className="sr-only rounded-full bg-secondary px-5 py-3 text-sm text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
        >
          Skip to content
        </a>
        <OrganizationJsonLd />
        <Header />
        <main id="main" className="w-full min-w-0 overflow-x-clip">{children}</main>
        <Footer />
        <WhatsAppButton />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
