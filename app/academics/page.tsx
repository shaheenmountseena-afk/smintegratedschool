import type { Metadata } from 'next'
import Link from 'next/link'
import { IconCard } from '@/components/site/card'
import { GroupTabs } from '@/components/site/group-tabs'
import { PageHero } from '@/components/site/page-hero'
import { Reveal } from '@/components/site/reveal'
import { Section, SectionHeading } from '@/components/site/section'
import { focusedProgrammes, programmes } from '@/data/content'
import { btn } from '@/lib/styles'

export const metadata: Metadata = {
  title: 'Academics',
  description:
    'NEET, JEE and KEAM integrated coaching, crash courses and foundation programmes at a residential NEET JEE school in Palakkad, Kerala.',
}

export default function AcademicsPage() {
  return (
    <>
      <PageHero
        eyebrow="Academics"
        title="Structured programmes for competitive success"
        description="Integrated schooling and entrance coaching, delivered by experienced faculty in a focused residential setting."
      />

      <Section>
        <SectionHeading eyebrow="Coaching programmes" title="Choose the right starting point" />
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
          eyebrow="Higher secondary"
          title="Available groups"
          description="Select a group to see the subjects it includes."
        />
        <GroupTabs />
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Entrance exams"
          title="Focused integrated coaching programmes"
          description="Dedicated preparation tracks for India’s leading entrance examinations."
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

        <div className="mt-16 flex flex-col items-start gap-6 rounded-2xl bg-muted p-8 sm:flex-row sm:items-center sm:justify-between md:p-10">
          <div>
            <h2 className="text-xl font-semibold text-secondary">Not sure which programme fits?</h2>
            <p className="mt-2 text-muted-foreground">Our counsellors will guide you to the right choice.</p>
          </div>
          <Link href="/enquiry" className={btn.primary}>
            Enquire about admission
          </Link>
        </div>
      </Section>
    </>
  )
}
