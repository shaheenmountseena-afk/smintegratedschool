import type { Metadata } from 'next'
import Link from 'next/link'
import { IconCard } from '@/components/site/card'
import { CtaBanner } from '@/components/site/cta-banner'
import { PageHero } from '@/components/site/page-hero'
import { Reveal } from '@/components/site/reveal'
import { Section, SectionHeading } from '@/components/site/section'
import { focusedProgrammes, programmes } from '@/data/content'
import { btn } from '@/lib/styles'

export const metadata: Metadata = {
  title: 'Coaching Programmes',
  description:
    'Targeted entrance examination coaching for NEET-UG, JEE Main, KEAM, CUSAT CAT, IISER and NEST at Shaheen – Mount Seena, Palakkad.',
}

export default function CoachingProgrammesPage() {
  return (
    <>
      <PageHero
        eyebrow="Coaching Programmes"
        title="Focused preparation for premier entrance exams"
        description="Rigorous, student-centric entrance coaching delivered alongside Plus One and Plus Two schooling by experienced faculty."
      />

      <Section>
        <SectionHeading
          eyebrow="Programmes"
          title="Choose the right starting point"
          description="From early foundations in 8th standard to intensive entrance preparation in Plus Two."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {programmes.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <IconCard {...p} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section muted>
        <SectionHeading
          eyebrow="Targeted entrance exams"
          title="Specialized entrance coaching tracks"
          description="Dedicated coaching tracks covering national and state-level competitive examinations."
        />
        <ol className="grid gap-x-10 sm:grid-cols-2">
          {focusedProgrammes.map((name, i) => (
            <li key={name} className="flex items-baseline gap-6 border-t border-border py-6">
              <span className="font-heading text-sm text-primary tabular-nums" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-lg leading-snug font-medium text-secondary">{name}</span>
            </li>
          ))}
        </ol>

        <div className="mt-16 flex flex-col items-start gap-6 rounded-2xl bg-background p-8 sm:flex-row sm:items-center sm:justify-between md:p-10 border border-border">
          <div>
            <h2 className="text-xl font-semibold text-secondary">Not sure which programme fits?</h2>
            <p className="mt-2 text-muted-foreground">Our counsellors will guide you to the right choice.</p>
          </div>
          <Link href="/enquiry" className={btn.primary}>
            Enquire about admission
          </Link>
        </div>
      </Section>

      <CtaBanner />
    </>
  )
}
