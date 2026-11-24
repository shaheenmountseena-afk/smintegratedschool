'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { NAV_LINKS } from '@/lib/site-config'
import { btn, container } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { Logo } from './logo'

export function Header() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  if (pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 lg:px-8">
          <Logo />

          <nav aria-label="Main" className="hidden lg:flex items-center min-w-0">
            <ul className="flex items-center gap-1 lg:gap-1 xl:gap-2.5 2xl:gap-4.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={cn(
                      'rounded-lg px-1.5 py-1 text-xs lg:text-[12.5px] xl:text-[13px] 2xl:text-sm font-medium whitespace-nowrap transition-colors xl:px-2 2xl:px-2.5',
                      isActive(link.href)
                        ? 'font-semibold text-secondary'
                        : 'text-muted-foreground hover:text-secondary',
                    )}
                  >
                    {link.label === 'Campus & Facilities' ? (
                      <>
                        <span className="hidden 2xl:inline">Campus &amp; </span>
                        Facilities
                      </>
                    ) : (
                      link.label
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <Link
              href="/enquiry"
              className={cn(
                btn.primary,
                'hidden h-9 px-3 text-xs font-semibold whitespace-nowrap shrink-0 sm:inline-flex xl:h-10 xl:px-4 2xl:px-5 xl:text-sm',
              )}
            >
              Enquire Now
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-18 bottom-0 z-50 flex flex-col overflow-y-auto bg-background border-t border-border lg:hidden"
          style={{ height: 'calc(100dvh - 4.5rem)' }}
        >
          <nav aria-label="Mobile" className="mx-auto w-full max-w-lg px-5 py-6 pb-28">
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href} className="border-b border-border/70">
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={cn(
                      'block py-3.5 font-heading text-base sm:text-lg transition-colors',
                      isActive(link.href) ? 'font-semibold text-primary' : 'text-secondary hover:text-primary',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/enquiry"
              onClick={() => setOpen(false)}
              className={cn(btn.primary, 'mt-8 w-full justify-center')}
            >
              Enquire Now
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
