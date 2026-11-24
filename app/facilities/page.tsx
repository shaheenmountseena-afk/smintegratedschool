import type { Metadata } from 'next'
import { CtaBanner } from '@/components/site/cta-banner'
import { FacilityItem } from '@/components/site/facility-item'
import { PageHero } from '@/components/site/page-hero'
import { PhotoStrip } from '@/components/site/photo-strip'
import { Section, SectionHeading } from '@/components/site/section'
import { hostelFacilities, otherFacilities } from '@/data/content'

export const metadata: Metadata = {
  title: 'Campus & Facilities',
  description:
    'AC hostel, supervised night study, smart classrooms, labs, counselling and more at our residential NEET JEE school campus in Palakkad, Kerala.',
}

export default function FacilitiesPage() {
  return (
    <>
      <PageHero
        eyebrow="Campus & facilities"
        title="A campus designed for focus and wellbeing"
        description="Everything a student needs to study well, live well and grow — in one safe, disciplined campus."
      />

      <Section>
        <SectionHeading eyebrow="Residential life" title="Hostel & residential life" />
        <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {hostelFacilities.map((f) => (
            <FacilityItem key={f.title} {...f} />
          ))}
        </ul>
        <PhotoStrip
          photos={[
            { src: '/images/hostel.png', alt: 'Air-conditioned hostel room (dummy photo)' },
            { src: '/images/night-study.png', alt: 'Supervised night study (dummy photo)' },
            { src: '/images/campus.png', alt: 'Green campus grounds (dummy photo)' },
          ]}
        />
      </Section>

      <Section muted>
        <SectionHeading eyebrow="Academic & wellness" title="Other facilities" />
        <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {otherFacilities.map((f) => (
            <FacilityItem key={f.title} {...f} />
          ))}
        </ul>
        <PhotoStrip
          photos={[
            { src: '/images/lab.png', alt: 'Science laboratory (dummy photo)' },
            { src: '/images/seminar.png', alt: 'Seminar theatre (dummy photo)' },
            { src: '/images/gym.png', alt: 'Gymnasium and fitness centre (dummy photo)' },
          ]}
        />
      </Section>

      <CtaBanner title="Visit the campus" description="Schedule a visit and see the hostel, classrooms and labs in person." />
    </>
  )
}
