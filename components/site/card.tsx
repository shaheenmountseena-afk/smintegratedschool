import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'h-full rounded-2xl border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-[0_8px_30px_-12px_rgba(11,31,75,0.15)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function IconBadge({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary', className)}
    >
      <Icon className="size-5" aria-hidden="true" strokeWidth={1.75} />
    </span>
  )
}

export function IconCard({
  icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <Card>
      <IconBadge icon={icon} />
      <h3 className="mt-6 text-lg leading-snug font-semibold text-secondary">{title}</h3>
      {description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </Card>
  )
}
