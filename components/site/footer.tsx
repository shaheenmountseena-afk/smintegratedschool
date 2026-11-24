'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Phone } from 'lucide-react'
import { NAV_LINKS, SITE, formatPhone } from '@/lib/site-config'
import { container } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { Logo } from './logo'

export function Footer() {
  const pathname = usePathname()

  if (pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <footer className="w-full overflow-hidden bg-secondary text-white/70">
      <div className={cn(container, 'grid gap-12 py-16 md:grid-cols-12 md:py-20')}>
        <div className="md:col-span-5">
          <Logo inverted />
          <p className="mt-6 max-w-sm text-sm leading-relaxed">{SITE.footerTagline}</p>
          <p className="mt-6 flex max-w-sm items-start gap-3 text-sm leading-relaxed">
            <MapPin className="mt-0.5 size-4 shrink-0 text-white/50" aria-hidden="true" />
            <span>{SITE.address.full}</span>
          </p>
        </div>

        <div className="md:col-span-3">
          <h2 className="font-sans text-xs font-medium tracking-[0.14em] text-white uppercase">Quick links</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {[...NAV_LINKS, { label: 'Admissions Enquiry', href: '/enquiry' }].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="rounded transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4">
          <h2 className="font-sans text-xs font-medium tracking-[0.14em] text-white uppercase">Call us</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {SITE.phones.map((phone) => (
              <li key={phone}>
                <a href={`tel:+91${phone}`} className="inline-flex items-center gap-3 rounded transition-colors hover:text-white">
                  <Phone className="size-4 text-white/50" aria-hidden="true" />
                  {formatPhone(phone)}
                </a>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 font-sans text-xs font-medium tracking-[0.14em] text-white uppercase">Follow</h2>
          <ul className="mt-5 flex gap-6 text-sm">
            {SITE.socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target={s.href !== '#' ? '_blank' : undefined}
                  rel={s.href !== '#' ? 'noopener noreferrer' : undefined}
                  className="rounded transition-colors hover:text-white"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div
          className={cn(
            container,
            'flex flex-col gap-2 py-6 pb-28 text-xs text-white/50 sm:flex-row sm:justify-between md:pb-6',
          )}
        >
          <p>
            &copy; {new Date().getFullYear()} {SITE.management}. All rights reserved.
          </p>
          <p>{SITE.name}</p>
        </div>
      </div>
    </footer>
  )
}
