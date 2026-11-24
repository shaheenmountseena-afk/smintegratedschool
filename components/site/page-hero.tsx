import { container } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <section className="w-full overflow-hidden border-b border-border bg-muted">
      <div className={cn(container, 'py-20 md:py-28')}>
        <p className="mb-5 text-xs font-medium tracking-[0.16em] text-primary uppercase">{eyebrow}</p>
        <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold text-secondary md:text-5xl">{title}</h1>
        {description && (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>
        )}
      </div>
    </section>
  )
}
