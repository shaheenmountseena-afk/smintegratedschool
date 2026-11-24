import Image from 'next/image'
import type { FacultyMember } from '@/data/faculty'

export function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/, '')
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function FacultyCard({ member }: { member: FacultyMember }) {
  return (
    <article className="flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        {member.photo ? (
          <Image
            src={member.photo}
            alt={`Portrait of ${member.name}`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          // TODO: replace with the faculty member's photo
          <div className="flex h-full items-center justify-center" aria-hidden="true">
            <span className="flex size-20 items-center justify-center rounded-full bg-white font-heading text-xl font-medium text-secondary/70 shadow-sm">
              {initials(member.name)}
            </span>
          </div>
        )}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-secondary">{member.name}</h3>
      <p className="mt-1 text-sm font-medium text-primary">{member.role}</p>
      {member.previous && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{member.previous}</p>}
    </article>
  )
}
