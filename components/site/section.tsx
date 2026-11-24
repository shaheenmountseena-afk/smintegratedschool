import type { ReactNode } from 'react'
import { container } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function Section({
  children,
  className,
  muted = false,
  id,
}: {
  children: ReactNode
  className?: string
  muted?: boolean
  id?: string
}) {
  return (
    <section id={id} className={cn('w-full overflow-hidden py-20 md:py-28', muted && 'bg-muted', className)}>
      <div className={container}>{children}</div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  as: Tag = 'h2',
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  as?: 'h1' | 'h2'
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        'mb-12 flex flex-col gap-6 md:mb-16',
        align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between',
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <p className="mb-4 text-xs font-medium tracking-[0.16em] text-primary uppercase">{eyebrow}</p>
        )}
        <Tag className="text-3xl leading-tight font-semibold text-secondary md:text-4xl">{title}</Tag>
        {description && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
