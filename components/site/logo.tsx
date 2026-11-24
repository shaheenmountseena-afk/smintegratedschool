import Image from 'next/image'
import Link from 'next/link'
import { SITE } from '@/lib/site-config'
import { cn } from '@/lib/utils'

export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={cn('group flex shrink-0 items-center gap-2.5 sm:gap-3 rounded-lg', className)}
      aria-label={`${SITE.name} — home`}
    >
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-105',
          inverted
            ? 'size-11 sm:size-12 rounded-xl bg-white p-1.5 shadow-md shadow-black/20'
            : 'size-10 sm:size-11 rounded-lg bg-white p-0.5 shadow-xs border border-border/40',
        )}
      >
        <Image
          src="/images/shaheen-logo.png"
          alt="Shaheen Group Logo"
          width={48}
          height={40}
          className="size-full object-contain"
          priority
        />
      </div>
      <span className="flex flex-col leading-tight min-w-0">
        <span
          className={cn(
            'font-heading text-xs sm:text-[13px] font-semibold tracking-[0.06em] sm:tracking-[0.08em] whitespace-nowrap',
            inverted ? 'text-white' : 'text-secondary',
          )}
        >
          {SITE.logoText}
        </span>
        <span
          className={cn(
            'text-[10px] sm:text-[11px] whitespace-nowrap truncate max-w-[170px] xs:max-w-[220px] sm:max-w-none',
            !inverted && 'lg:hidden xl:inline xl:max-w-none',
            inverted ? 'text-white/60' : 'text-muted-foreground',
          )}
        >
          {SITE.tagline}
        </span>
      </span>
    </Link>
  )
}
