import type { Metadata } from 'next'
import { GalleryView } from '@/components/site/gallery-view'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'
import { getPublicGallery, getPublicResults } from '@/lib/public-content'

export const metadata: Metadata = {
  title: 'Gallery & Results',
  description:
    'Photos, posters, videos and NEET/JEE results from Shaheen – Mount Seena, a residential NEET JEE school in Kerala.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GalleryPage() {
  const [gallery, results] = await Promise.all([getPublicGallery(), getPublicResults()])
  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="Moments, milestones and results"
        description="A look at campus life, announcements and the achievements of our students."
      />
      <Section>
        <GalleryView items={gallery} results={results} />
      </Section>
    </>
  )
}
