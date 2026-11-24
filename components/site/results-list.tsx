import Image from 'next/image'
import { Trophy } from 'lucide-react'
import type { ResultItem } from '@/data/results'
import { initials } from './faculty-card'

export function ResultsList({ results }: { results: ResultItem[] }) {
  if (results.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted px-6 py-20 text-center text-muted-foreground">
        Results will be updated soon. Check back after the next announcement.
      </p>
    )
  }

  const years = [...new Set(results.map((r) => r.year))].sort((a, b) => b - a)

  return (
    <div className="flex flex-col gap-16">
      {years.map((year) => (
        <div key={year}>
          <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold text-secondary">
            <Trophy className="size-5 text-primary" aria-hidden="true" />
            {year} toppers
          </h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {results
              .filter((r) => r.year === year)
              .map((r) => (
                <li key={r.id} className="rounded-2xl border border-border p-6 text-center">
                  <div className="relative mx-auto size-20 overflow-hidden rounded-full bg-muted">
                    {r.photo ? (
                      <Image src={r.photo} alt={`Photo of ${r.name}`} fill sizes="80px" className="object-cover" />
                    ) : (
                      <span
                        className="flex size-full items-center justify-center font-heading text-lg text-secondary/70"
                        aria-hidden="true"
                      >
                        {initials(r.name)}
                      </span>
                    )}
                  </div>
                  <p className="mt-5 font-medium text-secondary">{r.name}</p>
                  <p className="mt-2 font-heading text-2xl font-semibold text-primary">{r.score}</p>
                  <p className="mt-1 text-xs tracking-wide text-muted-foreground uppercase">{r.exam}</p>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
