import type { Metadata } from 'next'
import { CtaBanner } from '@/components/site/cta-banner'
import { PageHero } from '@/components/site/page-hero'
import { ResultsList } from '@/components/site/results-list'
import { Section } from '@/components/site/section'
import { getPublicResults } from '@/lib/public-content'

export const metadata: Metadata = {
  title: 'Results & Achievements',
  description:
    'NEET-UG, JEE Main, KEAM and premier entrance exam results and toppers from Shaheen – Mount Seena, Palakkad.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResultsPage() {
  const results = await getPublicResults()
  return (
    <>
      <PageHero
        eyebrow="Results"
        title="Our toppers, year by year"
        description="Celebrating the dedication, discipline and competitive achievements of our students across national entrance examinations."
      />
      <Section>
        <ResultsList results={results} />
      </Section>
      <CtaBanner />
    </>
  )
}
