import type { Metadata } from 'next'
import { CtaBanner } from '@/components/site/cta-banner'
import { FacultyCard } from '@/components/site/faculty-card'
import { PageHero } from '@/components/site/page-hero'
import { Reveal } from '@/components/site/reveal'
import { Section, SectionHeading } from '@/components/site/section'
import { getPublicFaculty } from '@/lib/public-content'

export const metadata: Metadata = {
  title: 'Faculty',
  description:
    'Meet the experienced NEET and JEE faculty, counsellors and mentors at Shaheen – Mount Seena, Palakkad.',
}

const sections = [
  { key: 'academic', title: 'Academic Team', eyebrow: 'Teaching' },
  { key: 'mentorship', title: 'Mentorship & Wellbeing', eyebrow: 'Care' },
] as const

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FacultyPage() {
  const faculty = await getPublicFaculty()
  return (
    <>
      <PageHero
        eyebrow="Faculty"
        title="Teachers and mentors who know the path"
        description="Experienced entrance-exam faculty, supported by counsellors and resident mentors."
      />

      {sections.map((s, idx) => (
        <Section key={s.key} muted={idx % 2 === 1}>
          <SectionHeading eyebrow={s.eyebrow} title={s.title} />
          <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {faculty
              .filter((f) => f.group === s.key)
              .map((m, i) => (
                <Reveal key={m.id} delay={i * 80}>
                  <FacultyCard member={m} />
                </Reveal>
              ))}
          </div>
        </Section>
      ))}

      <CtaBanner />
    </>
  )
}
